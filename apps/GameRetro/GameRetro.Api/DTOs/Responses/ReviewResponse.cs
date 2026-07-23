namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// The shape of a single review as the API hands it back to the browser.
///
/// Mentor note — why a DTO instead of returning the <see cref="Models.Review"/> entity directly:
///   The entity has navigation properties (Author, Game, Comments...) that would drag half the
///   database into the JSON and could loop forever. A DTO is a flat, deliberate "just these fields"
///   snapshot. Note <see cref="AuthorDisplayName"/> is resolved at query time from the author's
///   CURRENT profile (FR-015) — we never store a copy of the name on the review itself, so a profile
///   rename shows up everywhere at once.
/// </summary>
public sealed record ReviewResponse(
    Guid Id,
    long GameId,
    string AuthorId,
    string AuthorDisplayName,
    int GameplayScore,
    int StoryScore,
    int AudiovisualScore,
    int ReplayabilityScore,
    int OverallEnjoymentScore,
    double OverallScore,
    string Text,
    DateTime CreatedAt,
    DateTime UpdatedAt);
