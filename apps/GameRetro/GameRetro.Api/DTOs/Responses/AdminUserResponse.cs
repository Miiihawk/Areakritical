namespace GameRetro.Api.DTOs.Responses;

/// <summary>
/// One account row in the Admin user-management list. <see cref="Role"/> is the account's single
/// current role; <see cref="IsDeactivated"/> tells the Admin UI whether to show "reactivate" instead
/// of "deactivate".
/// </summary>
public sealed record AdminUserResponse(
    string Id,
    string Username,
    string Email,
    string Role,
    bool IsDeactivated,
    DateTime CreatedAt);
