using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Admin game curation. Unlike reviews/comments, a game is NEVER deleted — this service only ever
/// creates or updates the local <see cref="Game"/> shadow row that stores the hide flag and the
/// text overrides (research.md Decision 4).
/// </summary>
public sealed class GameModerationService : IGameModerationService
{
    private readonly AuthDbContext _db;

    public GameModerationService(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<GameModerationResponse> SetModerationAsync(
        long gameId, GameModerationRequest request, CancellationToken cancellationToken)
    {
        // An Admin may act on a game before anyone has reviewed it, so the local row might not exist
        // yet — create it on demand (lazy creation, research.md Decision 1).
        var game = await _db.Games.FirstOrDefaultAsync(g => g.Id == gameId, cancellationToken);
        if (game is null)
        {
            game = new Game { Id = gameId, FirstSeenAt = DateTime.UtcNow };
            _db.Games.Add(game);
        }

        game.IsHidden = request.IsHidden;
        game.TitleOverride = request.TitleOverride;
        game.DescriptionOverride = request.DescriptionOverride;
        game.CoverImageUrlOverride = request.CoverImageUrlOverride;

        await _db.SaveChangesAsync(cancellationToken);

        return new GameModerationResponse(
            game.Id, game.IsHidden, game.TitleOverride, game.DescriptionOverride, game.CoverImageUrlOverride);
    }

    public async Task<IReadOnlyList<GameModerationResponse>> ListModerationsAsync(
        CancellationToken cancellationToken)
    {
        // Read-only projection straight to the response shape; only shadow rows exist here, so this is
        // small (one row per game an Admin has ever touched), not the whole IGDB catalogue.
        return await _db.Games
            .AsNoTracking()
            .OrderByDescending(g => g.IsHidden)
            .ThenBy(g => g.Id)
            .Select(g => new GameModerationResponse(
                g.Id, g.IsHidden, g.TitleOverride, g.DescriptionOverride, g.CoverImageUrlOverride))
            .ToListAsync(cancellationToken);
    }
}
