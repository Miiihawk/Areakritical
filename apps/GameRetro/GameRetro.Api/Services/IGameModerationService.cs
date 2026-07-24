using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public interface IGameModerationService
{
    /// <summary>
    /// Sets a game's hidden flag and/or display overrides (FR-018b), lazily creating the local shadow
    /// row if this game has never been touched locally before.
    /// </summary>
    Task<GameModerationResponse> SetModerationAsync(
        long gameId, GameModerationRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Lists every game that has a local shadow row (i.e. has been hidden or overridden at least
    /// once). The admin games page merges this against the live IGDB catalogue so it can badge hidden
    /// games and pre-fill the edit form with any existing overrides.
    /// </summary>
    Task<IReadOnlyList<GameModerationResponse>> ListModerationsAsync(CancellationToken cancellationToken);
}
