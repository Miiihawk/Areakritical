namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// One row of the community ranking: a reviewed game with its computed aggregate score (the
/// average of its reviews' per-review averages) and how many reviews produced it. Title/cover
/// come from IGDB, with Admin overrides winning when set — same merge rule as the detail page.
/// </summary>
public sealed record GameRankingResponse(
    long Id,
    string Title,
    string? CoverImageUrl,
    int? ReleaseYear,
    double AggregateScore,
    int ReviewCount,
    // IGDB metadata (genre names), carried so the library's "Highest Rated" cards — which render
    // straight from this leaderboard, our own DB's ordering — keep the same genre chips as the rest
    // of the catalogue. The SCORE/ORDER never come from IGDB; only these display tags do.
    IReadOnlyList<string> Genres);
