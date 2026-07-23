using Microsoft.AspNetCore.Identity;

namespace GameRetro.Api.Models;

/// <summary>
/// The account entity. Extends ASP.NET Core Identity's <see cref="IdentityUser"/> (which already
/// supplies Id, UserName, Email, PasswordHash, etc.). This feature adds two cosmetic profile fields
/// and one moderation flag.
///
/// Relational role — an account is the "one" side of three relationships:
///   ApplicationUser (1) ──authors──► Review  (via <see cref="Review.AuthorId"/>)
///   ApplicationUser (1) ──authors──► Comment (via <see cref="Comment.AuthorId"/>)
///   ApplicationUser (1) ──raises───► Report  (via <see cref="Report.ReporterId"/>)
/// Deleting an account cascade-deletes all three (configured in <see cref="Data.AuthDbContext"/>),
/// so no orphaned content is left behind (FR-018d).
/// </summary>
public sealed class ApplicationUser : IdentityUser
{
    /// <summary>When the account was created. Carried over from the authentication feature.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optional friendly name shown on reviews/comments. When null/blank, the UI falls back to the
    /// account's <see cref="IdentityUser.UserName"/>. This is purely cosmetic — it does NOT replace
    /// the unique Username used for identity/login (research.md cross-feature note).
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>Optional short free-text "about me".</summary>
    public string? Bio { get; set; }

    /// <summary>
    /// When true, an Admin has switched this account off: it can no longer log in (the login flow in
    /// <see cref="Services.AuthService"/> checks this flag). Distinct from Identity's built-in
    /// failed-login LockoutEnd — this is a deliberate Admin action, kept as its own field so the
    /// intent stays traceable (research.md Decision 6).
    /// </summary>
    public bool IsDeactivated { get; set; }

    // --- Navigation properties: an account's authored content. ---

    /// <summary>Reviews this account has written.</summary>
    public ICollection<Review> Reviews { get; set; } = new List<Review>();

    /// <summary>Comments this account has written.</summary>
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    /// <summary>Reports this account has raised.</summary>
    public ICollection<Report> Reports { get; set; } = new List<Report>();
}
