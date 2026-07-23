using System.Text;
using GameRetro.Api.Data;
using GameRetro.Api.Middleware;
using GameRetro.Api.Models;
using GameRetro.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services
    .AddControllers()
    // Serialize/deserialize enums as their names ("Spam", "Open") instead of raw numbers, so a
    // request body like { "reason": "Harassment" } binds correctly and responses are human-readable.
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddSwaggerGen();

// Shape DTO validation failures (from [ApiController] model binding) into the same
// { "message": ... } error contract the controllers use (contracts/auth-api.md).
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = context.ModelState.Values
            .SelectMany(entry => entry.Errors)
            .Select(error => error.ErrorMessage)
            .FirstOrDefault(errorMessage => !string.IsNullOrWhiteSpace(errorMessage))
            ?? "invalid request";

        return new BadRequestObjectResult(new { message });
    };
});

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AuthDb")));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireDigit = false;
    })
    .AddEntityFrameworkStores<AuthDbContext>()
    .AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey ?? string.Empty)),
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();

builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IGameLibraryService, GameLibraryService>();

// Feature 002 (Game Reviews & Community Moderation) services. All Scoped, matching the DbContext
// lifetime, so each request gets a fresh instance sharing that request's DbContext.
builder.Services.AddScoped<IGameDetailService, GameDetailService>();      // US1
builder.Services.AddScoped<IGameRankingService, GameRankingService>();    // Ranking page
builder.Services.AddScoped<IReviewService, ReviewService>();              // US2/US3
builder.Services.AddScoped<ICommentService, CommentService>();            // US4/US5
builder.Services.AddScoped<IProfileService, ProfileService>();            // US6
builder.Services.AddScoped<IReportService, ReportService>();             // US7/US8
builder.Services.AddScoped<IUserAdminService, UserAdminService>();        // US8
builder.Services.AddScoped<IGameModerationService, GameModerationService>(); // US8

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await AdminSeeder.SeedAsync(scope.ServiceProvider);
}

// Configure the HTTP request pipeline.

// Outermost middleware: turns any unhandled downstream exception into the standard
// { "message": ... } error contract instead of leaking a stack trace.
app.UseExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS redirection only outside Development: the SPA reaches this API through Vite's HTTP proxy
// (http://localhost:5121), and when the "https" launch profile is active this middleware would
// 307-redirect those calls to https://localhost:7180 — a cross-origin hop the browser blocks
// (no CORS policy), which surfaces in the frontend as "Cannot reach the server".
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
