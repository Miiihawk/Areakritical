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
}
