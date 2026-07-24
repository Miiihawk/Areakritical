using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using GameRetro.Api.DTOs.Responses;
using Microsoft.Extensions.Caching.Memory;

namespace GameRetro.Api.Services;

/// <summary>
/// Reads game metadata from IGDB (https://api.igdb.com/v4). IGDB authenticates via a Twitch
/// app access token (client-credentials flow); the token is cached until shortly before it
/// expires. The Twitch client id/secret come from configuration (Igdb:ClientId / Igdb:ClientSecret)
/// and never leave the server — the SPA calls this API, not IGDB.
/// </summary>
public sealed class GameLibraryService : IGameLibraryService
{
    private const string TokenCacheKey = "igdb_access_token";
    private const string TwitchTokenUrl = "https://id.twitch.tv/oauth2/token";
    private const string IgdbGamesUrl = "https://api.igdb.com/v4/games";
    private const string IgdbGamesCountUrl = "https://api.igdb.com/v4/games/count";
    private const string CoverBaseUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;

    public GameLibraryService(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _configuration = configuration;
    }

    // The one field list every query shares — game metadata only (never IGDB's ratings).
    private const string GameFields =
        "name, summary, first_release_date, cover.image_id, genres.name, " +
        "involved_companies.developer, involved_companies.publisher, involved_companies.company.name";

    public async Task<IReadOnlyList<GameDto>> SearchAsync(string query, CancellationToken cancellationToken)
    {
        // IGDB's APICALYPSE query language uses double quotes to delimit the search term.
        var term = query.Replace("\"", string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(term))
        {
            return Array.Empty<GameDto>();
        }

        var body = $"search \"{term}\"; fields {GameFields}; limit 24;";
        var games = await QueryIgdbAsync(body, cancellationToken);
        return games.Select(MapToDto).ToList();
    }

