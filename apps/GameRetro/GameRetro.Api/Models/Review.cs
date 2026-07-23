namespace GameRetro.Api.Models;

/// <summary>
/// One user's scored evaluation of one <see cref="Game"/>.
///
/// Relational role — a Review sits in the MIDDLE of three relationships:
///   Game            (1) ──has many──► Review   (the game being reviewed, via <see cref="GameId"/>)
///   ApplicationUser (1) ──has many──► Review   (the author, via <see cref="AuthorId"/>)
///   Review          (1) ──has many──► Comment  (replies to this review)
///   Review          (1) ──has many──► Report   (flags raised against this review)
///
/// Business rule: exactly ONE review per (author, game) pair. A second submission by the same
/// author for the same game UPDATES this row instead of inserting another (enforced by a unique
/// index configured in <see cref="Data.AuthDbContext"/> plus service-layer logic).
/// </summary>
public sealed class Review
{
    /// <summary>Primary key. A <see cref="Guid"/> so reviews can be referenced in URLs without leaking a count.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Foreign key → <see cref="Game.Id"/>. This <c>long</c> is the IGDB id, which is also our local
    /// Game row's primary key, so this single value ties the review to both records.
    /// </summary>
    public long GameId { get; set; }

    /// <summary>
    /// Foreign key → <see cref="ApplicationUser.Id"/> (a string, because Identity uses string keys).
    /// This is "who wrote it", and every edit/delete permission check compares the signed-in user's
    /// id against this value.
    /// </summary>
    public string AuthorId { get; set; } = string.Empty;

    // --- The five 1–10 mechanic scores (FR-004/FR-005). Stored as five separate columns, not a
    //     collection, because the set of mechanics is fixed and known at compile time. ---

    /// <summary>How the game plays. 1–10.</summary>
    public int GameplayScore { get; set; }

    /// <summary>Story &amp; narrative. 1–10.</summary>
    public int StoryScore { get; set; }

    /// <summary>Audiovisual presentation. 1–10.</summary>
    public int AudiovisualScore { get; set; }

    /// <summary>Replayability. 1–10.</summary>
    public int ReplayabilityScore { get; set; }

    /// <summary>Overall enjoyment. 1–10. (This is one of the five INPUTS, not the computed average.)</summary>
    public int OverallEnjoymentScore { get; set; }

    /// <summary>The written review body. Required, non-empty.</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>Set once, when the review is first created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Set on creation and refreshed on every edit.</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // --- Navigation properties: how EF Core (and you) walk from a Review to its related rows. ---

    /// <summary>The game this review is about. Backed by <see cref="GameId"/>.</summary>
    public Game? Game { get; set; }

    /// <summary>The account that wrote this review. Backed by <see cref="AuthorId"/>.</summary>
    public ApplicationUser? Author { get; set; }

    /// <summary>The comments posted underneath this review. Deleting the review cascade-deletes these.</summary>
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    /// <summary>Reports raised against this review. These survive the review's deletion (SetNull).</summary>
    public ICollection<Report> Reports { get; set; } = new List<Report>();

    /// <summary>
    /// A review's own "overall score" (FR-006) is COMPUTED, never stored: the plain average of the
    /// five mechanic scores. Computing it here (rather than saving a sixth column) means it can never
    /// drift out of sync with the inputs — it is derived fresh every time it is read.
    /// </summary>
    public double OverallScore =>
        (GameplayScore + StoryScore + AudiovisualScore + ReplayabilityScore + OverallEnjoymentScore) / 5.0;
}
