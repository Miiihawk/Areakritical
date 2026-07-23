using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GameRetro.Api.Models;
using GameRetro.Api.DTOs.Responses;
using Microsoft.IdentityModel.Tokens;

namespace GameRetro.Api.Services;

public sealed class TokenService : ITokenService
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(60);

    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<AuthTokenResponse> GenerateTokenAsync(ApplicationUser user, string role, CancellationToken cancellationToken)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? string.Empty));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAtUtc = DateTime.UtcNow.Add(TokenLifetime);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Task.FromResult(new AuthTokenResponse(tokenString, role, expiresAtUtc));
    }
}
