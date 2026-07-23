using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// The body a client POSTs/PUTs to create or edit a review.
///
/// Mentor note — validation happens HERE, at the request boundary (Constitution I). The
/// <c>[Range]</c> and <c>[Required]</c> attributes are checked automatically by the
/// <c>[ApiController]</c> pipeline before our controller code runs, so an out-of-range score never
/// reaches the service layer. Each message names the specific field so the UI can point the user at it.
/// </summary>
public sealed class ReviewRequest
{
    [Range(1, 10, ErrorMessage = "gameplay score must be between 1 and 10")]
    public int GameplayScore { get; set; }

    [Range(1, 10, ErrorMessage = "story score must be between 1 and 10")]
    public int StoryScore { get; set; }

    [Range(1, 10, ErrorMessage = "audiovisual score must be between 1 and 10")]
    public int AudiovisualScore { get; set; }

    [Range(1, 10, ErrorMessage = "replayability score must be between 1 and 10")]
    public int ReplayabilityScore { get; set; }

    [Range(1, 10, ErrorMessage = "overall enjoyment score must be between 1 and 10")]
    public int OverallEnjoymentScore { get; set; }

    [Required(ErrorMessage = "review text is required")]
    public string Text { get; set; } = string.Empty;
}