    public async Task<GameDto?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var body = $"fields {GameFields}; where id = {id};";
        var games = await QueryIgdbAsync(body, cancellationToken);
        var game = games.FirstOrDefault();
        return game is null ? null : MapToDto(game);
    }

    /// <summary>
    /// IGDB platform ids per family key. Kept server-side so the SPA only deals in friendly names.
    /// </summary>
    private static readonly Dictionary<string, long[]> PlatformIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pc"] = [6],
        ["playstation"] = [7, 8, 9, 48, 167],
        ["xbox"] = [11, 12, 49, 169],
        ["nintendo"] = [4, 5, 18, 19, 21, 41, 130],
        // "Retro" = the classic consoles: NES/SNES, PS1, N64, Dreamcast, Saturn, GB/GBA, Genesis.
        ["retro"] = [4, 7, 18, 19, 22, 23, 24, 29, 33],
    };

    /// <summary>IGDB genre ids per friendly key, same pattern as <see cref="PlatformIds"/>.</summary>
    private static readonly Dictionary<string, long> GenreIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["rpg"] = 12,
        ["shooter"] = 5,
        ["adventure"] = 31,
        ["platformer"] = 8,
        ["strategy"] = 15,
        ["racing"] = 10,
        ["fighting"] = 4,
        ["puzzle"] = 9,
        ["simulator"] = 13,
        ["sport"] = 14,
    };

    public async Task<IReadOnlyList<GameDto>> BrowseAsync(
        string sort, string? platform, string? genre, int? yearFrom, int? yearTo,
        int page, int pageSize, CancellationToken cancellationToken)
    {
        var where = BuildBrowseWhere(sort, platform, genre, yearFrom, yearTo);
        var sortClause = BuildBrowseSort(sort);
        var offset = Math.Max(0, (page - 1) * pageSize);

        var body =
            $"fields {GameFields}; where {where}; {sortClause}; limit {pageSize}; offset {offset};";
        var games = await QueryIgdbAsync(body, cancellationToken);
        return games.Select(MapToDto).ToList();
    }

    public async Task<int> BrowseCountAsync(
        string sort, string? platform, string? genre, int? yearFrom, int? yearTo,
        CancellationToken cancellationToken)
    {
        // Uses the SAME where clause as BrowseAsync so the total matches exactly what paging walks.
        var where = BuildBrowseWhere(sort, platform, genre, yearFrom, yearTo);
        return await QueryIgdbCountAsync(where, cancellationToken);
    }

    /// <summary>
    /// Builds the shared APICALYPSE <c>where</c> clause for browse + count. Only well-known titles with
    /// a cover, so the grid never surfaces IGDB's long tail of stubs. total_rating_count is a NOTABILITY
    /// threshold (how widely known a game is), never a score — all scores/reviews/rankings come from OUR
    /// OWN Reviews table, not IGDB. The date-sorts additionally require a known release date so the
    /// ordering (and its count) stay well-defined.
    /// </summary>
    private static string BuildBrowseWhere(
        string? sort, string? platform, string? genre, int? yearFrom, int? yearTo)
    {
        var conditions = new List<string> { "cover != null", "total_rating_count >= 10" };

        if (!string.IsNullOrWhiteSpace(platform) && PlatformIds.TryGetValue(platform, out var platformIds))
        {
            conditions.Add($"platforms = ({string.Join(",", platformIds)})");
        }

        if (!string.IsNullOrWhiteSpace(genre) && GenreIds.TryGetValue(genre, out var genreId))
        {
            conditions.Add($"genres = ({genreId})");
        }

        // Year range filter (e.g. a decade chip): IGDB stores release dates as unix seconds.
        if (yearFrom is int from)
        {
            var fromUnix = new DateTimeOffset(from, 1, 1, 0, 0, 0, TimeSpan.Zero).ToUnixTimeSeconds();
            conditions.Add($"first_release_date >= {fromUnix}");
        }
        if (yearTo is int to)
        {
            var toUnix = new DateTimeOffset(to + 1, 1, 1, 0, 0, 0, TimeSpan.Zero).ToUnixTimeSeconds();
            conditions.Add($"first_release_date < {toUnix}");
        }

        var normalized = sort?.ToLowerInvariant();
        if (normalized is "newest" or "oldest")
        {
            conditions.Add("first_release_date != null");
        }

        return string.Join(" & ", conditions);
    }

    /// <summary>
    /// The catalogue ordering. Default is popularity (rating COUNT = how widely known), not IGDB's
    /// rating value — "Highest Rated" ordering is applied by the frontend using our DB scores.
    /// </summary>
    private static string BuildBrowseSort(string? sort) => sort?.ToLowerInvariant() switch
    {
        "newest" => "sort first_release_date desc",
        "oldest" => "sort first_release_date asc",
        "name" => "sort name asc",
        _ => "sort total_rating_count desc",
    };

    public async Task<IReadOnlyList<GameDto>> GetByIdsAsync(
        IReadOnlyCollection<long> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return Array.Empty<GameDto>();
        }

        var body =
            $"fields {GameFields}; where id = ({string.Join(",", ids)}); limit {ids.Count};";
        var games = await QueryIgdbAsync(body, cancellationToken);
        return games.Select(MapToDto).ToList();
    }

    private async Task<List<IgdbGame>> QueryIgdbAsync(string apicalypseBody, CancellationToken cancellationToken)
    {
        var clientId = _configuration["Igdb:ClientId"];
        var token = await GetAccessTokenAsync(cancellationToken);

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, IgdbGamesUrl)
        {
            Content = new StringContent(apicalypseBody),
        };
        request.Headers.Add("Client-ID", clientId);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var games = await response.Content.ReadFromJsonAsync<List<IgdbGame>>(cancellationToken);
        return games ?? [];
    }

    /// <summary>
    /// Runs a matching <c>/count</c> query (same auth/headers as <see cref="QueryIgdbAsync"/>). IGDB's
    /// count endpoint takes just the <c>where</c> clause and returns <c>{ "count": N }</c>.
    /// </summary>
    private async Task<int> QueryIgdbCountAsync(string whereClause, CancellationToken cancellationToken)
    {
        var clientId = _configuration["Igdb:ClientId"];
        var token = await GetAccessTokenAsync(cancellationToken);

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, IgdbGamesCountUrl)
        {
            Content = new StringContent($"where {whereClause};"),
        };
        request.Headers.Add("Client-ID", clientId);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<IgdbCountResponse>(cancellationToken);
        return result?.Count ?? 0;
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue<string>(TokenCacheKey, out var cached) && !string.IsNullOrEmpty(cached))
        {
            return cached;
        }

        var clientId = _configuration["Igdb:ClientId"];
        var clientSecret = _configuration["Igdb:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            throw new GameLibraryNotConfiguredException(
                "The game library is not configured yet. Add IGDB (Twitch) credentials: Igdb:ClientId and Igdb:ClientSecret.");
        }

        var client = _httpClientFactory.CreateClient();
        var url = $"{TwitchTokenUrl}?client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials";

        using var response = await client.PostAsync(url, content: null, cancellationToken);
        response.EnsureSuccessStatusCode();

        var tokenResponse = await response.Content.ReadFromJsonAsync<TwitchTokenResponse>(cancellationToken);
        if (tokenResponse is null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Failed to obtain an IGDB (Twitch) access token.");
        }

        // Refresh a minute early to avoid using a token that expires mid-request.
        var lifetime = TimeSpan.FromSeconds(Math.Max(tokenResponse.ExpiresIn - 60, 60));
        _cache.Set(TokenCacheKey, tokenResponse.AccessToken, lifetime);
        return tokenResponse.AccessToken;
    }

    private static GameDto MapToDto(IgdbGame game)
    {
        int? year = null;
        int? age = null;
        DateTime? releaseDate = null;
        if (game.FirstReleaseDate is long unixSeconds)
        {
            // Keep the FULL release date (not just the year) — the review-eligibility rule compares
            // against the exact date so a game released late in a year isn't misclassified for months
            // (feature 003, research.md Decision 1). Year/Age below stay for display only.
            releaseDate = DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;
            year = releaseDate.Value.Year;
            age = DateTime.UtcNow.Year - releaseDate.Value.Year;
        }

        var coverImageUrl = string.IsNullOrEmpty(game.Cover?.ImageId)
            ? null
            : $"{CoverBaseUrl}{game.Cover.ImageId}.jpg";

        var genres = game.Genres?
            .Select(g => g.Name)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!)
            .ToList() ?? [];

        // IGDB tags each involved company as developer and/or publisher; take the first of each.
        var developer = game.InvolvedCompanies?
            .FirstOrDefault(c => c.Developer && !string.IsNullOrWhiteSpace(c.Company?.Name))
            ?.Company?.Name;
        var publisher = game.InvolvedCompanies?
            .FirstOrDefault(c => c.Publisher && !string.IsNullOrWhiteSpace(c.Company?.Name))
            ?.Company?.Name;

        return new GameDto(
            game.Id,
            game.Name ?? "Untitled",
            game.Summary,
            coverImageUrl,
            year,
            age,
            releaseDate,
            SystemRequirements: null, // IGDB does not expose system requirements.
            genres,
            developer,
            publisher);
    }

    private sealed record IgdbGame(
        [property: JsonPropertyName("id")] long Id,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("summary")] string? Summary,
        [property: JsonPropertyName("first_release_date")] long? FirstReleaseDate,
        [property: JsonPropertyName("cover")] IgdbCover? Cover,
        [property: JsonPropertyName("genres")] List<IgdbGenre>? Genres,
        [property: JsonPropertyName("involved_companies")] List<IgdbInvolvedCompany>? InvolvedCompanies);

    private sealed record IgdbCover(
        [property: JsonPropertyName("image_id")] string? ImageId);

    private sealed record IgdbGenre(
        [property: JsonPropertyName("name")] string? Name);

    private sealed record IgdbInvolvedCompany(
        [property: JsonPropertyName("company")] IgdbCompany? Company,
        [property: JsonPropertyName("developer")] bool Developer,
        [property: JsonPropertyName("publisher")] bool Publisher);

    private sealed record IgdbCompany(
        [property: JsonPropertyName("name")] string? Name);

    private sealed record TwitchTokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);

    private sealed record IgdbCountResponse(
        [property: JsonPropertyName("count")] int Count);
}
