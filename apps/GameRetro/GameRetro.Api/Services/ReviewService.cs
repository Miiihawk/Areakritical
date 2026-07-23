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

        // A hidden game behaves like a missing one for a normal user.
        if (localGame is { IsHidden: true })
        {
            return new ReviewSubmitResult(ReviewSubmitOutcome.GameNotFound, null);
        }

        // STEP 2 — lazily create the local shadow row the first time anyone reviews this game
        // (research.md Decision 1). We only do this after confirming IGDB actually knows the id, so a
        // typo'd/bogus game id can't create a junk local row.
        if (localGame is null)
        {
            var igdb = await _gameLibrary.GetByIdAsync(gameId, cancellationToken);
            if (igdb is null)
            {
                return new ReviewSubmitResult(ReviewSubmitOutcome.GameNotFound, null);
            }

            localGame = new Game { Id = gameId, FirstSeenAt = DateTime.UtcNow };
            _db.Games.Add(localGame);
        }

        // STEP 3 — is this the caller's FIRST review for this game, or an edit of their existing one?
        // The (GameId, AuthorId) pair is unique (FR-005a), so there is at most one to find.
        var review = await _db.Reviews
            .FirstOrDefaultAsync(r => r.GameId == gameId && r.AuthorId == authorId, cancellationToken);

        ReviewSubmitOutcome outcome;
        if (review is null)
        {
            // Create path → 201.
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
            // Update-in-place path → 200 (FR-005a: a resubmission edits, never duplicates).
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
