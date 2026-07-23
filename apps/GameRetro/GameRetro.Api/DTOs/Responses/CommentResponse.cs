namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// A single comment as returned to the browser. Like <see cref="ReviewResponse"/>,
/// <see cref="AuthorDisplayName"/> is read from the author's current profile at query time (FR-015).
/// </summary>
public sealed record CommentResponse(
    Guid Id,
    Guid ReviewId,
    string AuthorId,
    string AuthorDisplayName,
    string Text,
    DateTime CreatedAt,
    DateTime UpdatedAt);
