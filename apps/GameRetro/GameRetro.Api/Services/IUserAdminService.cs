using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

/// <summary>Outcome of an Admin action on an account.</summary>
public enum UserAdminOutcome
{
    Success,       // → 200 / 204
    InvalidRole,   // → 400: requested role isn't "Admin" or "Author".
    UserNotFound,  // → 404
}

public sealed record UserAdminResult(UserAdminOutcome Outcome, AdminUserResponse? User, string? ErrorMessage);

public interface IUserAdminService
{
    /// <summary>Lists all accounts with their single current role and deactivation state.</summary>
    Task<IReadOnlyList<AdminUserResponse>> ListAsync(CancellationToken cancellationToken);

    /// <summary>Swaps an account between the "Author" and "Admin" roles (FR-008/FR-018a).</summary>
    Task<UserAdminResult> ChangeRoleAsync(string userId, string role, CancellationToken cancellationToken);

    /// <summary>Turns an account off/on (FR-018c). A deactivated account cannot log in.</summary>
    Task<UserAdminResult> SetDeactivatedAsync(
        string userId, bool isDeactivated, CancellationToken cancellationToken);

    /// <summary>Deletes an account and all of its authored content (FR-018d).</summary>
    Task<UserAdminResult> DeleteAsync(string userId, CancellationToken cancellationToken);
}
