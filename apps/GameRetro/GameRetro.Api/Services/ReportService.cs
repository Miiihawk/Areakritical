using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Report submission (user-facing) and resolution (Admin). The resolution path is the most
/// relationally subtle code in the feature: it deletes reported content THROUGH the review/comment
/// services while keeping this report row alive to record the outcome — which only works because of
/// the SetNull delete rule configured on Report's FKs in <see cref="AuthDbContext"/>.
/// </summary>
public sealed class ReportService : IReportService
{
    private readonly AuthDbContext _db;
    private readonly IReviewService _reviewService;
    private readonly ICommentService _commentService;

    public ReportService(AuthDbContext db, IReviewService reviewService, ICommentService commentService)
    {
        _db = db;
        _reviewService = reviewService;
        _commentService = commentService;
    }

    public async Task<ReportSubmitResult> SubmitAsync(
        string reporterId, ReportRequest request, CancellationToken cancellationToken)
    {
        // RULE (research.md Decision 3): a report targets EXACTLY ONE of a review or a comment.
        // "Exactly one" = the two nullable ids are not both null and not both set.
        var hasReview = request.ReviewId is not null;
        var hasComment = request.CommentId is not null;
        if (hasReview == hasComment)
        {
            return new ReportSubmitResult(
                ReportSubmitOutcome.InvalidTarget, null,
                "a report must target exactly one review or comment");
        }

        // Reason is guaranteed non-null here (the [Required] attribute already ran at the boundary),
        // but we read it into a local so the compiler is happy about the nullable.
        var reason = request.Reason!.Value;

        if (hasReview)
        {
            // The reported review must exist...
            var reviewExists = await _db.Reviews.AnyAsync(r => r.Id == request.ReviewId, cancellationToken);
            if (!reviewExists)
            {
                return new ReportSubmitResult(ReportSubmitOutcome.ReviewNotFound, null, "review not found");
            }

            // ...and this user must not have already reported it (FR-017).
            var alreadyReported = await _db.Reports.AnyAsync(
                p => p.ReporterId == reporterId && p.ReviewId == request.ReviewId, cancellationToken);
            if (alreadyReported)
            {
                return new ReportSubmitResult(
                    ReportSubmitOutcome.Duplicate, null, "you have already reported this");
            }
        }
        else
        {
            var commentExists = await _db.Comments.AnyAsync(c => c.Id == request.CommentId, cancellationToken);
            if (!commentExists)
            {
                return new ReportSubmitResult(ReportSubmitOutcome.CommentNotFound, null, "comment not found");
            }

            var alreadyReported = await _db.Reports.AnyAsync(
                p => p.ReporterId == reporterId && p.CommentId == request.CommentId, cancellationToken);
            if (alreadyReported)
            {
                return new ReportSubmitResult(
                    ReportSubmitOutcome.Duplicate, null, "you have already reported this");
            }
        }

        var report = new Report
        {
            ReporterId = reporterId,
            ReviewId = request.ReviewId,
            CommentId = request.CommentId,
            Reason = reason,
            Status = ReportStatus.Open,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Reports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        // Submission response: just the report's own fields, no Admin-only context.
        var response = new ReportResponse(
            report.Id, report.ReviewId, report.CommentId, report.Reason, report.Status,
            report.CreatedAt, report.ResolvedAt);
        return new ReportSubmitResult(ReportSubmitOutcome.Created, response, null);
    }

    public async Task<IReadOnlyList<ReportResponse>> ListAsync(
        ReportStatus? status, CancellationToken cancellationToken)
    {
        var query = _db.Reports.AsNoTracking().AsQueryable();

        // Default view is the open queue; an Admin can ask for a specific status instead.
        if (status is not null)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        // Project each report together with enough context (reporter name, target text, target game)
        // for an Admin to judge it without a second lookup. The target may already be gone (FK nulled),
        // so every context field is conditional and may come back null.
        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ReportResponse(
                p.Id,
                p.ReviewId,
                p.CommentId,
                p.Reason,
                p.Status,
                p.CreatedAt,
                p.ResolvedAt,
                p.Reporter!.DisplayName ?? p.Reporter.UserName!,
                p.Review != null ? p.Review.Text : (p.Comment != null ? p.Comment.Text : null),
                p.Review != null
                    ? p.Review.GameId
                    : (p.Comment != null ? p.Comment.Review!.GameId : (long?)null)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ReportResolveResult> ResolveAsync(
        Guid reportId, string action, string adminId, CancellationToken cancellationToken)
    {
        // Parse the action string into a clear branch. Anything else is a 400.
        var removeContent = string.Equals(action, "RemoveContent", StringComparison.OrdinalIgnoreCase);
        var dismiss = string.Equals(action, "Dismiss", StringComparison.OrdinalIgnoreCase);
        if (!removeContent && !dismiss)
        {
            return new ReportResolveResult(ReportResolveOutcome.InvalidAction, null);
        }

        var report = await _db.Reports.FirstOrDefaultAsync(p => p.Id == reportId, cancellationToken);
        if (report is null)
        {
            return new ReportResolveResult(ReportResolveOutcome.NotFound, null);
        }

        // A report can only be resolved once (FR-019). A second attempt is a conflict.
        if (report.Status != ReportStatus.Open)
        {
            return new ReportResolveResult(ReportResolveOutcome.AlreadyResolved, null);
        }

        if (removeContent)
        {
            // ORDER IS CRITICAL (T065 / research.md Decision 3): mark this report Resolved and SAVE it
            // FIRST, then delete the target. Because Report→Review/Comment uses SetNull (not cascade),
            // deleting the target only nulls this report's FK — the row itself, now marked Resolved,
            // survives. If we deleted first, a cascade would have taken the report with it and there'd
            // be nothing left to mark resolved.
            report.Status = ReportStatus.Resolved;
            report.ResolvedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            if (report.ReviewId is Guid reviewId)
            {
                // isAdmin: true → skip the author-ownership check (an Admin removes anyone's content).
                await _reviewService.DeleteAsync(reviewId, adminId, isAdmin: true, cancellationToken);
            }
            else if (report.CommentId is Guid commentId)
            {
                await _commentService.DeleteAsync(commentId, adminId, isAdmin: true, cancellationToken);
            }
        }
        else
        {
            // Dismiss: leave the content untouched, just close the report.
            report.Status = ReportStatus.Dismissed;
            report.ResolvedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        // Re-read the report so the response reflects the (possibly now null) target FK after deletion.
        await _db.Entry(report).ReloadAsync(cancellationToken);
        var response = new ReportResponse(
            report.Id, report.ReviewId, report.CommentId, report.Reason, report.Status,
            report.CreatedAt, report.ResolvedAt);
        return new ReportResolveResult(ReportResolveOutcome.Success, response);
    }
}
