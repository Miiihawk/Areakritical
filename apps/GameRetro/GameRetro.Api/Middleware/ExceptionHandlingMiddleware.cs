using System.Net;
using System.Text.Json;
using GameRetro.Api.Services;

namespace GameRetro.Api.Middleware;

/// <summary>
/// Catches any unhandled exception from downstream middleware/endpoints, logs it with full
/// detail, and returns the same { "message": ... } error shape the rest of the API uses
/// (contracts/auth-api.md) instead of leaking a stack trace to the client.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unhandled exception processing {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            // If the response has already begun streaming we cannot rewrite it; let it bubble.
            if (context.Response.HasStarted)
            {
                throw;
            }

            // A missing-configuration error carries a client-safe message (no secrets), so we
            // surface it as 503; everything else stays an opaque 500.
            var (statusCode, message) = exception is GameLibraryNotConfiguredException notConfigured
                ? ((int)HttpStatusCode.ServiceUnavailable, notConfigured.Message)
                : ((int)HttpStatusCode.InternalServerError, "an unexpected error occurred");

            context.Response.Clear();
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var payload = JsonSerializer.Serialize(new { message });
            await context.Response.WriteAsync(payload);
        }
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
