using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

/// <summary>
/// Builds the game detail page payload (User Story 1). Kept behind an interface so the controller
/// depends on the abstraction, not the concrete class (Constitution I — thin controllers, injected
/// services).
/// </summary>
public interface IGameDetailService
{
    /// <summary>
    /// Returns the merged game detail (IGDB metadata + local Admin overrides + reviews), or
    /// <c>null</c> when the game should read as "not found" — i.e. IGDB doesn't know the id, or the
    /// game is hidden and the caller is not an Admin.
    /// </summary>
    /// <param name="includeHidden">True when the caller is an Admin, who may see hidden games.</param>
    Task<GameDetailResponse?> GetDetailAsync(
        long gameId, bool includeHidden, int page, int pageSize, CancellationToken cancellationToken);
}
