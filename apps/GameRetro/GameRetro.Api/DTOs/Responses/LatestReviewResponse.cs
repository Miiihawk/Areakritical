namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// One entry in the "Latest Reviews" community feed: a recent review plus just enough of its game
/// (title/cover, IGDB metadata with Admin overrides winning) to render a card that links to the
/// game's detail page. The score is computed from OUR reviews — same formula as everywhere else.
/// </summary>
public sealed record LatestReviewResponse(
    Guid ReviewId,
    long GameId,
    string GameTitle,
    string? GameCoverImageUrl,
    string AuthorDisplayName,
    double OverallScore,
    string Text,
    DateTime CreatedAt);
