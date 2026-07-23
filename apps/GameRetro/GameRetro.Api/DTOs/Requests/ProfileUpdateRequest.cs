namespace GameRetro.Api.DTOs.Requests;

/// <summary>
/// Body for editing your own profile (FR-014). Both fields are optional/nullable: sending null means
/// "leave it as-is". An explicitly-submitted BLANK display name, however, is a validation error
/// (checked in <see cref="Services.ProfileService"/>) — you may clear it by omitting it, not by
/// blanking it.
/// </summary>
public sealed class ProfileUpdateRequest
{
    public string? DisplayName { get; set; }

    public string? Bio { get; set; }
}
