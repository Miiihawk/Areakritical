namespace GameRetro.Api.Models;

/// <summary>
/// A LOCAL "shadow" row for a game that originally comes from the external IGDB catalogue.
///
/// Mentor note — why this class exists at all:
///   The catalogue itself lives on IGDB's servers (see <see cref="Services.GameLibraryService"/>),
///   NOT in our database. But Reviews, Comments, and Reports all need a stable thing to point at
///   for "which game is this about?". A foreign key cannot point at a row on someone else's server,
///   so we keep a tiny local copy — just enough columns to (a) give those other tables a real FK
///   target and (b) store the moderation state an Admin sets (hidden / overridden text).
///
/// Relational role: this is the "one" side of one-to-many with <see cref="Review"/>.
///   Game (1) ────has many────► Review (many)
/// </summary>
public sealed class Game
{
    /// <summary>
    /// Primary key. IMPORTANT: this is NOT a database-generated identity value — it is the SAME
    /// <c>long</c> id IGDB already assigned to the game. Reusing the external id means a Review can
    /// store that id in <see cref="Review.GameId"/> and it lines up with both our local row and the
    /// live IGDB record without any translation step.
    /// </summary>
    public long Id { get; set; }

    /// <summary>Nullable. When an Admin sets this, the detail page shows it instead of IGDB's title.</summary>
    public string? TitleOverride { get; set; }

    /// <summary>Nullable. Same override pattern as <see cref="TitleOverride"/>, for the description.</summary>
    public string? DescriptionOverride { get; set; }

    /// <summary>Nullable. Same override pattern, for the cover image URL.</summary>
    public string? CoverImageUrlOverride { get; set; }

    /// <summary>
    /// When true, non-Admin users get a 404 for this game's detail page (and therefore cannot reach
    /// its reviews/comments either). The row stays in the database so an Admin can un-hide it later —
    /// we never hard-delete a Game (research.md Decision 4).
    /// </summary>
    public bool IsHidden { get; set; }

    /// <summary>Stamped once, the moment this shadow row is lazily created.</summary>
    public DateTime FirstSeenAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property: the reviews written for this game. EF Core uses this to understand the
    /// one-to-many relationship. In C# terms, <c>game.Reviews</c> lets you walk from a game to all of
    /// its reviews; on the database side it is backed by <see cref="Review.GameId"/>.
    /// </summary>
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
