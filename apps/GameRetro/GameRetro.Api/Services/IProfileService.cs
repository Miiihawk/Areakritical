using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

/// <summary>Outcome of a profile field update.</summary>
public enum ProfileUpdateOutcome
{
    Success,          // → 200
    DisplayNameBlank, // → 400: display name was explicitly submitted blank.
    UserNotFound,     // → 404 (shouldn't happen for a signed-in caller, but handled defensively).
}

public sealed record ProfileUpdateResult(ProfileUpdateOutcome Outcome, ProfileResponse? Profile, string? ErrorMessage);

/// <summary>Outcome of a password change.</summary>
public enum ChangePasswordOutcome
{
    Success,       // → 204
    Mismatch,      // → 400: newPassword != confirmNewPassword.
    PolicyFailed,  // → 400: new password fails the password policy.
    UserNotFound,  // → 404.
}

public sealed record ChangePasswordResult(ChangePasswordOutcome Outcome, string? ErrorMessage);

public interface IProfileService
{
    /// <summary>Returns the caller's own profile (FR-014).</summary>
    Task<ProfileResponse?> GetAsync(string userId, CancellationToken cancellationToken);

    /// <summary>Updates the caller's editable profile fields (FR-014/FR-015).</summary>
    Task<ProfileUpdateResult> UpdateAsync(
        string userId, ProfileUpdateRequest request, CancellationToken cancellationToken);

    /// <summary>Changes the caller's password with no current-password check (FR-014a/FR-014b).</summary>
    Task<ChangePasswordResult> ChangePasswordAsync(
        string userId, ChangePasswordRequest request, CancellationToken cancellationToken);
}
