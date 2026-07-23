using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;

namespace GameRetro.Api.Services;

/// <summary>Outcome of a user submitting a report.</summary>
public enum ReportSubmitOutcome
{
    Created,          // → 201
    InvalidTarget,    // → 400: neither or both of reviewId/commentId set.
    Duplicate,        // → 409: this user already reported this target (FR-017).
    ReviewNotFound,   // → 404
    CommentNotFound,  // → 404
}

public sealed record ReportSubmitResult(ReportSubmitOutcome Outcome, ReportResponse? Report, string? ErrorMessage);

/// <summary>Outcome of an Admin resolving a report.</summary>
public enum ReportResolveOutcome
{
    Success,          // → 200
    InvalidAction,    // → 400
    NotFound,         // → 404
    AlreadyResolved,  // → 409: report was already Resolved/Dismissed.
}

public sealed record ReportResolveResult(ReportResolveOutcome Outcome, ReportResponse? Report);

public interface IReportService
{
    /// <summary>Files a report against a review or a comment (FR-016/FR-017).</summary>
    Task<ReportSubmitResult> SubmitAsync(
        string reporterId, ReportRequest request, CancellationToken cancellationToken);

    /// <summary>Lists reports for the Admin queue, optionally filtered by status (default: Open).</summary>
    Task<IReadOnlyList<ReportResponse>> ListAsync(ReportStatus? status, CancellationToken cancellationToken);

    /// <summary>Resolves a report by removing the content or dismissing it (FR-019).</summary>
    Task<ReportResolveResult> ResolveAsync(
        Guid reportId, string action, string adminId, CancellationToken cancellationToken);
}
