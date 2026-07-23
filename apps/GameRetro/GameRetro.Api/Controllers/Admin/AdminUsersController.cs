using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers.Admin;

/// <summary>
/// Admin account management (User Story 8). The class-level <c>[Authorize(Roles = "Admin")]</c> is the
/// single gate that satisfies FR-018 for every action here — a non-Admin never reaches the method
/// bodies, they get a 403 from the framework first.
/// </summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public sealed class AdminUsersController : AppControllerBase
{
    private readonly IUserAdminService _userAdminService;

    public AdminUsersController(IUserAdminService userAdminService)
    {
        _userAdminService = userAdminService;
    }

    /// <summary>GET /api/admin/users — list all accounts.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var users = await _userAdminService.ListAsync(cancellationToken);
        return Ok(users);
    }

    /// <summary>PUT /api/admin/users/{userId}/role — change an account's role.</summary>
    [HttpPut("{userId}/role")]
    public async Task<IActionResult> ChangeRole(
        string userId, [FromBody] UserRoleUpdateRequest request, CancellationToken cancellationToken)
    {
        var result = await _userAdminService.ChangeRoleAsync(userId, request.Role, cancellationToken);

        return result.Outcome switch
        {
            UserAdminOutcome.Success => Ok(result.User),
            UserAdminOutcome.InvalidRole => BadRequest(new { message = result.ErrorMessage }),
            _ => NotFound(new { message = "user not found" }),
        };
    }

    /// <summary>PUT /api/admin/users/{userId}/status — deactivate/reactivate an account.</summary>
    [HttpPut("{userId}/status")]
    public async Task<IActionResult> SetStatus(
        string userId, [FromBody] UserStatusUpdateRequest request, CancellationToken cancellationToken)
    {
        var result = await _userAdminService.SetDeactivatedAsync(
            userId, request.IsDeactivated, cancellationToken);

        return result.Outcome switch
        {
            UserAdminOutcome.Success => Ok(result.User),
            _ => NotFound(new { message = "user not found" }),
        };
    }

    /// <summary>DELETE /api/admin/users/{userId} — delete an account and its content.</summary>
    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete(string userId, CancellationToken cancellationToken)
    {
        var result = await _userAdminService.DeleteAsync(userId, cancellationToken);

        return result.Outcome switch
        {
            UserAdminOutcome.Success => NoContent(),
            _ => NotFound(new { message = "user not found" }),
        };
    }
}
