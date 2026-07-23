using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>Comment endpoints (User Stories 4 &amp; 5). Same thin-controller shape as reviews.</summary>
[ApiController]
[Authorize] // FR-022: signed-in users only.
public sealed class CommentsController : AppControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>GET /api/reviews/{reviewId}/comments — one paginated page of a review's comments.</summary>
    [HttpGet("api/reviews/{reviewId:guid}/comments")]
    public async Task<IActionResult> List(
        Guid reviewId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _commentService.ListAsync(reviewId, page, pageSize, cancellationToken);
        if (!result.ReviewExists)
        {
            return NotFound(new { message = "review not found" });
        }

        // Shape the paginated envelope the frontend expects (contracts/comments-api.md).
        return Ok(new
        {
            comments = result.Comments,
            page,
            pageSize,
            totalCount = result.TotalCount,
        });
    }

    /// <summary>POST /api/reviews/{reviewId}/comments — add a comment to a review.</summary>
    [HttpPost("api/reviews/{reviewId:guid}/comments")]
    public async Task<IActionResult> Create(
        Guid reviewId, [FromBody] CommentRequest request, CancellationToken cancellationToken)
    {
        var result = await _commentService.CreateAsync(reviewId, CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            CommentCreateOutcome.Created => StatusCode(StatusCodes.Status201Created, result.Comment),
            _ => NotFound(new { message = "review not found" }),
        };
    }

    /// <summary>PUT /api/comments/{commentId} — edit your own comment.</summary>
    [HttpPut("api/comments/{commentId:guid}")]
    public async Task<IActionResult> Update(
        Guid commentId, [FromBody] CommentRequest request, CancellationToken cancellationToken)
    {
        var result = await _commentService.UpdateAsync(commentId, CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            CommentMutationOutcome.Success => Ok(result.Comment),
            CommentMutationOutcome.NotAuthorized => StatusCode(
                StatusCodes.Status403Forbidden, new { message = "not authorized" }),
            _ => NotFound(new { message = "comment not found" }),
        };
    }

    /// <summary>DELETE /api/comments/{commentId} — delete your own comment.</summary>
    [HttpDelete("api/comments/{commentId:guid}")]
    public async Task<IActionResult> Delete(Guid commentId, CancellationToken cancellationToken)
    {
        var result = await _commentService.DeleteAsync(commentId, CurrentUserId, isAdmin: false, cancellationToken);

        return result.Outcome switch
        {
            CommentMutationOutcome.Success => NoContent(),
            CommentMutationOutcome.NotAuthorized => StatusCode(
                StatusCodes.Status403Forbidden, new { message = "not authorized" }),
            _ => NotFound(new { message = "comment not found" }),
        };
    }
}
