using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Counts the landing page's headline figures. These describe the community archive, so they are read
/// from our own tables only: how many distinct games have been reviewed, how many reviews exist, and
/// how many active accounts there are. Hidden games are excluded so the public number matches what a
/// visitor can actually browse.
/// </summary>
public sealed class StatsService : IStatsService
{
    private readonly AuthDbContext _db;

    public StatsService(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<SiteStatsResponse> GetSiteStatsAsync(CancellationToken cancellationToken)
    {
        // The ids of games an Admin has hidden — their reviews shouldn't inflate the public counts.
        var hiddenGameIds = _db.Games.Where(g => g.IsHidden).Select(g => g.Id);

        var visibleReviews = _db.Reviews.Where(r => !hiddenGameIds.Contains(r.GameId));

        var titlesReviewed = await visibleReviews
            .Select(r => r.GameId)
            .Distinct()
            .CountAsync(cancellationToken);

        var retrospectives = await visibleReviews.CountAsync(cancellationToken);

        var members = await _db.Users.CountAsync(u => !u.IsDeactivated, cancellationToken);

        return new SiteStatsResponse(titlesReviewed, retrospectives, members);
    }
}
