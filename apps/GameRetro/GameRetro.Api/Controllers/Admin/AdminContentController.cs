using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers.Admin;

/// <summary>
/// Admin removal of any review/comment (User Story 8, FR-018). This reuses the SAME
/// <see cref="IReviewService"/>/<see cref="ICommentService"/> delete methods a normal user hits — the
/// only difference is <c>isAdmin: true</c>, which tells those services to skip the author-ownership
/// check. One code path, two callers, no duplicated delete logic (Constitution I).
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminContentController : AppControllerBase
{
    private readonly IReviewService _reviewService;
    private readonly ICommentService _commentService;

    public AdminContentController(IReviewService reviewService, ICommentService commentService)
    {
        _reviewService = reviewService;
        _commentService = commentService;
    }

    /// <summary>DELETE /api/admin/reviews/{reviewId} — remove any review.</summary>
    [HttpDelete("reviews/{reviewId:guid}")]
    public async Task<IActionResult> DeleteReview(Guid reviewId, CancellationToken cancellationToken)
    {
        var result = await _reviewService.DeleteAsync(reviewId, CurrentUserId, isAdmin: true, cancellationToken);
        return result.Outcome == ReviewMutationOutcome.NotFound
            ? NotFound(new { message = "review not found" })
            : NoContent();
    }

    /// <summary>DELETE /api/admin/comments/{commentId} — remove any comment.</summary>
    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId, CancellationToken cancellationToken)
    {
        var result = await _commentService.DeleteAsync(commentId, CurrentUserId, isAdmin: true, cancellationToken);
        return result.Outcome == CommentMutationOutcome.NotFound
            ? NotFound(new { message = "comment not found" })
            : NoContent();
    }
}
