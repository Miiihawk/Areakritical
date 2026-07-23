using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public interface IGameRankingService
{
    /// <summary>
    /// The community leaderboard: every reviewed game ordered by aggregate score, best first.
    /// <paramref name="includeHidden"/> lets Admins see hidden games' rankings too.
    /// </summary>
    Task<IReadOnlyList<GameRankingResponse>> GetRankingsAsync(
        bool includeHidden, CancellationToken cancellationToken);

    /// <summary>
    /// The most recent reviews across all (visible) games, newest first — the dashboard's
    /// "Latest Reviews" feed. Bounded by <paramref name="count"/>.
    /// </summary>
    Task<IReadOnlyList<LatestReviewResponse>> GetLatestReviewsAsync(
        int count, bool includeHidden, CancellationToken cancellationToken);
}
