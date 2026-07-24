# Quickstart: Validating User Authentication

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/auth-api.md](./contracts/auth-api.md) | **Data model**: [data-model.md](./data-model.md)

This guide validates the feature end-to-end once implemented. It does not include
implementation code — see `tasks.md` for build tasks.

## Prerequisites

- .NET 9 SDK installed
- SQL Server LocalDb available (ships with Visual Studio / SQL Server Express LocalDB)
- Node.js (matching `apps/react-frontend`'s toolchain) for the frontend
- Backend `appsettings.Development.json` (or environment variables) configured with:
  - `ConnectionStrings:AuthDb` pointing at LocalDb
  - `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience` (token signing config)
  - `SeedAdmin:Email`, `SeedAdmin:Password` (the pre-seeded Admin's credentials for this
    environment — see research.md Decision 4)

## Setup

```powershell
cd apps/GameRetro/GameRetro.Api
dotnet ef database update   # applies Identity + auth migrations to LocalDb
dotnet run                  # AdminSeeder runs automatically on startup (FR-010)
```

```powershell
cd apps/react-frontend
npm install
npm run dev
```

## Scenario 1 — Admin exists before any user ever registers (FR-010, FR-011)

1. With the database freshly migrated (no data), start the API (`dotnet run`).
2. Call `POST /api/auth/login` with the `SeedAdmin` credentials from configuration.
3. **Expected**: `200 OK` with `"role": "Admin"` in the response — confirms the seeded
   Admin exists without ever visiting the public registration page.
4. Stop and restart the API (simulate a redeploy).
5. Repeat step 2.
6. **Expected**: still exactly one Admin account, still logs in successfully (idempotent
   seeding — FR-011, SC-003).

## Scenario 2 — Public self-registration only ever produces an Author (FR-001, FR-004)

1. `POST /api/auth/register` with a new, unused email and a compliant password.
2. **Expected**: `201 Created`, `"role": "Author"` in the response body.
3. Repeat step 1 with the same email.
4. **Expected**: `409 Conflict`, "email already in use" (FR-002).
5. Attempt `POST /api/auth/register` with a body that includes `"role": "Admin"` (or any
   other attempt to elevate the role).
6. **Expected**: `201 Created` still yields `"role": "Author"` — the elevated role is
   ignored (SC-002).

## Scenario 3 — Login rejects invalid credentials indistinguishably (FR-006, SC-004)

1. `POST /api/auth/login` with an email that has never been registered.
2. **Expected**: `401 Unauthorized`, `{ "message": "invalid email or password" }`.
3. `POST /api/auth/login` with a registered email and a wrong password.
4. **Expected**: identical `401` response body/wording as step 2.

## Scenario 4 — Logout ends the session (FR-007, SC-005)

1. Log in as any account; capture the returned token.
2. Call an authenticated endpoint (or `POST /api/auth/logout`) with the token — expect
   success.
3. In the frontend, trigger logout (discards the in-memory token).
4. Attempt to call an authenticated endpoint from the frontend again without re-entering
   credentials.
5. **Expected**: the frontend has no token to send and redirects to the login page /
   surfaces an unauthenticated state, rather than silently failing.

## Scenario 5 — Admin-only areas reject Author accounts (FR-008, User Story 3)

1. Log in as an Author; capture the token.
2. Call an Admin-only endpoint with the Author's token.
3. **Expected**: `403 Forbidden`.
4. Log in as the seeded Admin; call the same endpoint.
5. **Expected**: success (200-series response).

## Frontend UX checks (Constitution Principle III)

- Registration/login forms show a visible loading state while the request is in flight.
- On error (network failure, 400, 401, 409), the form shows the field-appropriate message
  from the API's `message` field — not a raw stack trace or generic browser error.
- After a successful login, the Admin/Author distinction is reflected in the UI (e.g.,
  Admin-only navigation only appears for Admin accounts).
