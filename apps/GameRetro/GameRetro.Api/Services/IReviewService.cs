using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

// --- Result types ------------------------------------------------------------------------------
// Mentor note: instead of throwing exceptions for ordinary "the caller did something not allowed"
// cases, each service method returns a small result record describing the OUTCOME. The controller
// then maps that outcome to an HTTP status code. This mirrors the existing AuthService pattern and
// keeps the "what happened" decision in the service and the "which status code" decision in the
// controller — a clean separation (Constitution I).

/// <summary>What happened when a review was submitted.</summary>
public enum ReviewSubmitOutcome
{
    Created,         // → 201: the caller had no review for this game yet.
    Updated,         // → 200: the caller's existing review was edited in place (FR-005a).
    GameNotFound,    // → 404: the game is unknown to IGDB, or hidden.
    GameNotEligible, // → 403: the game is < 5 years old (or undated) and the caller has no review yet (feature 003).
}

public sealed record ReviewSubmitResult(ReviewSubmitOutcome Outcome, ReviewResponse? Review);

/// <summary>What happened when a review was edited or deleted.</summary>
public enum ReviewMutationOutcome
{
    Success,       // → 200 (edit) or 204 (delete)
    NotFound,      // → 404
    NotAuthorized, // → 403: caller is neither the author nor an Admin.
}

public sealed record ReviewMutationResult(ReviewMutationOutcome Outcome, ReviewResponse? Review);

public interface IReviewService
{
    /// <summary>Creates the caller's review for a game, or updates it if one already exists (FR-005a).</summary>
    Task<ReviewSubmitResult> SubmitAsync(
        long gameId, string authorId, ReviewRequest request, CancellationToken cancellationToken);

    /// <summary>Edits a review. Only its author may do this (FR-007).</summary>
    Task<ReviewMutationResult> UpdateAsync(
        Guid reviewId, string authorId, ReviewRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a review (and cascade-deletes its comments). The author may delete their own; an Admin
    /// may delete anyone's (<paramref name="isAdmin"/> skips the ownership check, FR-018).
    /// </summary>
    Task<ReviewMutationResult> DeleteAsync(
        Guid reviewId, string requesterId, bool isAdmin, CancellationToken cancellationToken);
}
