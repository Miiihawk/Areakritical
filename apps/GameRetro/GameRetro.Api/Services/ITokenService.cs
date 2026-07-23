using GameRetro.Api.Models;
using GameRetro.Api.DTOs.Responses;

namespace GameRetro.Api.Services;

public interface ITokenService
{
    Task<AuthTokenResponse> GenerateTokenAsync(ApplicationUser user, string role, CancellationToken cancellationToken);
}
