# Research: Game Reviews & Community Moderation

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-23

This document resolves the technical unknowns needed to plan this feature against the
existing codebase: `apps/GameRetro/GameRetro.Api` (ASP.NET Core 9, EF Core 9 / SQL Server
LocalDb, ASP.NET Core Identity via `AuthDbContext`, a live IGDB-backed `GamesController`/
`GameLibraryService` with **no locally persisted Game table**) and `apps/react-frontend`
(React 19 + Vite + `react-router-dom`, existing `RequireAuth`/`RequireRole` guards, and a
per-domain `xyzApi.ts` fetch-wrapper convention).

## Decision 1: Local "Game" record — lazily-created shadow row, not a synced catalog

**Decision**: Add a local `Game` table keyed by the **same identifier IGDB already uses**
(the external `long` id returned by `GameLibraryService`) — no separate locally-generated
primary key. A row is created the first time it's needed: either when a user submits the
first review for that external game id, or when an Admin acts on a game (hide/unhide,
override displayed details) before any review exists. There is no background sync/import
of the full IGDB catalog.

**Rationale**: Reviews, Comments, and Reports (spec's Key Entities) all need a stable FK
target for "the game," but the existing `GamesController` deliberately has no local
persistence — it searches IGDB live (see `GameLibraryService.SearchAsync`). Per this
feature's clarification, "manage the games" is curation/moderation, not authoring a
separate catalog (FR-018b), so introducing a full synced copy of IGDB would be scope creep
(Principle I, YAGNI). A lazily-created shadow row is the minimal persistence that still
gives Reviews/Comments/Reports a real FK and gives Admins somewhere to store
hide/override state.

**Alternatives considered**:
- Full local mirror of the IGDB catalog (sync job, scheduled refresh) — rejected: no
  requirement for offline browsing or bulk catalog queries; adds a whole sync subsystem the
  spec never asked for.
- Store the external game id directly on Review/Comment/Report with no local Game table at
  all — rejected: gives Admins no place to persist "hidden" or "overridden details" state
  (FR-018b), which is explicitly required.

## Decision 2: Score model — per-review overall score, then game aggregate

**Decision**: A Review stores exactly five 1–10 integer mechanic scores (gameplay, story &
narrative, audiovisual presentation, replayability, overall enjoyment) as five separate
columns. A review's own "overall score" (referenced by FR-006/SC-003) is computed as the
average of those five scores, not a sixth separately-entered number. A game's aggregate
community score is the average of its reviews' computed overall scores, computed at read
time (not stored/denormalized).

**Rationale**: The spec names "overall enjoyment" as one of the five *input* mechanics
(FR-004), so a review's "overall score" is naturally the composite of all five, matching the
spec's Assumptions ("aggregate community score... is the average of its published reviews'
overall scores"). Computing at read time avoids a denormalized/cached column that must be
kept in sync on every review add/edit/delete — the per-game review count in this project's
scale (student project, single game catalog) is small enough that a live `AVG()` query is
cheap and trivially matches SC-003's "0% drift" requirement by construction (there is
nothing to drift from — it's computed fresh every time).

**Alternatives considered**:
- A separately entered 6th "overall score" field — rejected: contradicts the spec's
  explicit five-mechanic list (FR-004) and Assumptions.
- A denormalized/cached aggregate column on Game, updated on every write — rejected:
  extra invalidation logic for no measurable benefit at this scale (YAGNI); revisit only if
  a game accumulates enough reviews that live aggregation becomes a measured bottleneck.

## Decision 3: Report target modeling

**Decision**: `Report` has two nullable foreign keys, `ReviewId` and `CommentId`; exactly one
must be set (enforced in the service layer, not a DB CHECK constraint, to keep the schema
simple). Deleting a Review cascades to delete its Comments (real content, no reason to keep
it once its parent is gone). Reports, however, use `ON DELETE SET NULL` on both `ReviewId`
and `CommentId` — deleting a Review or Comment clears the pointer on any Report that
referenced it, but the Report row itself survives with its `Status` intact.

**Rationale**: A single polymorphic FK (e.g., `TargetType` + `TargetId`) sacrifices real
referential integrity (no FK constraint, no cascade delete) for a small reduction in column
count — not a good trade for a project whose constitution mandates EF Core-managed schema
integrity. Two nullable FKs keep normal EF Core delete-behavior configuration available.
`SetNull` (rather than `Cascade`) for the Report's own FKs is required by FR-019: an Admin's
"resolve by removing content" action must delete the reported Review/Comment **and** mark
that same Report `Resolved` — if the FK cascaded, the Report row would already be gone by
the time its status is updated, since it's the same delete operation. `SetNull` lets the
Report outlive its target, satisfying both FR-019 (a resolvable, still-existing report) and
the edge case "content is deleted before an Admin resolves the report" (the Report simply
ends up with a null target and whatever status it already had — `Open` until an Admin
explicitly dismisses it, since there's no longer any content to act on).

*(Revised during `/speckit-analyze`, finding F1: the original version of this decision used
`Cascade` for Report's own FKs, which made FR-019's "mark resolved" step impossible to
execute — the Report row would already have been deleted by the same cascade that removed
its target.)*

**Alternatives considered**:
- Polymorphic `TargetType`/`TargetId` pair with no FK constraint — rejected: no cascade/
  set-null delete behavior, no referential integrity, and application code would have to
  manually clean up or update orphaned reports on every delete path anyway.
- `Cascade` delete on Report's FKs (the original decision) — rejected on reflection: breaks
  FR-019's "remove content, then mark resolved" flow, since the report row wouldn't survive
  long enough to be marked anything.
- Keep resolved/removed reports around as a full audit trail with a "target snapshot" copy
  of the deleted content — rejected: the spec's Assumptions leave hard-delete-vs-soft-delete
  as an implementation choice with no visible user-facing difference required; a full
  snapshot/audit trail is not requested and would be premature scope.

## Decision 4: Hide-vs-delete semantics for Games vs. Reviews/Comments

**Decision**: A Game's local shadow row supports only a reversible `IsHidden` toggle plus
Admin-editable override fields (title/description/cover overrides) — there is no "delete a
game" operation, consistent with FR-018b (curate the existing IGDB-sourced catalog, not
author/remove entries in a separate one). While `IsHidden` is true, the game's detail page,
and its reviews/comments, are inaccessible to non-Admin users (surfaced as the same
"game not found" response used for any other invalid game reference — User Story 1,
acceptance scenario 4) but remain intact in the database so an Admin can unhide it later.
Reviews and Comments, by contrast, support **real deletion** (by their own author, or by an
Admin per FR-018/FR-019) — when a Review is deleted, its Comments and Reports are also
deleted (Decision 3); there is no "unhide a review" concept.

**Rationale**: This matches the spec's own framing: games are "hidden/unhidden" (FR-018b),
while reviews/comments are "removed" (FR-008, FR-012, FR-018). Since Admins cannot delete a
game outright (it isn't locally authored to begin with), a reversible hide is the only
sensible "removal" semantics for a game; reviews/comments, which genuinely are
locally-authored content, can be hard-deleted.

**Alternatives considered**:
- Hard-delete the local Game row on "removal" — rejected: would silently orphan any
  Review/Comment history if the game were ever referenced again, and re-creates the same
  external id on next lazy-creation anyway, so nothing is actually gained over a hide flag.

## Decision 5: Single shared `DbContext`

**Decision**: Add the new `Game`, `Review`, `Comment`, and `Report` entities (plus their
`DbSet`s and Fluent API configuration) to the existing `AuthDbContext` rather than
introducing a second `DbContext`.

**Rationale**: The project already has exactly one `DbContext` per the Technology Stack
Constraints (EF Core, SQL Server LocalDb, migrations as the only schema-change mechanism).
Splitting into a second context would add cross-context transaction/consistency concerns
(e.g., a Review referencing an `ApplicationUser` from a different context) with no present
need — YAGNI, Principle I.

**Alternatives considered**:
- A dedicated `CommunityDbContext` for the new entities — rejected: no current requirement
  (e.g., separate database, separate deployment unit) justifies the added complexity of
  cross-context queries/joins between Reviews and `ApplicationUser`.

## Decision 6: Admin user-management actions (role change, deactivate/activate, delete)

**Decision**: A new Admin-only `UsersController` (`/api/admin/users`) exposes account
listing plus three actions on an account: change its role between "Author" and "Admin"
(via `UserManager`/`RoleManager` — remove from current role, add to the new one, mirroring
the two-role invariant already enforced by the authentication feature, FR-008); toggle
`ApplicationUser.IsDeactivated` (a new bool column, not a reuse of Identity's `LockoutEnd` —
see rationale below); and delete the account outright via `UserManager.DeleteAsync`, which
cascades to delete that account's Reviews, Comments, and Reports (data-model.md's
`ApplicationUser` Delete behavior).

*(Expanded during `/speckit-analyze`, finding E1: FR-018a originally said "edit a user
account's details" with no concrete task/endpoint behind that phrase beyond role-change.
The user resolved this by specifying three concrete actions: delete, role change, and
activate/deactivate.)*

A deactivated account (`IsDeactivated = true`) cannot log in: feature 001's
`AuthService.LoginAsync` must check this flag and, on a deactivated account, return the same
generic invalid-credentials response as any other failed login (FR-006 in the authentication
feature already avoids revealing *why* a login failed — reusing that same generic message
for "deactivated" avoids leaking account-state to anyone probing with correct credentials
for a deactivated account).

**Rationale**: Keeps moderation endpoints grouped under a clear `/api/admin/*` prefix
(consistent naming for all of User Story 8's four moderation areas: users, games,
reviews/comments, reports), reuses Identity APIs already in place from the authentication
feature rather than hand-rolling role/account storage, and keeps `AuthController` focused on
authentication only (Principle I — thin, single-responsibility controllers). An explicit
`IsDeactivated` column (rather than repurposing Identity's built-in `LockoutEnd`) keeps the
"an Admin turned this account off" concept traceable and distinct from Identity's own
failed-login-attempt lockout mechanism, which means something different (Constitution
Principle I: "explainable step by step" — reusing `LockoutEnd` for a second, unrelated
meaning would obscure that trace). Deleting via `UserManager.DeleteAsync` plus FK cascade
(rather than a soft-delete flag) matches this feature's existing precedent of not leaving
orphaned content around (data-model.md's Review→Comment and Game-hide cascades) and avoids
inventing a second "is this account still real" concept alongside `IsDeactivated`.

**Alternatives considered**:
- Extend the existing `AuthController` with admin endpoints — rejected: mixes
  authentication concerns with moderation concerns in one controller, working against
  Principle I's separation-of-concerns guidance.
- Reuse Identity's `LockoutEnd` (set far in the future) for deactivation instead of adding
  `IsDeactivated` — rejected: conflates two different concepts (temporary failed-login
  lockout vs. a deliberate Admin action) under one field, harder to trace/explain later.
- Soft-delete (an `IsDeleted` flag, content hidden but retained) instead of a real delete —
  rejected: this feature already treats "no longer locally authored" content as safe to hard
  -delete (Reviews/Comments on author-delete or Admin-delete), and Games are the only entity
  with a deliberate hide-not-delete precedent (Decision 4) because *they* originate from an
  external source worth preserving a reference to — an Account doesn't have that same
  external-source justification.

## Decision 7: Frontend structure

**Decision**: Add new route-level pages (`GameDetailPage`, `ProfilePage`, and an `admin/`
folder with `AdminUsersPage`, `AdminGamesPage`, `AdminReportsPage`) plus reusable
`ReviewForm`/`ReviewList`/`CommentList`/`ReportDialog` components, and new per-domain
`reviewsApi.ts`, `commentsApi.ts`, `reportsApi.ts`, `profileApi.ts`, `adminApi.ts` files —
following the exact pattern already established by `authApi.ts`/`gamesApi.ts`. Admin routes
reuse the existing `RequireRole` guard (already built for Admin-only areas); all
authenticated routes reuse the existing `RequireAuth` guard.

**Rationale**: Matches Constitution Principle I's frontend guidance (function components,
deliberate state/effects, no duplicated logic) and Principle III (reusing existing
components/hooks rather than re-implementing equivalent behavior) by extending established
conventions instead of introducing a new pattern.

**Alternatives considered**: None seriously considered — the existing conventions
(`RequireAuth`, `RequireRole`, per-domain API files) are a direct fit for every new page
this feature needs.

## Decision 8: Password change without current-password verification

**Decision**: Implement password change (FR-014a/FR-014b) using ASP.NET Core Identity's
`UserManager.RemovePasswordAsync(user)` followed by `UserManager.AddPasswordAsync(user,
newPassword)`, rather than `UserManager.ChangePasswordAsync(user, currentPassword,
newPassword)`. `AddPasswordAsync` still runs the configured `PasswordOptions` policy (the
same one enforced at registration), so FR-014b's "same minimum password policy" requirement
is satisfied for free. The new-password/confirm-password match check happens in
`IProfileService` before either Identity call runs, so a mismatch never touches the stored
password at all.

**Rationale**: `ChangePasswordAsync` is Identity's API for the case where the current
password *is* being verified — using it would require adding a current-password field the
clarification explicitly said not to require. `RemovePasswordAsync` + `AddPasswordAsync` is
Identity's own documented pattern for setting a new password without knowing the old one
(the same pair Identity's own password-reset flow uses internally after validating a reset
token), so this reuses a first-party, well-tested code path rather than hand-rolling
password storage logic — consistent with Decision 1 in the authentication feature's
research (avoid reinventing what Identity already solves).

**Alternatives considered**:
- `ChangePasswordAsync` — rejected: requires the current password as an argument, which
  contradicts the clarification's explicit answer.
- Generate and immediately self-consume a password-reset token
  (`GeneratePasswordResetTokenAsync` + `ResetPasswordAsync`) — rejected: functionally
  equivalent to `RemovePasswordAsync`/`AddPasswordAsync` for this use case, but adds token
  generation/consumption ceremony with no benefit since nothing is ever emailed or
  time-delayed here.
- Hand-rolled password update (write a new hash directly) — rejected: bypasses Identity's
  policy validation and hashing configuration entirely; same objection as Decision 1 in the
  authentication feature.

## Cross-feature note: Profile fields vs. the authentication feature's Username

`specs/001-user-authentication` was amended (2026-07-23) to add a required, unique
`Username` used for both display and login. This feature's "Profile" (User Story 6) does
**not** re-expose Username or Email as editable here — those remain governed by the
authentication feature. This feature adds a separate, purely cosmetic `DisplayName`
(optional; falls back to Username when unset) and an optional short `Bio`, satisfying
FR-014/FR-015 without duplicating or conflicting with Username's identity/uniqueness rules.

## Cross-feature note: Deactivation touches feature 001's login flow

`ApplicationUser.IsDeactivated` (Decision 6) is a new column, but the code that must *check*
it — `AuthService.LoginAsync` — lives in `specs/001-user-authentication`
(`apps/GameRetro/GameRetro.Api/Services/AuthService.cs`). Implementing Admin
deactivation without also touching that method would leave the flag inert (an Admin could
"deactivate" an account and it would still be able to log in). This is a deliberate,
necessary cross-feature edit, not scope creep — tasks.md includes an explicit task for it.

## Summary of resolved unknowns

| Technical Context field | Resolution |
|---|---|
| Language/Version | C# / .NET 9 (backend); TypeScript + React 19 (frontend) — unchanged from feature 001 |
| Primary Dependencies | No new backend packages required (EF Core 9 SQL Server + Identity already present); no new frontend packages required (`react-router-dom` already present) |
| Storage | SQL Server LocalDb via EF Core migrations; new `Game`, `Review`, `Comment`, `Report` tables added to the existing `AuthDbContext` |
| Testing | None — manual/functional verification only (Constitution v2.0.0, Principle II); no test project or test tooling |
| Target Platform | Web: ASP.NET Core Web API + browser-based React SPA (unchanged) |
| Project Type | Web application (frontend + backend, existing `apps/` layout) |
| Performance Goals | Aggregate score computed live per game detail load; acceptable at this project's scale (Constitution Principle IV: async I/O, `CancellationToken`, bounded/paginated queries for review/comment lists) |
| Constraints | One review per user per game (FR-005a); Admin cannot hard-delete games, only hide/unhide (Decision 4); reports require exactly one target and survive their target's deletion via `SetNull`, not cascade (Decision 3, revised); password change has no current-password check (Decision 8); Admin can delete/deactivate/change-role on any account, cascading to that account's content on delete (Decision 6, expanded) |
| Scale/Scope | Small student-project scale; no high-concurrency requirement stated |

No `NEEDS CLARIFICATION` markers remain in the Technical Context.
