using GameRetro.Api.Models;

namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// A report as returned to the user who filed it (user-facing submission) and, with the extra
/// context fields populated, to an Admin reviewing the queue. The context fields are nullable
/// because a report's target may have already been removed (its FK set to null) by the time an
/// Admin looks at it.
/// </summary>
public sealed record ReportResponse(
    Guid Id,
    Guid? ReviewId,
    Guid? CommentId,
    ReportReason Reason,
    ReportStatus Status,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    // --- extra context, filled in for the Admin queue view only (null on the submission response) ---
    string? ReporterDisplayName = null,
    string? TargetText = null,
    long? TargetGameId = null);
