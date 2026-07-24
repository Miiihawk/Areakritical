using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Builds the community ranking. One bounded, grouped query over Reviews produces each reviewed
/// game's aggregate score (Constitution IV — no per-game round-trips), then a single batch IGDB
/// call fills in titles/covers, with local Admin overrides winning — the same merge rule as
/// <see cref="GameDetailService"/>.
/// </summary>
public sealed class GameRankingService : IGameRankingService
{
    // The leaderboard is intentionally bounded: the UI shows a top list, not the whole table.
    private const int MaxRankedGames = 50;

    private readonly AuthDbContext _db;
    private readonly IGameLibraryService _gameLibrary;

    public GameRankingService(AuthDbContext db, IGameLibraryService gameLibrary)
    {
        _db = db;
        _gameLibrary = gameLibrary;
    }

    public async Task<IReadOnlyList<GameRankingResponse>> GetRankingsAsync(
        bool includeHidden, CancellationToken cancellationToken)
    {
        // STEP 1 — aggregate the reviews per game, excluding hidden games for non-Admins (FR-021:
        // a hidden game's discussion is unreachable, so it must not surface on the leaderboard).
        var aggregates = await _db.Reviews
            .AsNoTracking()
            .Where(r => includeHidden || !r.Game!.IsHidden)
            .GroupBy(r => r.GameId)
            .Select(g => new
            {
                GameId = g.Key,
                Score = g.Average(r =>
                    (r.GameplayScore + r.StoryScore + r.AudiovisualScore
                     + r.ReplayabilityScore + r.OverallEnjoymentScore) / 5.0),
                Count = g.Count(),
            })
            .OrderByDescending(a => a.Score)
            .ThenByDescending(a => a.Count)
            .Take(MaxRankedGames)
            .ToListAsync(cancellationToken);

        if (aggregates.Count == 0)
        {
            return Array.Empty<GameRankingResponse>();
        }

        var ids = aggregates.Select(a => a.GameId).ToList();

        // STEP 2 — local shadow rows, for Admin title/cover overrides.
        var localGames = await _db.Games
            .AsNoTracking()
            .Where(g => ids.Contains(g.Id))
            .ToDictionaryAsync(g => g.Id, cancellationToken);

        // STEP 3 — one batch IGDB lookup for live titles/covers/years.
        var igdbGames = (await _gameLibrary.GetByIdsAsync(ids, cancellationToken))
            .ToDictionary(g => g.Id);

        // STEP 4 — merge, preserving the score ordering from step 1.
        return aggregates
            .Select(a =>
            {
                localGames.TryGetValue(a.GameId, out var local);
                igdbGames.TryGetValue(a.GameId, out var meta);
                return new GameRankingResponse(
                    a.GameId,
                    local?.TitleOverride ?? meta?.Title ?? "Untitled",
                    local?.CoverImageUrlOverride ?? meta?.CoverImageUrl,
                    meta?.ReleaseYear,
                    a.Score,
                    a.Count,
                    meta?.Genres ?? Array.Empty<string>());
            })
            .ToList();
    }

    public async Task<IReadOnlyList<LatestReviewResponse>> GetLatestReviewsAsync(
        int count, bool includeHidden, CancellationToken cancellationToken)
    {
        // Keep the feed bounded no matter what the client asked for.
        count = count is < 1 or > 20 ? 6 : count;

        // STEP 1 — the newest reviews (visible games only for non-Admins), with the author's display
        // name resolved live and the overall score computed in-query — same rules as the detail page.
        var reviews = await _db.Reviews
            .AsNoTracking()
            .Where(r => includeHidden || !r.Game!.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .Take(count)
            .Select(r => new
            {
                r.Id,
                r.GameId,
                Author = r.Author!.DisplayName ?? r.Author.UserName!,
                Score = (r.GameplayScore + r.StoryScore + r.AudiovisualScore
                         + r.ReplayabilityScore + r.OverallEnjoymentScore) / 5.0,
                r.Text,
                r.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        if (reviews.Count == 0)
        {
            return Array.Empty<LatestReviewResponse>();
        }

        // STEP 2/3 — game titles/covers: local overrides win, IGDB fills the rest (one batch call).
        var ids = reviews.Select(r => r.GameId).Distinct().ToList();
        var localGames = await _db.Games
            .AsNoTracking()
            .Where(g => ids.Contains(g.Id))
            .ToDictionaryAsync(g => g.Id, cancellationToken);
        var igdbGames = (await _gameLibrary.GetByIdsAsync(ids, cancellationToken))
            .ToDictionary(g => g.Id);

        return reviews
            .Select(r =>
            {
                localGames.TryGetValue(r.GameId, out var local);
                igdbGames.TryGetValue(r.GameId, out var meta);
                return new LatestReviewResponse(
                    r.Id,
                    r.GameId,
                    local?.TitleOverride ?? meta?.Title ?? "Untitled",
                    local?.CoverImageUrlOverride ?? meta?.CoverImageUrl,
                    r.Author,
                    r.Score,
                    r.Text,
                    r.CreatedAt);
            })
            .ToList();
    }
}
