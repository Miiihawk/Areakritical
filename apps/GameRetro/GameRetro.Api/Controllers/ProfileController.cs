using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>
/// The caller's own profile (User Story 6). Every action operates on <see cref="AppControllerBase.CurrentUserId"/>
/// — a user can only ever read/edit their OWN profile here, so there is no id in the route.
/// </summary>
[ApiController]
[Route("api/profile")]
[Authorize] // FR-022: signed-in users only.
public sealed class ProfileController : AppControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>GET /api/profile — read my profile.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetAsync(CurrentUserId, cancellationToken);
        return profile is null ? NotFound(new { message = "user not found" }) : Ok(profile);
    }

    /// <summary>PUT /api/profile — update my display name / bio.</summary>
    [HttpPut]
    public async Task<IActionResult> Update(
        [FromBody] ProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        var result = await _profileService.UpdateAsync(CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            ProfileUpdateOutcome.Success => Ok(result.Profile),
            ProfileUpdateOutcome.DisplayNameBlank => BadRequest(new { message = result.ErrorMessage }),
            _ => NotFound(new { message = result.ErrorMessage }),
        };
    }

    /// <summary>POST /api/profile/password — change my password (new + confirm, no current password).</summary>
    [HttpPost("password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _profileService.ChangePasswordAsync(CurrentUserId, request, cancellationToken);

        return result.Outcome switch
        {
            ChangePasswordOutcome.Success => NoContent(),
            // Both a mismatch and a policy failure are 400s with an explanatory message.
            ChangePasswordOutcome.Mismatch => BadRequest(new { message = result.ErrorMessage }),
            ChangePasswordOutcome.PolicyFailed => BadRequest(new { message = result.ErrorMessage }),
            _ => NotFound(new { message = result.ErrorMessage }),
        };
    }
}
