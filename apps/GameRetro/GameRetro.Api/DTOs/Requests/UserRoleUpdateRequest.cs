using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for changing an account's role (FR-018a). The exact allowed values ("Admin"/"Author") are
/// validated in <see cref="Services.UserAdminService"/>, which also enforces the "exactly one role"
/// invariant by swapping the account out of its old role and into the new one.
/// </summary>
public sealed class UserRoleUpdateRequest
{
    [Required(ErrorMessage = "a role is required")]
    public string Role { get; set; } = string.Empty;
}
