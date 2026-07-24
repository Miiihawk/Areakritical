namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// Public headline numbers for the landing page. Every figure comes from OUR OWN database (reviews,
/// members) — never from IGDB, which only supplies game metadata.
/// </summary>
public sealed record SiteStatsResponse(
    int TitlesReviewed,
    int Retrospectives,
    int Members);
