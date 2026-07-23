namespace GameRetro.Api.Models;

/// <summary>The reason a user gives when flagging content (FR-016).</summary>
public enum ReportReason
{
    Spam,
    Harassment,
    OffTopic,
    Other,
}

/// <summary>Where a report sits in an Admin's queue.</summary>
public enum ReportStatus
{
    /// <summary>Awaiting an Admin decision. This is the default when a report is created.</summary>
    Open,

    /// <summary>An Admin agreed and removed the content.</summary>
    Resolved,

    /// <summary>An Admin reviewed it and left the content in place.</summary>
    Dismissed,
}

/// <summary>
/// A flag raised by one user against ONE piece of content — either a <see cref="Review"/> or a
/// <see cref="Comment"/>, never both.
///
/// Relational role:
///   ApplicationUser (1) ──raises many──► Report  (the reporter, via <see cref="ReporterId"/>)
///   Review          (1) ──may have many──► Report (via the NULLABLE <see cref="ReviewId"/>)
///   Comment         (1) ──may have many──► Report (via the NULLABLE <see cref="CommentId"/>)
///
/// Mentor note — why TWO nullable FKs instead of one "TargetId":
///   A report targets a review OR a comment. Rather than a single loose "TargetId + TargetType"
///   pair (which the database cannot enforce as a real foreign key), we keep two proper nullable
///   FKs. Exactly one is set; the other stays null. This buys us real referential integrity and
///   real delete behaviour, at the cost of one extra column — a good trade for a project whose
///   constitution mandates EF Core-managed schema integrity (research.md Decision 3).
///
/// Delete behaviour — the subtle part:
///   <see cref="ReviewId"/>/<see cref="CommentId"/> use ON DELETE SET NULL, NOT cascade. When the
///   reported content is removed, this Report row SURVIVES with a null target. That is deliberate:
///   an Admin who "resolves by removing content" must be able to mark THIS report
///   <see cref="ReportStatus.Resolved"/> AFTER the target is gone. A cascade would delete the report
///   in the same breath as its target, leaving nothing to mark resolved.
/// </summary>
public sealed class Report
{
    /// <summary>Primary key.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Foreign key → <see cref="ApplicationUser.Id"/>. Who raised the flag.</summary>
    public string ReporterId { get; set; } = string.Empty;

    /// <summary>Nullable foreign key → <see cref="Review.Id"/>. Set when a review is being reported.</summary>
    public Guid? ReviewId { get; set; }

    /// <summary>Nullable foreign key → <see cref="Comment.Id"/>. Set when a comment is being reported.</summary>
    public Guid? CommentId { get; set; }

    /// <summary>Why the content was flagged. Required (FR-016).</summary>
    public ReportReason Reason { get; set; }

    /// <summary>Queue state. Starts <see cref="ReportStatus.Open"/>.</summary>
    public ReportStatus Status { get; set; } = ReportStatus.Open;

    /// <summary>Set on creation.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Set when an Admin resolves or dismisses it (FR-019). Null while still Open.</summary>
    public DateTime? ResolvedAt { get; set; }

    // --- Navigation properties. Both content targets are nullable, mirroring the nullable FKs. ---

    /// <summary>The account that raised this report. Backed by <see cref="ReporterId"/>.</summary>
    public ApplicationUser? Reporter { get; set; }

    /// <summary>The reported review, if any. Backed by <see cref="ReviewId"/>.</summary>
    public Review? Review { get; set; }

    /// <summary>The reported comment, if any. Backed by <see cref="CommentId"/>.</summary>
    public Comment? Comment { get; set; }
}
