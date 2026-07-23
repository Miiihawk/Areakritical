using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Assembles the game detail page. This is the clearest example in the feature of "controller talks
/// to service, service talks to models": the <see cref="Controllers.GamesController"/> just asks this
/// class for a <see cref="GameDetailResponse"/>; all the joining of the live IGDB record, the local
/// <see cref="Models.Game"/> shadow row, and the <see cref="Models.Review"/> table happens here.
/// </summary>
public sealed class GameDetailService : IGameDetailService
{
    private readonly AuthDbContext _db;
    private readonly IGameLibraryService _gameLibrary;

    public GameDetailService(AuthDbContext db, IGameLibraryService gameLibrary)
    {
        _db = db;
        _gameLibrary = gameLibrary;
    }

    public async Task<GameDetailResponse?> GetDetailAsync(
        long gameId, bool includeHidden, int page, int pageSize, CancellationToken cancellationToken)
    {
        // Keep pagination inputs sane no matter what the client sent.
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        // STEP 1 — look up our LOCAL shadow row for this game (may not exist yet). We only need it for
        // the moderation state (IsHidden) and the Admin text overrides.
        var localGame = await _db.Games
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == gameId, cancellationToken);

        // STEP 2 — enforce the hide rule (FR-021). If the game is hidden and the caller is not an
        // Admin, we return null, which the controller turns into the same generic 404 as any unknown
        // game. Because the whole page is unreachable, its reviews/comments are unreachable too — that
        // is how hiding a game hides its discussion, without a separate mechanism.
        if (localGame is { IsHidden: true } && !includeHidden)
        {
            return null;
        }

        // STEP 3 — fetch the live metadata from IGDB. If IGDB has never heard of this id and we have no
        // local row to fall back on, it is genuinely "not found".
        var igdb = await _gameLibrary.GetByIdAsync(gameId, cancellationToken);
        if (igdb is null && localGame is null)
        {
            return null;
        }

        // STEP 4 — merge: an Admin override (when set) wins over IGDB's own value; otherwise use IGDB;
        // otherwise fall back to a placeholder so the object is never half-null.
        var title = localGame?.TitleOverride ?? igdb?.Title ?? "Untitled";
        var description = localGame?.DescriptionOverride ?? igdb?.Description;
        var coverImageUrl = localGame?.CoverImageUrlOverride ?? igdb?.CoverImageUrl;

        // STEP 5 — the review numbers. One bounded COUNT and one bounded AVG over just this game's
        // reviews (Constitution IV — no unbounded scan). The aggregate score is the average of each
        // review's own overall score, and each review's overall score is the average of its five
        // mechanic scores — so this expression is "the average of the per-review averages".
        var reviewsForGame = _db.Reviews.AsNoTracking().Where(r => r.GameId == gameId);

        var reviewCount = await reviewsForGame.CountAsync(cancellationToken);

        double? aggregateScore = reviewCount == 0
            ? null // FR-003: no reviews → no score at all, not a zero.
            : await reviewsForGame.AverageAsync(
                r => (r.GameplayScore + r.StoryScore + r.AudiovisualScore
                      + r.ReplayabilityScore + r.OverallEnjoymentScore) / 5.0,
                cancellationToken);

        // STEP 6 — the current page of reviews, newest first. We project straight into ReviewResponse
        // in the query so only the columns we need come back. Note how AuthorDisplayName is read LIVE
        // from the joined account (DisplayName, falling back to UserName) — never a stored copy (FR-015).
        var reviews = await reviewsForGame
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ReviewResponse(
                r.Id,
                r.GameId,
                r.AuthorId,
                r.Author!.DisplayName ?? r.Author.UserName!,
                r.GameplayScore,
                r.StoryScore,
                r.AudiovisualScore,
                r.ReplayabilityScore,
                r.OverallEnjoymentScore,
                (r.GameplayScore + r.StoryScore + r.AudiovisualScore
                 + r.ReplayabilityScore + r.OverallEnjoymentScore) / 5.0,
                r.Text,
                r.CreatedAt,
                r.UpdatedAt))
            .ToListAsync(cancellationToken);

        // STEP 7 — hand the finished, flat object back to the controller.
        return new GameDetailResponse(
            gameId,
            title,
            description,
            coverImageUrl,
            igdb?.ReleaseYear,
            igdb?.Age,
            igdb?.SystemRequirements,
            igdb?.Genres ?? Array.Empty<string>(),
            igdb?.Developer,
            igdb?.Publisher,
            aggregateScore,
            reviewCount,
            reviews,
            page,
            pageSize);
    }
}
