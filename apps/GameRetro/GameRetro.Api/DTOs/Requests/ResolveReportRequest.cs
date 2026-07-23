using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body an Admin sends to resolve a report (FR-019). <see cref="Action"/> is either "RemoveContent"
/// (delete the reported review/comment, then mark this report Resolved) or "Dismiss" (leave the
/// content, mark this report Dismissed). The exact value is validated in
/// <see cref="Services.ReportService"/>.
/// </summary>
public sealed class ResolveReportRequest
{
    [Required(ErrorMessage = "an action is required")]
    public string Action { get; set; } = string.Empty;
}
