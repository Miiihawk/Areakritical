namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// A game normalized from the external library (IGDB). SystemRequirements is nullable:
/// IGDB does not expose PC min/recommended specs, so it stays null until a source that has
/// them (e.g. Steam) is added. Genres/Developer/Publisher are IGDB *metadata* (facts about
/// the game) — scores and reviews never come from IGDB.
/// </summary>
public sealed record GameDto(
    long Id,
    string Title,
    string? Description,
    string? CoverImageUrl,
    int? ReleaseYear,
    int? Age,
    string? SystemRequirements,
    IReadOnlyList<string> Genres,
    string? Developer,
    string? Publisher);
