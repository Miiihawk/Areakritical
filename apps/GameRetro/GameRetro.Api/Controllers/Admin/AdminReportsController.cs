using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Models;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers.Admin;

/// <summary>Admin report queue (User Story 8): view reports and resolve them (FR-019).</summary>
[ApiController]
[Route("api/admin/reports")]
[Authorize(Roles = "Admin")]
public sealed class AdminReportsController : AppControllerBase
{
    private readonly IReportService _reportService;

    public AdminReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>GET /api/admin/reports?status=Open — list reports, defaulting to the open queue.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status = null, CancellationToken cancellationToken = default)
    {
        // No status given → show the open queue (the default view). A given value must be a real
        // ReportStatus; anything else is a bad request.
        ReportStatus? filter;
        if (string.IsNullOrWhiteSpace(status))
        {
            filter = ReportStatus.Open;
        }
        else if (Enum.TryParse<ReportStatus>(status, ignoreCase: true, out var parsed))
        {
            filter = parsed;
        }
        else
        {
            return BadRequest(new { message = "invalid status filter" });
        }

        var reports = await _reportService.ListAsync(filter, cancellationToken);
        return Ok(reports);
    }

    /// <summary>POST /api/admin/reports/{reportId}/resolve — remove the content or dismiss the report.</summary>
    [HttpPost("{reportId:guid}/resolve")]
    public async Task<IActionResult> Resolve(
        Guid reportId, [FromBody] ResolveReportRequest request, CancellationToken cancellationToken)
    {
        var result = await _reportService.ResolveAsync(
            reportId, request.Action, CurrentUserId, cancellationToken);

        return result.Outcome switch
        {
            ReportResolveOutcome.Success => Ok(result.Report),
            ReportResolveOutcome.InvalidAction => BadRequest(new { message = "invalid action" }),
            ReportResolveOutcome.AlreadyResolved => Conflict(new { message = "report already resolved" }),
            _ => NotFound(new { message = "report not found" }),
        };
    }
}
