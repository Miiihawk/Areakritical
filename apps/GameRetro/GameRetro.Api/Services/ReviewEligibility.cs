namespace GameRetro.Api.Services;

/// <summary>
/// The one rule of feature 003: a game may only be reviewed once it is at least 5 years old
/// (GameRetro is a *retro* review site). This is a pure static helper, deliberately NOT an injected
/// service — it is a single date comparison with no dependencies, so wrapping it in an interface would
/// be over-abstraction (Constitution I / YAGNI, research.md Decision 2). It is called from exactly two
/// places: <see cref="ReviewService"/> (the authoritative server-side gate) and
/// <see cref="GameDetailService"/> (to tell the frontend which state to render).
/// </summary>
public static class ReviewEligibility
{
    /// <summary>How old (in years) a game must be before it can be reviewed.</summary>
    private const int RequiredYears = 5;

    /// <summary>
    /// True when the game is old enough to review. The boundary is INCLUSIVE (exactly 5 years old is
    /// eligible, FR-001). A <c>null</c> release date is conservatively ineligible (FR-002) — we never
    /// let a game with an unknown release date be reviewed.
    /// </summary>
    public static bool IsEligible(DateTime? releaseDate, DateTime utcNow) =>
        releaseDate is DateTime date && date <= utcNow.AddYears(-RequiredYears);

    /// <summary>
    /// When the game becomes (or became) eligible: its release date + 5 years. Returns <c>null</c>
    /// when the release date is unknown, in which case the game is ineligible with no known eligibility
    /// date (FR-002, FR-008).
    /// </summary>
    public static DateTime? EligibleAtUtc(DateTime? releaseDate) =>
        releaseDate?.AddYears(RequiredYears);
}
