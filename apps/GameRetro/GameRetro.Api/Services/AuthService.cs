using GameRetro.Api.Models;
using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;
using Microsoft.AspNetCore.Identity;

namespace GameRetro.Api.Services;

public sealed class AuthService : IAuthService
{
    private const string AuthorRole = "Author";
    private const string InvalidCredentialsMessage = "invalid email or password";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ITokenService _tokenService;

    public AuthService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, ITokenService tokenService)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _tokenService = tokenService;
    }

    public async Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return new RegisterResult(RegisterOutcome.EmailAlreadyInUse, null, "email already in use");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            var errorMessage = string.Join(" ", createResult.Errors.Select(e => e.Description));
            return new RegisterResult(RegisterOutcome.PasswordPolicyFailed, null, errorMessage);
        }

        if (!await _roleManager.RoleExistsAsync(AuthorRole))
        {
            await _roleManager.CreateAsync(new IdentityRole(AuthorRole));
        }

        await _userManager.AddToRoleAsync(user, AuthorRole);

        var account = new AuthAccountResponse(user.Id, user.Email!, AuthorRole);
        return new RegisterResult(RegisterOutcome.Success, account, null);
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return new LoginResult(LoginOutcome.InvalidCredentials, null, InvalidCredentialsMessage);
        }

        // Cross-feature rule (feature 002, FR-018c): an Admin can deactivate an account. A deactivated
        // account must not be able to log in even with the correct password. We return the SAME generic
        // invalid-credentials response as a wrong password — deliberately not revealing that the account
        // exists but is switched off, so this endpoint never leaks account state (research.md Decision 6).
        if (user.IsDeactivated)
        {
            return new LoginResult(LoginOutcome.InvalidCredentials, null, InvalidCredentialsMessage);
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? AuthorRole;

        var token = await _tokenService.GenerateTokenAsync(user, role, cancellationToken);
        return new LoginResult(LoginOutcome.Success, token, null);
    }
}
