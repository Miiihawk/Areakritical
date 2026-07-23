using GameRetro.Api.Data;
using GameRetro.Api.DTOs.Responses;
using GameRetro.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Services;

/// <summary>
/// Admin account management (User Story 8): list accounts, change a role, deactivate/reactivate, and
/// delete. This service is where the "deleting an account takes its content with it" rule (FR-018d)
/// is made explicit — rather than a hidden database cascade, we delete the account's reviews and
/// comments in code so the chain of effects is right here to read.
/// </summary>
public sealed class UserAdminService : IUserAdminService
{
    private const string AdminRole = "Admin";
    private const string AuthorRole = "Author";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AuthDbContext _db;

    public UserAdminService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        AuthDbContext db)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _db = db;
    }

    public async Task<IReadOnlyList<AdminUserResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var users = await _userManager.Users.AsNoTracking().ToListAsync(cancellationToken);

        var result = new List<AdminUserResponse>(users.Count);
        foreach (var user in users)
        {
            // Each account has exactly one role in this app; read it via Identity.
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? AuthorRole;

            result.Add(new AdminUserResponse(
                user.Id,
                user.UserName ?? string.Empty,
                user.Email ?? string.Empty,
                role,
                user.IsDeactivated,
                user.CreatedAt));
        }

        return result;
    }

    public async Task<UserAdminResult> ChangeRoleAsync(
        string userId, string role, CancellationToken cancellationToken)
    {
        // Only two roles are valid in this app (FR-008).
        if (role != AdminRole && role != AuthorRole)
        {
            return new UserAdminResult(UserAdminOutcome.InvalidRole, null, "role must be 'Admin' or 'Author'");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new UserAdminResult(UserAdminOutcome.UserNotFound, null, "user not found");
        }

        // Make sure the target role exists as an IdentityRole before assigning it (defensive — the
        // seeder creates both at startup).
        if (!await _roleManager.RoleExistsAsync(role))
        {
            await _roleManager.CreateAsync(new IdentityRole(role));
        }

        // Enforce "exactly one role": strip whatever the account currently has, then add the new one.
        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        await _userManager.AddToRoleAsync(user, role);

        return new UserAdminResult(UserAdminOutcome.Success, await ToResponseAsync(user, role), null);
    }

    public async Task<UserAdminResult> SetDeactivatedAsync(
        string userId, bool isDeactivated, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new UserAdminResult(UserAdminOutcome.UserNotFound, null, "user not found");
        }

        user.IsDeactivated = isDeactivated;
        await _userManager.UpdateAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? AuthorRole;
        return new UserAdminResult(UserAdminOutcome.Success, await ToResponseAsync(user, role), null);
    }

    public async Task<UserAdminResult> DeleteAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new UserAdminResult(UserAdminOutcome.UserNotFound, null, "user not found");
        }

        // FR-018d: deleting an account removes its content too. The Review→Author and Comment→Author
        // FKs are Restrict at the database level (see AuthDbContext), so we must clear that content
        // ourselves before the account row can go — doing it here keeps the cascade visible in code.

        // 1) Delete every review this user wrote, WITH the comments underneath them (any author). The
        //    Include lets EF's ClientCascade remove those child comments; reports on them are nulled.
        var authoredReviews = await _db.Reviews
            .Include(r => r.Comments)
            .Where(r => r.AuthorId == userId)
            .ToListAsync(cancellationToken);
        _db.Reviews.RemoveRange(authoredReviews);

        // 2) Delete this user's comments that live under OTHER people's reviews (not covered by step 1).
        var authoredComments = await _db.Comments
            .Where(c => c.AuthorId == userId)
            .ToListAsync(cancellationToken);
        _db.Comments.RemoveRange(authoredComments);

        await _db.SaveChangesAsync(cancellationToken);

        // 3) Now delete the account itself. Reports this user RAISED (Report.ReporterId) are removed by
        //    the one database-level cascade we kept, so no orphaned reports remain.
        await _userManager.DeleteAsync(user);

        return new UserAdminResult(UserAdminOutcome.Success, null, null);
    }

    private Task<AdminUserResponse> ToResponseAsync(ApplicationUser user, string role) =>
        Task.FromResult(new AdminUserResponse(
            user.Id,
            user.UserName ?? string.Empty,
            user.Email ?? string.Empty,
            role,
            user.IsDeactivated,
            user.CreatedAt));
}
