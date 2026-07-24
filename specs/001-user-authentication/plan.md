# Implementation Plan: User Authentication

**Branch**: `001-user-authentication` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-authentication/spec.md`

## Summary

Add authentication to the existing GameRetro application: a public registration page that
creates "Author" accounts only, a login flow shared by Author and Admin accounts, logout,
and role-scoped access to Admin-only areas. No forgot-password/reset flow. At least one
Admin account is created by an idempotent, configuration-driven seeding routine that runs
independently of (and is unreachable from) the public registration page. Technical approach:
ASP.NET Core Identity (EF Core-backed) for credential storage and password hashing, JWT
bearer tokens issued at login for the separate React SPA to call the API, and a startup-time
`AdminSeeder` guarded by an existence check.

## Technical Context

**Language/Version**: C# / .NET 9 (backend, `apps/GameRetro/GameRetro.Api`); TypeScript +
React 19 with Vite (frontend, `apps/react-frontend`)

**Primary Dependencies**: ASP.NET Core Identity
(`Microsoft.AspNetCore.Identity.EntityFrameworkCore`), EF Core 9 SQL Server provider
(`Microsoft.EntityFrameworkCore.SqlServer`), JWT bearer authentication
(`Microsoft.AspNetCore.Authentication.JwtBearer`) on the backend; native `fetch` on the
frontend (no new HTTP client dependency)

**Storage**: SQL Server LocalDb via EF Core Code-First migrations (new `AuthDbContext`,
`AspNetUsers`/`AspNetRoles` Identity tables)

**Testing**: No automated test suite (per Constitution v2.0.0, Principle II — Validation
Standards). Behavior is verified manually/functionally: backend endpoints via a running
API + HTTP calls, frontend via the running dev server. No test project or test tooling is
included.

**Target Platform**: Web — ASP.NET Core Web API served over HTTPS, consumed by a
browser-based React SPA

**Project Type**: Web application (frontend + backend), using the existing `apps/` layout —
no new top-level structure needed

**Performance Goals**: Auth endpoints (register/login/logout) respond promptly under normal
interactive load; no specific req/s target was given in the spec, so the bar is Constitution
Principle IV (async I/O throughout, `CancellationToken` honored, no blocking calls on the
request path)

**Constraints**: Passwords never stored/transmitted in plain text (FR-012); no
forgot-password/reset capability (FR-009); exactly two roles, Admin and Author (FR-008);
public registration path can never produce an Admin account (FR-004); Admin seeding must be
safe to re-run without duplicating the Admin account (FR-011)

**Scale/Scope**: Small student-project scale (tens–hundreds of accounts, single API
instance); no high-concurrency or multi-region requirement stated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality | Auth logic lives in an injected `AuthService`/Identity `UserManager`/`SignInManager`, not in controllers; controllers stay thin (map request → service call → response). React auth state/logic lives in a dedicated `useAuth` hook / auth context, not duplicated per component. No custom permissions abstraction beyond the two Identity roles the spec actually asks for (YAGNI). | PASS |
| II. Validation Standards | No automated tests required (Constitution v2.0.0). Each service method (register, login, logout, admin seeding idempotency) and each frontend flow (register/login/logout, role guard) is verified manually against a running API + dev server before being considered done. | PASS |
| III. User Experience Consistency | Registration/login forms must handle loading, empty, and error states explicitly (matches existing `isLoading`/`errorMessage` pattern); API returns FR-006-mandated generic invalid-credentials message with a matching 4xx status (401), and 400 for validation failures (e.g., weak password, duplicate email), 201 for successful registration. | PASS |
| IV. Performance Requirements | All Identity/EF Core calls in the auth path use async APIs (`RegisterAsync`-style calls, `FindByEmailAsync`, etc.); endpoints accept and honor `CancellationToken`; no unbounded queries are introduced (auth endpoints act on a single account, not a collection). | PASS |

No violations identified. Complexity Tracking is not needed for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-authentication/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── auth-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
├── GameRetro/
│   ├── GameRetro.slnx
│   ├── GameRetro.Api/
│   │   ├── Program.cs                      # add Identity, JWT auth, AdminSeeder call
│   │   ├── appsettings.json                # add SeedAdmin + Jwt config sections
│   │   ├── Controllers/
│   │   │   └── AuthController.cs           # register / login / logout endpoints
│   │   ├── Data/
│   │   │   ├── AuthDbContext.cs            # IdentityDbContext<ApplicationUser>
│   │   │   └── AdminSeeder.cs              # idempotent startup seeding (FR-010/FR-011)
│   │   ├── Middleware/
│   │   │   └── ExceptionHandlingMiddleware.cs  # unhandled errors -> { "message": ... } (Principle III)
│   │   ├── Models/
│   │   │   └── ApplicationUser.cs          # IdentityUser subclass (persisted domain entity)
│   │   ├── DTOs/                            # request/response DTOs (project-root folder)
│   │   │   ├── Requests/                   # RegisterRequest, LoginRequest (+ DataAnnotations validation)
│   │   │   └── Responses/                  # AuthAccountResponse, AuthTokenResponse
│   │   └── Services/
│   │       ├── IAuthService.cs
│   │       ├── AuthService.cs               # register/login orchestration over Identity
│   │       ├── ITokenService.cs
│   │       └── TokenService.cs              # JWT issuing
│   (no test project — validation is manual/functional, per Constitution v2.0.0)
└── react-frontend/
    └── src/
        ├── auth/
        │   ├── AuthContext.tsx              # holds in-memory token + role, exposes login/logout
        │   ├── useAuth.ts
        │   └── RequireRole.tsx              # route guard for Admin-only areas
        ├── pages/
        │   ├── RegisterPage.tsx
        │   └── LoginPage.tsx
        └── services/
            └── authApi.ts                   # fetch wrappers for register/login/logout
```

**Structure Decision**: This is a web application with an existing separate frontend/backend
layout (`apps/GameRetro/GameRetro.Api` + `apps/react-frontend`), so the feature slots new
files into that existing structure rather than introducing a new top-level layout. No test
project is included: per Constitution v2.0.0 (Principle II — Validation Standards), behavior
is verified manually/functionally rather than with an automated test suite.

## Complexity Tracking

> No entries — Constitution Check reported no violations.
