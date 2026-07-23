using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>
/// User-facing report submission (User Story 7). The Admin side (listing/resolving) lives in
/// <see cref="Admin.AdminReportsController"/>; this controller only lets a user FILE a report.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize] // FR-022: signed-in users only.
public sealed class ReportsController : AppControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>POST /api/reports — flag a review or a comment.</summary>
    [HttpPost]
    public async Task<IActionResult> Submit(
        [FromBody] ReportRequest request, CancellationToken cancellationToken)
    {
        var result = await _reportService.SubmitAsync(CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            ReportSubmitOutcome.Created => StatusCode(StatusCodes.Status201Created, result.Report),
            ReportSubmitOutcome.InvalidTarget => BadRequest(new { message = result.ErrorMessage }),
            ReportSubmitOutcome.Duplicate => Conflict(new { message = result.ErrorMessage }),
            // Both "review not found" and "comment not found" are 404s; the service picked the wording.
            _ => NotFound(new { message = result.ErrorMessage }),
        };
    }
}
