namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for deactivating/reactivating an account (FR-018c). <c>true</c> switches the account off (it
/// can no longer log in — enforced in <see cref="Services.AuthService"/>); <c>false</c> switches it
/// back on.
/// </summary>
public sealed class UserStatusUpdateRequest
{
    public bool IsDeactivated { get; set; }
}
