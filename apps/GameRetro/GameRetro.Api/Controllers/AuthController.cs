using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GameRetro.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(request, cancellationToken);

        return result.Outcome switch
        {
            RegisterOutcome.Success => StatusCode(StatusCodes.Status201Created, result.Account),
            RegisterOutcome.EmailAlreadyInUse => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage }),
        };
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);

        return result.Outcome switch
        {
            LoginOutcome.Success => Ok(result.Token),
            _ => Unauthorized(new { message = result.ErrorMessage }),
        };
    }

    [HttpGet("admin-check")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminCheck()
    {
        return Ok(new { message = "admin access confirmed" });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return NoContent();
    }
}
