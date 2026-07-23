using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

/// <summary>
/// A thin base class shared by the feature's controllers. It pulls the signed-in user's id and role
/// out of the validated JWT so each controller doesn't repeat that plumbing.
///
/// Mentor note — where these values come from: at login, <see cref="Services.TokenService"/> stamps
/// the user's id into the token's "sub" claim and their role into the "role" claim. ASP.NET's JWT
/// middleware validates the token on every request and exposes those claims on <see cref="User"/>,
/// so reading them here is just reading already-verified data — no database hit needed.
/// </summary>
public abstract class AppControllerBase : ControllerBase
{
    /// <summary>The signed-in account's id (the "sub" claim, surfaced as NameIdentifier).</summary>
    protected string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>True when the caller holds the Admin role.</summary>
    protected bool IsAdmin => User.IsInRole("Admin");
}
