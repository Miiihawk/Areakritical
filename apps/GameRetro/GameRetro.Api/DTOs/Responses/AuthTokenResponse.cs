namespace GameRetro.Api.DTOs.Responses;

public sealed record AuthTokenResponse(string Token, string Role, DateTime ExpiresAtUtc);
