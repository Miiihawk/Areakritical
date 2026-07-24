namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// The game detail page payload (User Story 1). It merges three sources into one flat object:
///   1. live IGDB metadata (title/description/cover/year), from <see cref="Services.GameLibraryService"/>;
///   2. any Admin overrides stored on the local <see cref="Models.Game"/> shadow row;
///   3. the game's reviews plus their computed aggregate score.
///
/// <see cref="AggregateScore"/> is null and <see cref="Reviews"/> is empty when <see cref="ReviewCount"/>
/// is 0 (FR-003) — the "no reviews yet" state. Reviews are PAGINATED (<see cref="Page"/>/<see cref="PageSize"/>)
/// so a heavily-reviewed game never dumps its entire review list in one response (Constitution IV).
/// </summary>
public sealed record GameDetailResponse(
    long Id,
    string Title,
    string? Description,
    string? CoverImageUrl,
    int? ReleaseYear,
    int? Age,
    string? SystemRequirements,
    IReadOnlyList<string> Genres,
    string? Developer,
    string? Publisher,
    double? AggregateScore,
    int ReviewCount,
    IReadOnlyList<ReviewResponse> Reviews,
    int Page,
    int PageSize,
    // Feature 003 (retro-only reviews): whether a NEW review may be created for this game right now
    // (a game must be at least 5 years old), and when it becomes/became eligible (release date + 5
    // years; null when the release date is unknown — in which case IsEligibleForReview is false too).
    bool IsEligibleForReview,
    DateTime? ReviewEligibleAtUtc);
