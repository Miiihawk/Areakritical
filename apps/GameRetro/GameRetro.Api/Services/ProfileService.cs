using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace GameRetro.Api.Services;

/// <summary>
/// Profile read/update plus password change. Note this service talks to Identity's
/// <see cref="UserManager{TUser}"/> rather than the DbContext directly — the account IS an
/// <see cref="ApplicationUser"/>, and UserManager is the sanctioned way to load and persist one
/// (it handles hashing, validation, and concurrency stamps for us).
/// </summary>
public sealed class ProfileService : IProfileService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<ProfileResponse?> GetAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        return ToResponse(user);
    }

    public async Task<ProfileUpdateResult> UpdateAsync(
        string userId, ProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new ProfileUpdateResult(ProfileUpdateOutcome.UserNotFound, null, "user not found");
        }

        // DisplayName: null means "leave unchanged"; a provided value must not be blank (FR-014). This
        // is the one field that has a rule beyond "just save it".
        if (request.DisplayName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return new ProfileUpdateResult(
                    ProfileUpdateOutcome.DisplayNameBlank, null, "display name cannot be blank");
            }

            user.DisplayName = request.DisplayName.Trim();
        }

        // Bio: null means "leave unchanged"; any provided value (including empty) is accepted.
        if (request.Bio is not null)
        {
            user.Bio = request.Bio;
        }

        await _userManager.UpdateAsync(user);
        return new ProfileUpdateResult(ProfileUpdateOutcome.Success, ToResponse(user), null);
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(
        string userId, ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new ChangePasswordResult(ChangePasswordOutcome.UserNotFound, "user not found");
        }

        // Confirmation check happens BEFORE we touch the stored password, so a typo never leaves the
        // account in a half-changed state.
        if (!string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
        {
            return new ChangePasswordResult(ChangePasswordOutcome.Mismatch, "passwords do not match");
        }

        // Validate the new password against the SAME policy used at registration BEFORE removing the
        // old one. Doing it in this order guarantees we never remove a working password only to fail
        // adding the replacement — the account is never left with no password (research.md Decision 8).
        foreach (var validator in _userManager.PasswordValidators)
        {
            var validation = await validator.ValidateAsync(_userManager, user, request.NewPassword);
            if (!validation.Succeeded)
            {
                var message = string.Join(" ", validation.Errors.Select(e => e.Description));
                return new ChangePasswordResult(ChangePasswordOutcome.PolicyFailed, message);
            }
        }

        // No current-password argument by design: remove the existing hash, then add the new one.
        await _userManager.RemovePasswordAsync(user);
        var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
        if (!addResult.Succeeded)
        {
            var message = string.Join(" ", addResult.Errors.Select(e => e.Description));
            return new ChangePasswordResult(ChangePasswordOutcome.PolicyFailed, message);
        }

        return new ChangePasswordResult(ChangePasswordOutcome.Success, null);
    }

    private static ProfileResponse ToResponse(ApplicationUser user) =>
        new(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty, user.DisplayName, user.Bio);
}
