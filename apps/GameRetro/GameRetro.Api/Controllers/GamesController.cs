using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

[ApiController]
[Route("api/games")]
[Authorize] // FR-022: every game endpoint requires a signed-in user.
public sealed class GamesController : AppControllerBase
{
    private readonly IGameLibraryService _gameLibraryService;
    private readonly IGameDetailService _gameDetailService;
    private readonly IGameRankingService _gameRankingService;

    public GamesController(
        IGameLibraryService gameLibraryService,
        IGameDetailService gameDetailService,
        IGameRankingService gameRankingService)
    {
        _gameLibraryService = gameLibraryService;
        _gameDetailService = gameDetailService;
        _gameRankingService = gameRankingService;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string search, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return BadRequest(new { message = "a search term is required" });
        }

        var games = await _gameLibraryService.SearchAsync(search, cancellationToken);
        return Ok(games);
    }

    /// <summary>
    /// GET /api/games/browse — a curated catalogue page with no search term, for the dashboard rows
    /// and the library's default view. sort: popular|newest|oldest|name; platform: pc|playstation|
    /// xbox|nintendo|retro (optional). Note: "popular" orders by how widely known a game is — all
    /// actual scores/ratings in this app come from our own Reviews table, never from IGDB.
    /// </summary>
    [HttpGet("browse")]
    public async Task<IActionResult> Browse(
        [FromQuery] string sort = "popular",
        [FromQuery] string? platform = null,
        [FromQuery] string? genre = null,
        [FromQuery] int? yearFrom = null,
        [FromQuery] int? yearTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        // Keep paging inputs sane no matter what the client sent (mirrors the detail page's clamps).
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 48 ? 24 : pageSize;

        var games = await _gameLibraryService.BrowseAsync(
            sort, platform, genre, yearFrom, yearTo, page, pageSize, cancellationToken);
        return Ok(games);
    }

    /// <summary>
    /// GET /api/games/browse/count — how many games match the given browse filters, so the library
    /// can render numbered pagination. Same filter params as <see cref="Browse"/> (page/pageSize are
    /// irrelevant to a total, so they're omitted).
    /// </summary>
    [HttpGet("browse/count")]
    public async Task<IActionResult> BrowseCount(
        [FromQuery] string sort = "popular",
        [FromQuery] string? platform = null,
        [FromQuery] string? genre = null,
        [FromQuery] int? yearFrom = null,
        [FromQuery] int? yearTo = null,
        CancellationToken cancellationToken = default)
    {
        var totalCount = await _gameLibraryService.BrowseCountAsync(
            sort, platform, genre, yearFrom, yearTo, cancellationToken);
        return Ok(new { totalCount });
    }

    /// <summary>
    /// GET /api/games/rankings — reviewed games ordered by aggregate score, best first. Admins also
    /// see hidden games' rankings (same visibility rule as the detail page).
    /// </summary>
    [HttpGet("rankings")]
    public async Task<IActionResult> Rankings(CancellationToken cancellationToken)
    {
        var rankings = await _gameRankingService.GetRankingsAsync(IsAdmin, cancellationToken);
        return Ok(rankings);
    }

    /// <summary>
    /// Game detail (User Story 1). The controller stays thin: it reads the paging inputs and whether
    /// the caller is an Admin, hands everything to <see cref="IGameDetailService"/>, and maps the
    /// result to a status code. A null result means "hidden or unknown" → the same generic 404.
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(
        long id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        // IsAdmin decides whether a hidden game is visible to this caller (FR-021).
        var detail = await _gameDetailService.GetDetailAsync(id, IsAdmin, page, pageSize, cancellationToken);
        return detail is null ? NotFound(new { message = "game not found" }) : Ok(detail);
    }
}
