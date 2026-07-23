using System.ComponentModel.DataAnnotations;
using GameRetro.Api.Models;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for reporting a review OR a comment (FR-016). Exactly one of <see cref="ReviewId"/>/
/// <see cref="CommentId"/> must be set — that "exactly one" rule can't be expressed as a simple
/// attribute, so it is checked in <see cref="Services.ReportService"/>. <see cref="Reason"/> is
/// nullable so that a MISSING reason fails <c>[Required]</c> rather than silently defaulting to the
/// first enum value.
/// </summary>
public sealed class ReportRequest
{
    public Guid? ReviewId { get; set; }

    public Guid? CommentId { get; set; }

    [Required(ErrorMessage = "a report reason is required")]
    public ReportReason? Reason { get; set; }
}
