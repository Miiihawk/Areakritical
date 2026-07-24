---

description: "Task list template for feature implementation"
---

# Tasks: User Authentication

**Input**: Design documents from `/specs/001-user-authentication/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth-api.md](./contracts/auth-api.md), [quickstart.md](./quickstart.md)

**Tests**: Removed (2026-07-22). This project ships **no automated test suite** — per
Constitution v2.0.0 (Principle II — Validation Standards), behavior is verified
manually/functionally instead. All test tasks below are struck through (`~~T0NN~~`) and
their deliverables (the `GameRetro.Api.Tests` project, the `*.test.tsx` files, Vitest, and
the test tooling) have been deleted. Task IDs are retained for historical traceability.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and manual verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every description

## Path Conventions

Web app layout, per [plan.md](./plan.md)'s Project Structure:
- Backend: `apps/GameRetro/GameRetro.Api/` (no separate test project — removed 2026-07-22)
- Frontend: `apps/react-frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — backend auth dependencies

- ~~T001 Create `apps/GameRetro/GameRetro.Api.Tests` xUnit test project~~ **(REMOVED — no automated tests, per Constitution v2.0.0)**
- [X] T002 [P] Add `Microsoft.AspNetCore.Identity.EntityFrameworkCore`, `Microsoft.EntityFrameworkCore.SqlServer`, and `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet packages to `apps/GameRetro/GameRetro.Api/GameRetro.Api.csproj`
- ~~T003 [P] Add `Microsoft.AspNetCore.Mvc.Testing` and `Microsoft.EntityFrameworkCore.InMemory` test packages~~ **(REMOVED — test project deleted)**
- ~~T004 [P] Add Vitest + React Testing Library dev dependencies and a `test` script~~ **(REMOVED — Vitest/testing-library uninstalled, `test` script and test config stripped)**

**Checkpoint**: Both projects have the packages this feature needs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST exist before any user story can be built

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create `ApplicationUser` (extends `IdentityUser`) in `apps/GameRetro/GameRetro.Api/Models/ApplicationUser.cs` with a `CreatedAt` (UTC) field, per [data-model.md](./data-model.md)
- [X] T006 [P] Create `AuthDbContext : IdentityDbContext<ApplicationUser>` in `apps/GameRetro/GameRetro.Api/Data/AuthDbContext.cs`
- [X] T007 [P] Add `ConnectionStrings:AuthDb`, `Jwt:Key`/`Jwt:Issuer`/`Jwt:Audience`, and `SeedAdmin:Email`/`SeedAdmin:Password` configuration sections to `apps/GameRetro/GameRetro.Api/appsettings.json` and `apps/GameRetro/GameRetro.Api/appsettings.Development.json` (placeholder/dev-only values in the latter, per research.md Decision 4)
- [X] T008 Wire `AddDbContext<AuthDbContext>`, `AddIdentity<ApplicationUser, IdentityRole>`, `AddAuthentication` + JWT Bearer options (reading the `Jwt:*` config from T007), `AddAuthorization`, and `UseAuthentication()`/`UseAuthorization()` (before the existing `app.UseAuthorization()` call) in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T002, T005, T006, T007)
- [X] T009 Generate and apply the initial EF Core Identity migration (`dotnet ef migrations add InitialIdentitySchema` then `dotnet ef database update`) from `apps/GameRetro/GameRetro.Api` (depends on: T008)
- ~~T010 [P] Create a shared `CustomWebApplicationFactory` test fixture~~ **(REMOVED — test project deleted)**
- [X] T011 [P] Create `AuthContext.tsx` + `useAuth.ts` (in-memory token/role state; `login`/`logout`/`register` function slots to be filled by later stories) in `apps/react-frontend/src/auth/`
- [X] T012 [P] Create `RequireRole.tsx` route guard component (renders children only if `useAuth()`'s role matches an allowed-roles prop) in `apps/react-frontend/src/auth/RequireRole.tsx` (depends on: T011)
- [X] T013 [P] Create `authApi.ts` with a shared fetch request helper (base URL, JSON headers, error-body parsing) in `apps/react-frontend/src/services/authApi.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Self-Registration as an Author (Priority: P1) 🎯 MVP

**Goal**: A visitor can create their own account with email + password; the account is
always "Author," never "Admin," even if the request tries to say otherwise.

