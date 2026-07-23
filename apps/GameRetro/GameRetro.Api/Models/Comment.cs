namespace GameRetro.Api.Models;

/// <summary>
/// A user's reply to a specific <see cref="Review"/>.
///
/// Relational role:
///   Review          (1) ──has many──► Comment  (the review being commented on, via <see cref="ReviewId"/>)
///   ApplicationUser (1) ──has many──► Comment  (the author, via <see cref="AuthorId"/>)
///   Comment         (1) ──has many──► Report   (flags raised against this comment)
///
/// Delete behaviour: when the parent Review is deleted, its Comments are deleted too (cascade).
/// </summary>
public sealed class Comment
{
    /// <summary>Primary key.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Foreign key → <see cref="Review.Id"/>. Which review this comment hangs under.</summary>
    public Guid ReviewId { get; set; }

    /// <summary>
    /// Foreign key → <see cref="ApplicationUser.Id"/>. "Who wrote it" — compared against the signed-in
    /// user for edit/delete permission checks.
    /// </summary>
    public string AuthorId { get; set; } = string.Empty;

    /// <summary>The comment body. Required, non-empty (FR-010).</summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>Set once, on creation.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Set on creation and refreshed on every edit.</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // --- Navigation properties. ---

    /// <summary>The review this comment belongs to. Backed by <see cref="ReviewId"/>.</summary>
    public Review? Review { get; set; }

    /// <summary>The account that wrote this comment. Backed by <see cref="AuthorId"/>.</summary>
    public ApplicationUser? Author { get; set; }

    /// <summary>Reports raised against this comment. They survive the comment's deletion (SetNull).</summary>
    public ICollection<Report> Reports { get; set; } = new List<Report>();
}
