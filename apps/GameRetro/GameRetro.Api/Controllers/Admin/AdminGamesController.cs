using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers.Admin;

/// <summary>Admin game curation (User Story 8): hide/unhide and override a game's displayed details.</summary>
[ApiController]
[Route("api/admin/games")]
[Authorize(Roles = "Admin")]
public sealed class AdminGamesController : AppControllerBase
{
    private readonly IGameModerationService _gameModerationService;

    public AdminGamesController(IGameModerationService gameModerationService)
    {
        _gameModerationService = gameModerationService;
    }

    /// <summary>GET /api/admin/games — list every locally moderated game (hidden and/or overridden).</summary>
    [HttpGet]
    public async Task<IActionResult> ListModerations(CancellationToken cancellationToken)
    {
        var moderations = await _gameModerationService.ListModerationsAsync(cancellationToken);
        return Ok(moderations);
    }

    /// <summary>PUT /api/admin/games/{gameId} — set hidden flag and/or overrides (lazily creates the row).</summary>
    [HttpPut("{gameId:long}")]
    public async Task<IActionResult> SetModeration(
        long gameId, [FromBody] GameModerationRequest request, CancellationToken cancellationToken)
    {
        var result = await _gameModerationService.SetModerationAsync(gameId, request, cancellationToken);
        return Ok(result);
    }
}
