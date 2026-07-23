namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for an Admin curating a game (FR-018b): toggle its hidden state and/or set display overrides.
/// All override fields are nullable — null means "no override, show IGDB's own value".
/// </summary>
public sealed class GameModerationRequest
{
    public bool IsHidden { get; set; }

    public string? TitleOverride { get; set; }

    public string? DescriptionOverride { get; set; }

    public string? CoverImageUrlOverride { get; set; }
}
