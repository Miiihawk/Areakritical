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
    int ReviewCount);
