using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public interface IStatsService
{
    /// <summary>
    /// The public headline numbers shown on the landing page, counted from our own tables.
    /// </summary>
    Task<SiteStatsResponse> GetSiteStatsAsync(CancellationToken cancellationToken);
}
