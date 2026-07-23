using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>Body for creating/editing a comment. The only rule is non-empty text (FR-010).</summary>
public sealed class CommentRequest
{
    [Required(ErrorMessage = "comment cannot be empty")]
    public string Text { get; set; } = string.Empty;
}
