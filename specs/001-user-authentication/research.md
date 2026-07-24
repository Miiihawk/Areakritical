# Research: User Authentication

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-20

This document resolves the technical unknowns needed to plan the User Authentication
feature against the existing stack (`docs/techstack.md`: ASP.NET Core 9.0, EF Core 9.0,
SQL Server LocalDb, React + Vite) and the greenfield state of `apps/GameRetro/GameRetro.Api`
(no auth, no DbContext yet) and `apps/react-frontend` (bare Vite/React scaffold, no auth UI).

## Decision 1: Identity & password storage

**Decision**: Use ASP.NET Core Identity (`Microsoft.AspNetCore.Identity.EntityFrameworkCore`)
backed by EF Core / SQL Server LocalDb for user accounts, password hashing, and role
storage, rather than hand-rolling password hashing or a custom user table.

**Rationale**: Identity's `PasswordHasher` implements PBKDF2 with per-user salts out of the
box, satisfying FR-012 (no plain-text passwords) without custom cryptography code. It also
ships built-in `IdentityRole`/`UserManager`/`RoleManager` APIs that map directly onto the
spec's two-role model (Admin, Author), and it is the de-facto standard pairing with EF Core
9 already mandated by the constitution's Technology Stack Constraints.

**Alternatives considered**:
- Hand-rolled hashing (e.g., raw `Rfc2898DeriveBytes` calls) — rejected: reinvents a solved
  problem, more surface area for mistakes, no benefit over Identity for this scope.
- Third-party auth-as-a-service (Auth0, Firebase Auth) — rejected: introduces an external
  dependency/cost and network call for a student project that must also pre-seed a local
  Admin account under source control's control; conflicts with "small student-team project"
  simplicity guidance in the constitution.

## Decision 2: Session mechanism between the SPA and the API

**Decision**: Stateless JWT bearer tokens issued on successful login, returned in the
response body, and sent by the frontend as an `Authorization: Bearer <token>` header on
subsequent requests. No refresh-token flow; access tokens have a fixed expiry (60 minutes)
and the user must log in again afterward, which satisfies FR-013 without adding
refresh-token complexity.

**Rationale**: The backend (`GameRetro.Api`) and frontend (`react-frontend`) are separate
projects/origins (API host vs. Vite dev server), so cookie-based sessions would require
`SameSite=None; Secure` cookies plus CORS credentialed requests — extra configuration for
a two-role student project with no stated cross-subdomain or multi-tab requirement. A
bearer token kept in frontend memory (not `localStorage`, to reduce XSS exposure) avoids
CORS/cookie complexity while still meeting every functional requirement (login, logout,
role-scoped access, session invalidation on logout by discarding the token client-side).

**Alternatives considered**:
- Cookie-based session (ASP.NET Core cookie auth) — rejected for this feature: adds
  CORS/cookie-attribute configuration overhead not justified by the spec's scope; may be
  revisited later if cross-site or SSR requirements emerge.
- JWT refresh-token rotation — rejected: the spec has no requirement for silent
  re-authentication or "remember me," and refresh-token storage/rotation is exactly the
  kind of added complexity Principle I (YAGNI) tells us to avoid absent present need.

## Decision 3: Role representation

**Decision**: Use ASP.NET Core Identity's built-in role system (`IdentityRole`) with exactly
two seeded roles: `Admin` and `Author`. The JWT includes a `role` claim so the API can
authorize with the standard `[Authorize(Roles = "Admin")]` attribute and the SPA can read
the same claim (decoded client-side) to conditionally render Admin-only UI.

**Rationale**: Matches FR-008 (exactly two roles) and reuses framework-native role
authorization instead of a custom permissions table, keeping the implementation as simple
as the spec requires (Principle I, YAGNI).

**Alternatives considered**:
- A generic permissions/claims table for future extensibility — rejected: no current
  requirement beyond two fixed roles; would be premature abstraction per the constitution.

## Decision 4: Admin pre-seeding mechanism

**Decision**: A dedicated, idempotent seeding routine (`AdminSeeder`) runs on application
startup (in `Program.cs`, after `app.Build()` and before `app.Run()`, inside a scoped
service resolution). It reads the seeded Admin's email and password from configuration
(`appsettings`/environment variables — e.g., `SeedAdmin:Email`, `SeedAdmin:Password`, with
environment variables overriding `appsettings` per ASP.NET Core's standard configuration
precedence), and only creates the Admin account if no account with that email (or no
account in the `Admin` role) already exists. Running it again on every subsequent startup
is a no-op once the Admin exists, satisfying FR-011.

**Rationale**: Startup-time seeding is the simplest mechanism that runs automatically "before
deployment" traffic is served, requires no separate CLI tooling, and is naturally idempotent
when guarded by an existence check — matching FR-010/FR-011 and the constitution's
async-friendly startup patterns. Keeping credentials in configuration (not hardcoded)
lets each environment (local LocalDb vs. any later deployment target) use different seeded
credentials, per the spec's Assumptions.

**Alternatives considered**:
- A one-off CLI/migration script run manually by a developer — rejected: easy to forget
  before a deploy, and harder to guarantee idempotency across environments than an
  automatic startup check.
- Hardcoding the Admin credentials in source — rejected: explicitly contradicts the spec's
  Assumptions (credentials must be configurable per environment) and is a security smell.

## Decision 5: Backend testing approach

> **Superseded (2026-07-22)**: This project no longer ships an automated test suite. Per
> Constitution v2.0.0 (Principle II — Validation Standards), backend behavior is verified
> manually/functionally against a running API (HTTP calls to register/login/logout), not
> with xUnit / `WebApplicationFactory`. No `GameRetro.Api.Tests` project exists. The
> original decision is kept below for historical context only.

**Original decision**: xUnit for unit tests of the auth service/token logic, plus ASP.NET
Core's `WebApplicationFactory<Program>` for integration tests of the register/login/logout
endpoints against an in-memory or LocalDb test database, in a `GameRetro.Api.Tests` project.

## Decision 6: Frontend testing approach

> **Superseded (2026-07-22)**: This project no longer ships automated frontend tests. Per
> Constitution v2.0.0, the registration/login/logout flows and the route guard are verified
> manually against the running dev server. Vitest / React Testing Library and their config
> and dependencies have been removed. The original decision is kept below for context only.

**Original decision**: Vitest + React Testing Library for the registration/login/logout
forms and the authenticated-route guard, as new dev dependencies to `apps/react-frontend`.

## Summary of resolved unknowns

| Technical Context field | Resolution |
|---|---|
| Language/Version | C# / .NET 9 (backend); TypeScript + React 19 (frontend) |
| Primary Dependencies | ASP.NET Core Identity, EF Core 9 (SQL Server provider), JWT Bearer authentication (backend); native `fetch` (frontend, no new HTTP client dependency) |
| Storage | SQL Server LocalDb via EF Core migrations |
| Testing | None — manual/functional verification only (Constitution v2.0.0); no test project or test tooling |
| Target Platform | Web: ASP.NET Core Web API + browser-based React SPA |
| Project Type | Web application (frontend + backend, existing `apps/` layout) |
| Performance Goals | Auth endpoints respond well under interactive-use latency (consistent with Principle IV: async I/O, `CancellationToken` support, no blocking calls) |
| Constraints | No plain-text password storage; no forgot-password flow; exactly two roles; async/await throughout; Admin never created via public registration |
| Scale/Scope | Small student-project scale (tens–hundreds of accounts, single API instance); no stated high-concurrency requirement |

No `NEEDS CLARIFICATION` markers remain in the Technical Context.
