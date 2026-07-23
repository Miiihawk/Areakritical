namespace GameRetro.Api.DTOs.Responses;

/// <summary>The local moderation state of a game after an Admin edits it (FR-018b).</summary>
public sealed record GameModerationResponse(
    long Id,
    bool IsHidden,
    string? TitleOverride,
    string? DescriptionOverride,
    string? CoverImageUrlOverride);
