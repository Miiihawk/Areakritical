using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// All review business logic. Walks between the controller and the <see cref="Review"/> model:
/// it decides whether a submission is a create or an edit, enforces the one-review-per-game rule,
/// checks authorship on edit/delete, and (on delete) relies on the delete rules configured in
/// <see cref="AuthDbContext"/> to clean up comments and reports.
/// </summary>
public sealed class ReviewService : IReviewService
{
    private readonly AuthDbContext _db;
    private readonly IGameLibraryService _gameLibrary;

    public ReviewService(AuthDbContext db, IGameLibraryService gameLibrary)
    {
        _db = db;
        _gameLibrary = gameLibrary;
    }

    public async Task<ReviewSubmitResult> SubmitAsync(
        long gameId, string authorId, ReviewRequest request, CancellationToken cancellationToken)
    {
        // STEP 1 — make sure there is a valid, visible game to attach the review to.
        var localGame = await _db.Games.FirstOrDefaultAsync(g => g.Id == gameId, cancellationToken);

        // A hidden game behaves like a missing one for a normal user. This 404 is evaluated BEFORE the
        // feature-003 eligibility gate below, so a hidden game's ineligibility is never revealed
        // (contracts/review-eligibility-changes.md precedence note).
        if (localGame is { IsHidden: true })
        {
            return new ReviewSubmitResult(ReviewSubmitOutcome.GameNotFound, null);
        }

        // STEP 2 — is this the caller's FIRST review for this game, or an edit of their existing one?
        // The (GameId, AuthorId) pair is unique (FR-005a), so there is at most one to find. This drives
        // create-vs-edit AND whether the feature-003 age gate applies: an EDIT is exempt (authors are
        // never locked out of content they already wrote, even once the game is ineligible — spec edge
        // case), so we resolve it up front.
        var review = await _db.Reviews
            .FirstOrDefaultAsync(r => r.GameId == gameId && r.AuthorId == authorId, cancellationToken);

        ReviewSubmitOutcome outcome;
        if (review is null)
        {
            // --- CREATE path → 201 ---
            // The create path always fetches the game's IGDB record (feature 003): we need it both to
            // confirm the id is real when there's no local shadow row yet, AND to read its release date
            // for the 5-year eligibility gate.
            var igdb = await _gameLibrary.GetByIdAsync(gameId, cancellationToken);

            // If IGDB has never heard of this id and we have no local row to fall back on, it's "not found".
            if (igdb is null && localGame is null)
            {
                return new ReviewSubmitResult(ReviewSubmitOutcome.GameNotFound, null);
            }

            // Feature 003: the authoritative server-side age gate (FR-004). A game must be at least 5
            // years old (undated → ineligible, FR-002) before a NEW review can be created for it. This
            // holds no matter how the request arrives, so a crafted POST can't bypass the UI's block.
            if (!ReviewEligibility.IsEligible(igdb?.ReleaseDate, DateTime.UtcNow))
            {
                return new ReviewSubmitResult(ReviewSubmitOutcome.GameNotEligible, null);
            }

            // Lazily create the local shadow row the first time anyone reviews this game (research.md
            // Decision 1), now that we've confirmed the id is both real and eligible — so a typo'd/bogus
            // or ineligible game id can't create a junk local row.
            if (localGame is null)
            {
                localGame = new Game { Id = gameId, FirstSeenAt = DateTime.UtcNow };
                _db.Games.Add(localGame);
            }

            review = new Review
            {
                GameId = gameId,
                AuthorId = authorId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.Reviews.Add(review);
            outcome = ReviewSubmitOutcome.Created;
        }
        else
        {
            // Update-in-place path → 200 (FR-005a: a resubmission edits, never duplicates). Deliberately
            // NOT age-gated — see STEP 2.
            outcome = ReviewSubmitOutcome.Updated;
        }

        // STEP 4 — copy the submitted scores/text onto the entity (shared by both create and edit).
        ApplyScores(review, request);
        review.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponseAsync(review, cancellationToken);
        return new ReviewSubmitResult(outcome, response);
    }

    public async Task<ReviewMutationResult> UpdateAsync(
        Guid reviewId, string authorId, ReviewRequest request, CancellationToken cancellationToken)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);
        if (review is null)
        {
            return new ReviewMutationResult(ReviewMutationOutcome.NotFound, null);
        }

        // Ownership check: only the author may edit (FR-007). Compare the stored AuthorId against the
        // signed-in user id the controller passed in.
        if (review.AuthorId != authorId)
        {
            return new ReviewMutationResult(ReviewMutationOutcome.NotAuthorized, null);
        }

        ApplyScores(review, request);
        review.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponseAsync(review, cancellationToken);
        return new ReviewMutationResult(ReviewMutationOutcome.Success, response);
    }

    public async Task<ReviewMutationResult> DeleteAsync(
        Guid reviewId, string requesterId, bool isAdmin, CancellationToken cancellationToken)
    {
        // Include the comments so EF Core's ClientCascade can delete them along with the review (see
        // the Comment→Review rule in AuthDbContext). Reports on this review or its comments are set to
        // null automatically by the database (SetNull), so a report survives the deletion.
        var review = await _db.Reviews
            .Include(r => r.Comments)
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);

        if (review is null)
        {
            return new ReviewMutationResult(ReviewMutationOutcome.NotFound, null);
        }

        // An Admin bypasses the ownership check; a normal user must be the author (FR-008).
        if (!isAdmin && review.AuthorId != requesterId)
        {
            return new ReviewMutationResult(ReviewMutationOutcome.NotAuthorized, null);
        }

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync(cancellationToken);
        return new ReviewMutationResult(ReviewMutationOutcome.Success, null);
    }

    /// <summary>Copies the five scores + text from the request onto the entity (create and edit share this).</summary>
    private static void ApplyScores(Review review, ReviewRequest request)
    {
        review.GameplayScore = request.GameplayScore;
        review.StoryScore = request.StoryScore;
        review.AudiovisualScore = request.AudiovisualScore;
        review.ReplayabilityScore = request.ReplayabilityScore;
        review.OverallEnjoymentScore = request.OverallEnjoymentScore;
        review.Text = request.Text;
    }

    /// <summary>
    /// Turns a saved <see cref="Review"/> into the flat <see cref="ReviewResponse"/>, reading the
    /// author's current display name live (FR-015).
    /// </summary>
    private async Task<ReviewResponse> BuildResponseAsync(Review review, CancellationToken cancellationToken)
    {
        var author = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == review.AuthorId, cancellationToken);
        var displayName = author?.DisplayName ?? author?.UserName ?? "Unknown";

        return new ReviewResponse(
            review.Id,
            review.GameId,
            review.AuthorId,
            displayName,
            review.GameplayScore,
            review.StoryScore,
            review.AudiovisualScore,
            review.ReplayabilityScore,
            review.OverallEnjoymentScore,
            review.OverallScore,
            review.Text,
            review.CreatedAt,
            review.UpdatedAt);
    }
}
