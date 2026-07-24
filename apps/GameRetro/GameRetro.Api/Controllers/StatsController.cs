using GameRetro.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>
/// Public site statistics for the landing page. Deliberately has NO <c>[Authorize]</c>: the landing
/// page is shown to signed-out visitors, so this endpoint must be reachable anonymously. It exposes
/// only aggregate counts — never any account or review content.
/// </summary>
[ApiController]
[Route("api/stats")]
public sealed class StatsController : AppControllerBase
{
    private readonly IStatsService _statsService;

    public StatsController(IStatsService statsService)
    {
        _statsService = statsService;
    }

    /// <summary>GET /api/stats — headline counts for the landing hero.</summary>
    [HttpGet]
    public async Task<IActionResult> GetSiteStats(CancellationToken cancellationToken)
    {
        var stats = await _statsService.GetSiteStatsAsync(cancellationToken);
        return Ok(stats);
    }
}
