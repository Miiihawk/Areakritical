using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public interface IGameLibraryService
{
    Task<IReadOnlyList<GameDto>> SearchAsync(string query, CancellationToken cancellationToken);

    Task<GameDto?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>
    /// A curated "browse" page of well-known games (no search term needed). <paramref name="sort"/>
    /// is one of popular|newest|oldest|name; <paramref name="platform"/> (pc|playstation|xbox|
    /// nintendo|retro), <paramref name="genre"/> (rpg|shooter|…), and the year range are all
    /// optional filters. <paramref name="page"/> (1-based) and <paramref name="pageSize"/> drive
    /// IGDB offset paging so the library can browse the whole catalogue, not just the first page.
    /// </summary>
    Task<IReadOnlyList<GameDto>> BrowseAsync(
        string sort, string? platform, string? genre, int? yearFrom, int? yearTo,
        int page, int pageSize, CancellationToken cancellationToken);

    /// <summary>
    /// Total number of games matching the same filters <see cref="BrowseAsync"/> would page through
    /// (one IGDB <c>/count</c> call). Powers the library's numbered pagination.
    /// </summary>
    Task<int> BrowseCountAsync(
        string sort, string? platform, string? genre, int? yearFrom, int? yearTo,
        CancellationToken cancellationToken);

    /// <summary>Batch metadata lookup for a bounded set of known IGDB ids (one round-trip).</summary>
    Task<IReadOnlyList<GameDto>> GetByIdsAsync(IReadOnlyCollection<long> ids, CancellationToken cancellationToken);
}

/// <summary>
/// Thrown when the game library (IGDB) credentials are missing. Its message is safe to
/// surface to the client (it names the missing config, no secrets), so the exception
/// middleware returns it as a 503 rather than a generic 500.
/// </summary>
public sealed class GameLibraryNotConfiguredException : Exception
{
    public GameLibraryNotConfiguredException(string message) : base(message)
    {
    }
}
