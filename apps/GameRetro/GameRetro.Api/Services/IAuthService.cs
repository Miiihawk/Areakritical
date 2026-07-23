using GameRetro.Api.DTOs.Requests;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public enum RegisterOutcome
{
    Success,
    EmailAlreadyInUse,
    PasswordPolicyFailed,
}

public sealed record RegisterResult(RegisterOutcome Outcome, AuthAccountResponse? Account, string? ErrorMessage);

public enum LoginOutcome
{
    Success,
    InvalidCredentials,
}

public sealed record LoginResult(LoginOutcome Outcome, AuthTokenResponse? Token, string? ErrorMessage);

public interface IAuthService
{
    Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);

    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