**Independent Test**: Submit the registration endpoint/form with a unique email + compliant
password → `201` with `role: "Author"`; repeat with the same email → `409`; submit a weak
password → `400`; submit a request that tries to set `role: "Admin"` → still creates an
"Author" account (quickstart.md Scenario 2).

### Tests for User Story 1 — REMOVED (no automated tests, per Constitution v2.0.0)

- ~~T014 [P] [US1] Integration test `POST /api/auth/register` (success/duplicate/weak-password/role-tamper)~~ **(REMOVED)** — behavior verified manually via HTTP calls against the running API.
- ~~T015 [P] [US1] Unit test `AuthService.RegisterAsync`~~ **(REMOVED)**

### Implementation for User Story 1

- [X] T016 [P] [US1] Create `RegisterRequest` DTO (`Email`, `Password`) in `apps/GameRetro/GameRetro.Api/DTOs/Requests/RegisterRequest.cs`
- [X] T017 [P] [US1] Create `AuthAccountResponse` DTO (`Id`, `Email`, `Role`) in `apps/GameRetro/GameRetro.Api/DTOs/Responses/AuthAccountResponse.cs`
- [X] T018 [US1] Configure Identity `PasswordOptions` (minimum length policy, per FR-003) in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T008)
- [X] T019 [US1] Create `IAuthService` interface (`RegisterAsync`, slot for `LoginAsync` added in US2) in `apps/GameRetro/GameRetro.Api/Services/IAuthService.cs`
- [X] T020 [US1] Implement `AuthService.RegisterAsync` — creates the account via `UserManager`, assigns exactly the "Author" role regardless of any role field in the request, returns a duplicate-email or password-policy error where applicable — in `apps/GameRetro/GameRetro.Api/Services/AuthService.cs` (depends on: T005, T006, T016, T017, T019)
- [X] T021 [US1] Create `AuthController` with `POST /api/auth/register` (201/400/409 per contracts/auth-api.md) in `apps/GameRetro/GameRetro.Api/Controllers/AuthController.cs` (depends on: T020)
- [X] T022 [US1] Register `IAuthService`/`AuthService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T020)
- [X] T023 [P] [US1] Create `RegisterPage.tsx` (explicit loading/error/success states per Constitution Principle III; calls `authApi.register`) in `apps/react-frontend/src/pages/RegisterPage.tsx` (depends on: T011)
- [X] T024 [US1] Add `register()` function to `apps/react-frontend/src/services/authApi.ts` (depends on: T013, T021)
- ~~T025 [P] [US1] Write `RegisterPage.test.tsx`~~ **(REMOVED — file deleted)**

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - User Login (Priority: P1)

**Goal**: A registered Author or Admin can sign in with email + password and receive a
role-scoped authenticated state; invalid credentials are rejected with one generic message
regardless of which part was wrong.

**Independent Test**: Log in with a known-valid Author account (created via US1) → `200`
with a token and `role`; log in with a wrong password or an unregistered email → `401` with
the identical generic message in both cases (quickstart.md Scenario 3).

### Tests for User Story 2 — REMOVED (no automated tests, per Constitution v2.0.0)

- ~~T026 [P] [US2] Integration test `POST /api/auth/login` (valid/wrong-password/unknown-email)~~ **(REMOVED)** — verified manually; wrong-password and unknown-email confirmed to return the identical `401` body.
- ~~T027 [P] [US2] Unit test `TokenService.GenerateToken`~~ **(REMOVED)** — JWT claims verified by decoding a real issued token.
- ~~T028 [P] [US2] Unit test `AuthService.LoginAsync`~~ **(REMOVED)**

### Implementation for User Story 2

- [X] T029 [P] [US2] Create `LoginRequest` DTO (`Email`, `Password`) in `apps/GameRetro/GameRetro.Api/DTOs/Requests/LoginRequest.cs`
- [X] T030 [P] [US2] Create `AuthTokenResponse` DTO (`Token`, `Role`, `ExpiresAtUtc`) in `apps/GameRetro/GameRetro.Api/DTOs/Responses/AuthTokenResponse.cs`
- [X] T031 [US2] Create `ITokenService` interface in `apps/GameRetro/GameRetro.Api/Services/ITokenService.cs`
- [X] T032 [US2] Implement `TokenService` (issues a JWT using the `Jwt:*` config from T007, fixed 60-minute expiry, no refresh token per research.md Decision 2) in `apps/GameRetro/GameRetro.Api/Services/TokenService.cs` (depends on: T007, T031)
- [X] T033 [US2] Implement `AuthService.LoginAsync` (`UserManager`/`CheckPasswordAsync`, single generic invalid-credentials error, calls `TokenService` on success) in `apps/GameRetro/GameRetro.Api/Services/AuthService.cs` (depends on: T020, T032)
- [X] T034 [US2] Add `POST /api/auth/login` endpoint (200/400/401 per contracts/auth-api.md) to `apps/GameRetro/GameRetro.Api/Controllers/AuthController.cs` (depends on: T033)
- [X] T035 [US2] Register `ITokenService`/`TokenService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T032)
- [X] T036 [P] [US2] Create `LoginPage.tsx` (explicit loading/error/success states; on success, stores token + role via `useAuth`) in `apps/react-frontend/src/pages/LoginPage.tsx` (depends on: T011)
- [X] T037 [US2] Add `login()` function to `apps/react-frontend/src/services/authApi.ts` (depends on: T013, T034)
- ~~T038 [P] [US2] Write `LoginPage.test.tsx`~~ **(REMOVED — file deleted)**

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Admin Access via Pre-Seeded Account (Priority: P2)

