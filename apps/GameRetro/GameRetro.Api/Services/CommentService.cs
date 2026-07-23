using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// All comment business logic. A comment always hangs off exactly one <see cref="Review"/>, so every
/// method here first has to establish that the parent review exists (and its game isn't hidden)
/// before doing anything — that is the "relational" guard that keeps orphaned comments impossible.
/// </summary>
public sealed class CommentService : ICommentService
{
    private readonly AuthDbContext _db;

    public CommentService(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<CommentCreateResult> CreateAsync(
        Guid reviewId, string authorId, CommentRequest request, CancellationToken cancellationToken)
    {
        // A comment can only exist under a REACHABLE review. If the review is gone or its game is
        // hidden, treat it as not found — you can't comment on something you can't see.
        if (!await IsReviewReachableAsync(reviewId, cancellationToken))
        {
            return new CommentCreateResult(CommentCreateOutcome.ReviewNotFound, null);
        }

        var comment = new Comment
        {
            ReviewId = reviewId,
            AuthorId = authorId,
            Text = request.Text,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponseAsync(comment, cancellationToken);
        return new CommentCreateResult(CommentCreateOutcome.Created, response);
    }

    public async Task<CommentListResult> ListAsync(
        Guid reviewId, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        if (!await IsReviewReachableAsync(reviewId, cancellationToken))
        {
            return new CommentListResult(ReviewExists: false, Array.Empty<CommentResponse>(), 0);
        }

        var commentsForReview = _db.Comments.AsNoTracking().Where(c => c.ReviewId == reviewId);

        // Total across all pages, then just this page's rows — oldest first so a conversation reads
        // top-to-bottom.
        var totalCount = await commentsForReview.CountAsync(cancellationToken);

        var comments = await commentsForReview
            .OrderBy(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CommentResponse(
                c.Id,
                c.ReviewId,
                c.AuthorId,
                c.Author!.DisplayName ?? c.Author.UserName!,
                c.Text,
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new CommentListResult(ReviewExists: true, comments, totalCount);
    }

    public async Task<CommentMutationResult> UpdateAsync(
        Guid commentId, string authorId, CommentRequest request, CancellationToken cancellationToken)
    {
        var comment = await _db.Comments.FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);
        if (comment is null)
        {
            return new CommentMutationResult(CommentMutationOutcome.NotFound, null);
        }

        // Only the author may edit their comment (FR-011).
        if (comment.AuthorId != authorId)
        {
            return new CommentMutationResult(CommentMutationOutcome.NotAuthorized, null);
        }

        comment.Text = request.Text;
        comment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponseAsync(comment, cancellationToken);
        return new CommentMutationResult(CommentMutationOutcome.Success, response);
    }

    public async Task<CommentMutationResult> DeleteAsync(
        Guid commentId, string requesterId, bool isAdmin, CancellationToken cancellationToken)
    {
        var comment = await _db.Comments.FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);
        if (comment is null)
        {
            return new CommentMutationResult(CommentMutationOutcome.NotFound, null);
        }

        // Author may delete their own; an Admin may delete anyone's (FR-012/FR-018).
        if (!isAdmin && comment.AuthorId != requesterId)
        {
            return new CommentMutationResult(CommentMutationOutcome.NotAuthorized, null);
        }

        // Deleting the comment sets any Report.CommentId that pointed at it to null (SetNull), so
        // reports on this comment survive the deletion.
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync(cancellationToken);
        return new CommentMutationResult(CommentMutationOutcome.Success, null);
    }

    /// <summary>
    /// True when the review exists AND its game is not hidden. This is the shared "can this review be
    /// seen/interacted with?" check used by create and list.
    /// </summary>
    private async Task<bool> IsReviewReachableAsync(Guid reviewId, CancellationToken cancellationToken)
    {
        var review = await _db.Reviews.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);
        if (review is null)
        {
            return false;
        }

        var game = await _db.Games.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == review.GameId, cancellationToken);
        return game is null or { IsHidden: false };
    }

    private async Task<CommentResponse> BuildResponseAsync(Comment comment, CancellationToken cancellationToken)
    {
        var author = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == comment.AuthorId, cancellationToken);
        var displayName = author?.DisplayName ?? author?.UserName ?? "Unknown";

        return new CommentResponse(
            comment.Id,
            comment.ReviewId,
            comment.AuthorId,
            displayName,
            comment.Text,
            comment.CreatedAt,
            comment.UpdatedAt);
    }
}
