# Implementation Plan: Game Reviews & Community Moderation

**Branch**: `002-game-reviews-moderation` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-game-reviews-moderation/spec.md`

## Summary

Add a game detail page (game info + aggregate score + review list), scored reviews (five
1–10 mechanic scores plus text, one per user per game, editable/deletable by their author),
comments on reviews (editable/deletable by their author), a report mechanism for reviews and
comments, an Admin moderation area covering user accounts (role change, deactivate/reactivate, and
delete — cascading to that account's content), game curation (hide/unhide + detail
overrides — no new-game authoring, and never a hard delete of a game or its content), direct
removal of any review/comment, and report resolution, plus a profile update flow that
includes changing your own password (new password + confirmation only, no current-password
check, per clarification). Technical approach: a lazily-created local `Game` shadow row
(keyed by the existing IGDB id) added to the existing `AuthDbContext` alongside new
`Review`, `Comment`, and `Report` entities; a game's overall score is the average of its own
five mechanic scores, and a game's aggregate score is the average of its reviews' overall
scores, both computed at read time; Report's FKs to Review/Comment use `SetNull` (not
cascade) so a report survives its target's deletion long enough to be marked resolved
(research.md Decision 3, revised during `/speckit-analyze`); password change uses Identity's
`RemovePasswordAsync`/`AddPasswordAsync` pair (no current-password verification, per
clarification) rather than `ChangePasswordAsync` (which requires it); account deactivation
is a new `IsDeactivated` flag checked by feature 001's login flow, and account deletion
cascades to that account's Reviews/Comments/Reports; new Admin-only controllers grouped
under `/api/admin/*`; new React pages/components following the existing
`RequireAuth`/`RequireRole`/per-domain-`*Api.ts` conventions.

## Technical Context

**Language/Version**: C# / .NET 9 (backend, `apps/GameRetro/GameRetro.Api`); TypeScript +
React 19 with Vite (frontend, `apps/react-frontend`) — unchanged from feature 001

**Primary Dependencies**: No new backend packages — EF Core 9 SQL Server provider and
ASP.NET Core Identity are already installed and used by `AuthDbContext`/`ApplicationUser`.
No new frontend packages — `react-router-dom` is already installed for routing.

**Storage**: SQL Server LocalDb via EF Core Code-First migrations. New tables: `Games`
(local shadow row keyed by the existing IGDB `long` id), `Reviews`, `Comments`, `Reports`,
all added to the existing `AuthDbContext`. `ApplicationUser` gains three new columns:
`DisplayName` (optional), `Bio` (optional), `IsDeactivated` (bool, default `false`,
FR-018c). Password change (FR-014a/FR-014b) reuses Identity's existing `PasswordHash`
column via `UserManager` — no new column required. Report's FKs to Review/Comment use
`SetNull` on delete (not cascade) so a report row survives its target's removal.

**Testing**: No automated test suite (Constitution v2.0.0, Principle II — Validation
Standards). Every new endpoint/component is verified manually/functionally against a
running API + dev server before being considered done.

**Target Platform**: Web — ASP.NET Core Web API served over HTTPS, consumed by a
browser-based React SPA (unchanged)

**Project Type**: Web application (frontend + backend), using the existing `apps/` layout —
no new top-level structure needed

**Performance Goals**: Game detail page (info + aggregate score + review list) loads
promptly under normal interactive load; aggregate score is computed live via a bounded
per-game query (Constitution Principle IV: async I/O, `CancellationToken` honored, review/
comment lists support pagination once a game's review count can exceed a screen's worth)

**Constraints**: Exactly one review per user per game, edit-in-place on resubmission
(FR-005a); Admins can hide/unhide and override a game's displayed details but cannot author
a brand-new game outside the existing IGDB-backed source, nor delete a game (FR-018b);
Admins can delete/deactivate/change-role on any account, cascading to that account's
content on delete (FR-018a/FR-018c/FR-018d); a Report must reference exactly one of a
Review or a Comment and survives that target's deletion via `SetNull` (research.md
Decision 3, revised); non-authors (and non-Admins) are denied edit/delete/moderation
actions with a clear "not authorized" message; password change requires a matching
new-password confirmation and the same minimum password policy as registration, but
explicitly not the current password (FR-014a/FR-014b)

**Scale/Scope**: Small student-project scale (tens–hundreds of accounts, a modest number of
reviewed games); no high-concurrency or multi-region requirement stated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality | Game-detail/Review/Comment/Report/Game-moderation/Profile/Admin-user logic each live in their own injected service (`IGameDetailService`, `IReviewService`, `ICommentService`, `IReportService`, `IGameModerationService`, `IProfileService`, `IUserAdminService`), not in controllers; controllers stay thin. Moderation endpoints grouped under a dedicated set of Admin-only controllers rather than bolted onto `AuthController` (research.md Decision 6). Frontend reuses existing `RequireAuth`/`RequireRole` guards and the established per-domain `*Api.ts` file convention rather than inventing new patterns. No generic "polymorphic content" abstraction beyond the two nullable FKs a Report actually needs (YAGNI). | PASS |
| II. Validation Standards | Every new service method (review CRUD, comment CRUD, report submission/resolution, game hide/unhide, profile update, user role change) is exercised manually against a running API before being marked done; narrowest-scope verification first (single endpoint), then the full quickstart.md pass. | PASS |
| III. User Experience Consistency | Game detail page explicitly handles loading/empty ("no reviews yet")/error/"game not found" states (User Story 1). API returns matching status codes: 201 for review/comment/report creation, 200 for reads/updates, 204 for deletes, 400 for validation failures (missing mechanic score, empty comment, missing report reason, password confirmation mismatch or policy failure), 403 for authorization failures (editing someone else's content, non-Admin reaching moderation endpoints), 404 for a missing/hidden game. Error payloads use the existing `{ "message": "..." }` shape from `ExceptionHandlingMiddleware`. | PASS |
| IV. Performance Requirements | All new EF Core access is async (`ToListAsync`, `FirstOrDefaultAsync`, etc.); all new endpoints accept and honor `CancellationToken`; review/comment lists are paginated (or explicitly bounded) once a game's review count can exceed a screen's worth, per the constitution's collection-endpoint rule; aggregate score computed via a single bounded `AVG()`-equivalent query scoped to one game, not an unbounded scan. | PASS |

No violations identified. Complexity Tracking is not needed for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/002-game-reviews-moderation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── games-and-reviews-api.md
│   ├── comments-api.md
│   ├── reports-api.md
│   ├── profile-api.md            # includes profile update + password change
│   └── admin-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
├── GameRetro/
│   └── GameRetro.Api/
│       ├── Data/
│       │   └── AuthDbContext.cs             # add DbSet<Game/Review/Comment/Report>, Fluent API config
│       ├── Models/
│       │   ├── ApplicationUser.cs           # add DisplayName, Bio, IsDeactivated
│       │   ├── Game.cs                      # local shadow row (Id = external IGDB id)
│       │   ├── Review.cs
│       │   ├── Comment.cs
│       │   └── Report.cs
│       ├── DTOs/
│       │   ├── Requests/
│       │   │   ├── ReviewRequest.cs
│       │   │   ├── CommentRequest.cs
│       │   │   ├── ReportRequest.cs
│       │   │   ├── ProfileUpdateRequest.cs
│       │   │   ├── ChangePasswordRequest.cs   # newPassword + confirmPassword, no current password
│       │   │   ├── GameModerationRequest.cs   # hide/unhide + detail overrides
│       │   │   ├── UserRoleUpdateRequest.cs
│       │   │   └── UserStatusUpdateRequest.cs  # deactivate/reactivate (FR-018c)
│       │   └── Responses/
│       │       ├── GameDetailResponse.cs      # game info + aggregate score + reviews
│       │       ├── ReviewResponse.cs
│       │       ├── CommentResponse.cs
│       │       ├── ReportResponse.cs
│       │       ├── ProfileResponse.cs
│       │       └── AdminUserResponse.cs
│       ├── Controllers/
│       │   ├── GamesController.cs            # extend: GET {id} returns GameDetailResponse (merges IGDB + local Game state)
│       │   ├── ReviewsController.cs          # POST/PUT/DELETE reviews for a game
│       │   ├── CommentsController.cs         # POST/PUT/DELETE comments on a review
│       │   ├── ReportsController.cs          # POST a report (user-facing)
│       │   ├── ProfileController.cs          # GET/PUT own profile; POST own password change
│       │   └── Admin/
│       │       ├── AdminUsersController.cs   # GET users, PUT role, PUT status (deactivate), DELETE (delete account)
│       │       ├── AdminGamesController.cs   # PUT hide/unhide + detail overrides
│       │       ├── AdminContentController.cs # DELETE any review/comment (Admin, bypasses author check)
│       │       └── AdminReportsController.cs # GET open reports, POST resolve (remove content / dismiss)
│       ├── Services/
│       │   ├── IGameDetailService.cs / GameDetailService.cs  # merges IGDB + local Game override/hidden state for GamesController.GetById
│       │   ├── IReviewService.cs / ReviewService.cs
│       │   ├── ICommentService.cs / CommentService.cs
│       │   ├── IReportService.cs / ReportService.cs
│       │   ├── IProfileService.cs / ProfileService.cs  # incl. ChangePasswordAsync (RemovePasswordAsync + AddPasswordAsync)
│       │   ├── IGameModerationService.cs / GameModerationService.cs
│       │   └── IUserAdminService.cs / UserAdminService.cs
│       └── Migrations/
│           └── <timestamp>_AddGameReviewsModeration.cs
└── react-frontend/
    └── src/
        ├── pages/
        │   ├── GameDetailPage.tsx            # game info + aggregate score + reviews + comments + report actions
        │   ├── ProfilePage.tsx
        │   └── admin/
        │       ├── AdminUsersPage.tsx
        │       ├── AdminGamesPage.tsx
        │       └── AdminReportsPage.tsx
        ├── components/
        │   ├── ReviewForm.tsx
        │   ├── ReviewList.tsx
        │   ├── CommentList.tsx
        │   ├── CommentForm.tsx
        │   └── ReportDialog.tsx
        └── services/
            ├── reviewsApi.ts
            ├── commentsApi.ts
            ├── reportsApi.ts
            ├── profileApi.ts
            └── adminApi.ts
```

**Structure Decision**: This feature extends the existing `apps/GameRetro/GameRetro.Api` +
`apps/react-frontend` layout — no new top-level structure. Backend additions slot into the
existing `Models/`, `DTOs/`, `Controllers/`, `Services/` folders (plus a new `Controllers/
Admin/` subfolder to group the four Admin-only moderation controllers, per Constitution
Principle I's separation-of-concerns guidance from research.md Decision 6). Frontend
additions slot into the existing `pages/`, `components/`, `services/` folders, reusing the
existing `RequireAuth`/`RequireRole` guards. No test project exists per Constitution v2.0.0.

## Complexity Tracking

> No entries — Constitution Check reported no violations.