**Goal**: At least one Admin account exists before any public registration happens, seeding
is safe to re-run without duplicating the Admin, and Admin-only areas reject Author accounts.

**Independent Test**: Start the API against a freshly migrated database with no data → the
seeded Admin can log in immediately; restart the API → still exactly one Admin; call an
Admin-only endpoint with an Author's token → `403`; with the Admin's token → success
(quickstart.md Scenarios 1 and 5).

### Tests for User Story 3 — REMOVED (no automated tests, per Constitution v2.0.0)

- ~~T039 [P] [US3] Integration test: fresh DB → exactly one seeded Admin that can log in~~ **(REMOVED)** — verified manually against a running API.
- ~~T040 [P] [US3] Integration test: re-running the seeder creates no duplicate Admin (FR-011)~~ **(REMOVED)** — verified manually by restarting the API and confirming the same Admin `sub`.
- ~~T041 [P] [US3] Integration test: Admin-only endpoint returns `403` for Author, succeeds for Admin~~ **(REMOVED — test only)** — the `admin-check` endpoint (T044) and the `/admin` route (T045) remain; role-gating is verified manually.

### Implementation for User Story 3

- [X] T042 [US3] Implement `AdminSeeder` — idempotent: creates the `Admin`/`Author` roles if missing and creates the seeded Admin user (from `SeedAdmin:*` config) only if no account with that email/role already exists — in `apps/GameRetro/GameRetro.Api/Data/AdminSeeder.cs` (depends on: T005, T006, T007)
- [X] T043 [US3] Invoke `AdminSeeder` from a scoped service resolution after `app.Build()` and before `app.Run()` in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T042)
- [X] T044 [US3] Add a minimal `[Authorize(Roles = "Admin")]`-protected `GET /api/auth/admin-check` endpoint (per contracts/auth-api.md's Admin-only pattern) to `apps/GameRetro/GameRetro.Api/Controllers/AuthController.cs` (depends on: T008)
- [X] T045 [P] [US3] Apply the `RequireRole` guard to a placeholder Admin-only route/section in `apps/react-frontend/src/App.tsx` (depends on: T012)
- ~~T046 [P] [US3] Write `RequireRole.test.tsx`~~ **(REMOVED — file deleted; `RequireRole` component itself is retained)**

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Logout (Priority: P3)

**Goal**: An authenticated user can end their session on demand; afterward the frontend no
longer uses that session to reach authenticated areas.

**Independent Test**: Log in, call logout, then confirm the frontend can no longer reach an
authenticated area without logging in again (quickstart.md Scenario 4).

### Tests for User Story 4 — REMOVED (no automated tests, per Constitution v2.0.0)

- ~~T047 [P] [US4] Integration test `POST /api/auth/logout` (`204` with token, `401` without)~~ **(REMOVED)** — verified manually via HTTP calls.

### Implementation for User Story 4

- [X] T048 [US4] Add `POST /api/auth/logout` endpoint (`[Authorize]`, returns `204`) to `apps/GameRetro/GameRetro.Api/Controllers/AuthController.cs` (depends on: T008)
- [X] T049 [US4] Add `logout()` function to `apps/react-frontend/src/services/authApi.ts` and wire `AuthContext`'s `logout` to clear the in-memory token/role in `apps/react-frontend/src/auth/AuthContext.tsx` (depends on: T011, T013, T048)
- ~~T050 [P] [US4] Write a logout behavior test in `AuthContext.test.tsx`~~ **(REMOVED — file deleted)**

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and hardening across all stories

- [X] T051 [P] Verify every new endpoint/service method uses async/await and accepts a `CancellationToken`, per Constitution Principle IV, across `apps/GameRetro/GameRetro.Api/Controllers/AuthController.cs` and `apps/GameRetro/GameRetro.Api/Services/`
- ~~T052 [P] Run the full backend test suite (`dotnet test`)~~ **(REMOVED — no test suite)**
- ~~T053 [P] Run the full frontend test suite (`npm test`)~~ **(REMOVED — no test suite)**
- [X] T054 Manually execute quickstart.md Scenarios 1–5 end-to-end against a locally running API + frontend
- [X] T055 [P] Document the required `SeedAdmin`/`Jwt`/`ConnectionStrings:AuthDb` configuration for new environments (e.g., a `README.md` note or `appsettings.Example.json`) near `apps/GameRetro/GameRetro.Api/appsettings.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and have no dependency on each other, but US2's login
    verification is easier once US1 can create accounts to log in with
  - US3 depends only on Foundational (seeding does not require US1/US2 code), though
    verifying role-gating against an Author account is most meaningful once US1 exists
  - US4 depends only on Foundational (a login is needed to demo logout, i.e. US2, but the
    endpoint itself has no code dependency on US1/US3)
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — independently testable, though
  demoing it end-to-end is easiest once US1 exists to create an account to log in with
- **User Story 3 (P2)**: Can start after Foundational — independently verifiable via the
  seeded Admin alone; checking role-gating against an Author benefits from US1 existing
- **User Story 4 (P3)**: Can start after Foundational — independently testable once a token
  exists to log out with (from US2)

### Within Each User Story

- DTOs/models before services
- Services before controller endpoints
- Backend endpoint before the frontend page/function that calls it
- Each piece is manually verified before the story is considered done (Constitution v2.0.0)
- Story complete before moving to the next priority (if working sequentially)

### Parallel Opportunities

- All Setup tasks marked `[P]` (T002–T004) can run in parallel
- Within Foundational, T005–T007 and T011–T013 are each `[P]` and can run in parallel; T008
  onward within Foundational is sequential (all touch `Program.cs` or depend on it)
- Once Foundational completes, US1, US2, US3, and US4 can be staffed in parallel by
  different developers
- DTO-creation tasks within a story marked `[P]` can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch both User Story 1 DTOs together:
Task: "Create RegisterRequest DTO in apps/GameRetro/GameRetro.Api/DTOs/Requests/RegisterRequest.cs"
Task: "Create AuthAccountResponse DTO in apps/GameRetro/GameRetro.Api/DTOs/Responses/AuthAccountResponse.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (public registration, Author-only)
4. **STOP and VALIDATE**: run quickstart.md Scenario 2 independently
5. Deploy/demo if ready — registration alone already proves the Author/Admin separation
   for FR-004

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → demo (registration works, Author-only)
3. Add User Story 2 → validate → demo (login works for the Author just registered)
4. Add User Story 3 → validate → demo (Admin exists without registering, role gating works)
5. Add User Story 4 → validate → demo (logout ends the session client-side)
6. Phase 7 polish → run the full quickstart.md validation end-to-end

### Parallel Team Strategy

With multiple developers, after Foundational is done:
- Developer A: User Story 1 (registration)
- Developer B: User Story 2 (login)
- Developer C: User Story 3 (admin seeding + role gating)
- Developer D: User Story 4 (logout)

All four touch `AuthController.cs`/`Program.cs` at points, so coordinate merges on those
two files even though the stories are otherwise independent.

---

## Notes

- `[P]` tasks = different files, no unmet dependencies
- `[Story]` label maps each task to its user story for traceability
- Every user story is independently completable and manually verifiable per its quickstart scenario
- No automated tests (Constitution v2.0.0) — each story is verified manually before "done"
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
