namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// The caller's own profile. <see cref="Username"/>/<see cref="Email"/> are read-only here — they are
/// owned by the authentication feature and cannot be edited on this screen; only
/// <see cref="DisplayName"/>/<see cref="Bio"/> are editable (FR-014).
/// </summary>
public sealed record ProfileResponse(
    string Id,
    string Username,
    string Email,
    string? DisplayName,
    string? Bio);
