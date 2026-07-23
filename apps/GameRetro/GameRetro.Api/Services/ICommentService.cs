using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

/// <summary>Outcome of creating a comment.</summary>
public enum CommentCreateOutcome
{
    Created,         // → 201
    ReviewNotFound,  // → 404: the review doesn't exist, or its game is hidden.
}

public sealed record CommentCreateResult(CommentCreateOutcome Outcome, CommentResponse? Comment);

/// <summary>
/// Result of listing a review's comments. <see cref="ReviewExists"/> is false when the review is
/// missing or its game is hidden (→ 404). <see cref="TotalCount"/> is the FULL count across all
/// pages, so the UI can show "showing 20 of 57".
/// </summary>
public sealed record CommentListResult(
    bool ReviewExists, IReadOnlyList<CommentResponse> Comments, int TotalCount);

/// <summary>Outcome of editing/deleting a comment.</summary>
public enum CommentMutationOutcome
{
    Success,       // → 200 (edit) / 204 (delete)
    NotFound,      // → 404
    NotAuthorized, // → 403
}

public sealed record CommentMutationResult(CommentMutationOutcome Outcome, CommentResponse? Comment);

public interface ICommentService
{
    /// <summary>Posts a comment on a review (FR-010).</summary>
    Task<CommentCreateResult> CreateAsync(
        Guid reviewId, string authorId, CommentRequest request, CancellationToken cancellationToken);

    /// <summary>Returns one bounded page of a review's comments (Constitution IV).</summary>
    Task<CommentListResult> ListAsync(
        Guid reviewId, int page, int pageSize, CancellationToken cancellationToken);

    /// <summary>Edits a comment. Only its author may do this (FR-011).</summary>
    Task<CommentMutationResult> UpdateAsync(
        Guid commentId, string authorId, CommentRequest request, CancellationToken cancellationToken);

    /// <summary>Deletes a comment. The author may delete their own; an Admin may delete anyone's (FR-018).</summary>
    Task<CommentMutationResult> DeleteAsync(
        Guid commentId, string requesterId, bool isAdmin, CancellationToken cancellationToken);
}
