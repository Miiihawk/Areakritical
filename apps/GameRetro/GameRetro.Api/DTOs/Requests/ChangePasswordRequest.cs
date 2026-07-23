using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for changing your own password (FR-014a/FR-014b). By deliberate design (per the spec's
/// clarification) there is NO current-password field — the service uses Identity's
/// RemovePasswordAsync + AddPasswordAsync pair, which does not require the old password. The service
/// checks that the two values match before touching the stored password at all.
/// </summary>
public sealed class ChangePasswordRequest
{
    [Required(ErrorMessage = "a new password is required")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "please confirm the new password")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}
