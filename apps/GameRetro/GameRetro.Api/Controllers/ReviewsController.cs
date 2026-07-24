using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>
/// Review endpoints (User Stories 2 &amp; 3). Every method here follows the same three-line shape:
/// read the current user, call the service, translate the outcome enum into an HTTP status. All the
/// real logic lives in <see cref="IReviewService"/>.
/// </summary>
[ApiController]
[Authorize] // FR-022: signed-in users only.
public sealed class ReviewsController : AppControllerBase
{
    private readonly IReviewService _reviewService;
    private readonly IGameRankingService _gameRankingService;

    public ReviewsController(IReviewService reviewService, IGameRankingService gameRankingService)
    {
        _reviewService = reviewService;
        _gameRankingService = gameRankingService;
    }

    /// <summary>GET /api/reviews/latest — the newest reviews across all games (dashboard feed).</summary>
    [HttpGet("api/reviews/latest")]
    public async Task<IActionResult> Latest(
        [FromQuery] int count = 6, CancellationToken cancellationToken = default)
    {
        var latest = await _gameRankingService.GetLatestReviewsAsync(count, IsAdmin, cancellationToken);
        return Ok(latest);
    }

    /// <summary>POST /api/games/{gameId}/reviews — create or edit-in-place the caller's review.</summary>
    [HttpPost("api/games/{gameId:long}/reviews")]
    public async Task<IActionResult> Submit(
        long gameId, [FromBody] ReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _reviewService.SubmitAsync(gameId, CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            // 201 when it's a brand-new review, 200 when an existing one was updated (FR-005a).
            ReviewSubmitOutcome.Created => StatusCode(StatusCodes.Status201Created, result.Review),
            ReviewSubmitOutcome.Updated => Ok(result.Review),
            // 404 (unknown/hidden game) is listed first so a hidden game's ineligibility is never
            // revealed (feature 003 precedence note); 403 is the retro age gate.
            ReviewSubmitOutcome.GameNotFound => NotFound(new { message = "game not found" }),
            ReviewSubmitOutcome.GameNotEligible => StatusCode(
                StatusCodes.Status403Forbidden,
                new { message = "this game is not yet eligible for review — it must be at least 5 years old" }),
            _ => NotFound(new { message = "game not found" }),
        };
    }

    /// <summary>PUT /api/reviews/{reviewId} — edit your own review.</summary>
    [HttpPut("api/reviews/{reviewId:guid}")]
    public async Task<IActionResult> Update(
        Guid reviewId, [FromBody] ReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _reviewService.UpdateAsync(reviewId, CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            ReviewMutationOutcome.Success => Ok(result.Review),
            ReviewMutationOutcome.NotAuthorized => StatusCode(
                StatusCodes.Status403Forbidden, new { message = "not authorized" }),
            _ => NotFound(new { message = "review not found" }),
        };
    }

    /// <summary>DELETE /api/reviews/{reviewId} — delete your own review (Admin uses a separate endpoint).</summary>
    [HttpDelete("api/reviews/{reviewId:guid}")]
    public async Task<IActionResult> Delete(Guid reviewId, CancellationToken cancellationToken)
    {
        // isAdmin: false here — this is the author-facing route. Admin removal lives in AdminContentController.
        var result = await _reviewService.DeleteAsync(reviewId, CurrentUserId, isAdmin: false, cancellationToken);

        return result.Outcome switch
        {
            ReviewMutationOutcome.Success => NoContent(),
            ReviewMutationOutcome.NotAuthorized => StatusCode(
                StatusCodes.Status403Forbidden, new { message = "not authorized" }),
            _ => NotFound(new { message = "review not found" }),
        };
    }
}
