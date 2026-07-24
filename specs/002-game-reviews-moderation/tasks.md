---

description: "Task list template for feature implementation"
---

# Tasks: Game Reviews & Community Moderation

**Input**: Design documents from `/specs/002-game-reviews-moderation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not included. Per Constitution v2.0.0 (Principle II — Validation Standards), this
project does not require automated test files; each user story phase ends with a manual
verification checkpoint tied to its quickstart.md scenario instead.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and manual verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US8)
- Exact file paths are included in every description

## Path Conventions

Web app layout, per [plan.md](./plan.md)'s Project Structure:
- Backend: `apps/GameRetro/GameRetro.Api/`
- Frontend: `apps/react-frontend/src/`

---

## Phase 1: Setup

**Purpose**: Scaffolding for the new Admin-only areas. No new NuGet/npm packages are
required (research.md: EF Core SQL Server + Identity already installed backend-side,
`react-router-dom` already installed frontend-side).

- [X] T001 [P] Create the `apps/GameRetro/GameRetro.Api/Controllers/Admin/` directory for the new Admin-only controllers
- [X] T002 [P] Create the `apps/react-frontend/src/pages/admin/` directory for the new Admin pages

**Checkpoint**: Directory structure ready for the controllers/pages this feature adds.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model shared by every user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `Game` entity (`Id` = external IGDB `long` id as PK, `TitleOverride`, `DescriptionOverride`, `CoverImageUrlOverride`, `IsHidden`, `FirstSeenAt`) in `apps/GameRetro/GameRetro.Api/Models/Game.cs`, per [data-model.md](./data-model.md)
- [X] T004 [P] Create `Review` entity (`Id` Guid, `GameId` long, `AuthorId` string, `GameplayScore`/`StoryScore`/`AudiovisualScore`/`ReplayabilityScore`/`OverallEnjoymentScore` ints, `Text`, `CreatedAt`, `UpdatedAt`) in `apps/GameRetro/GameRetro.Api/Models/Review.cs`
- [X] T005 [P] Create `Comment` entity (`Id` Guid, `ReviewId` Guid, `AuthorId` string, `Text`, `CreatedAt`, `UpdatedAt`) in `apps/GameRetro/GameRetro.Api/Models/Comment.cs`
- [X] T006 [P] Create `Report` entity (`Id` Guid, `ReporterId` string, `ReviewId` Guid?, `CommentId` Guid?, `Reason`, `Status`, `CreatedAt`, `ResolvedAt`?) plus `ReportReason` (`Spam`/`Harassment`/`OffTopic`/`Other`) and `ReportStatus` (`Open`/`Resolved`/`Dismissed`) enums in `apps/GameRetro/GameRetro.Api/Models/Report.cs`
- [X] T007 [P] Add nullable `DisplayName`/`Bio` string properties and a non-nullable `IsDeactivated` bool (default `false`) to `apps/GameRetro/GameRetro.Api/Models/ApplicationUser.cs` (research.md Decision 6)
- [X] T008 Add `DbSet<Game>`/`DbSet<Review>`/`DbSet<Comment>`/`DbSet<Report>` and Fluent API configuration to `apps/GameRetro/GameRetro.Api/Data/AuthDbContext.cs`: unique index on `Review(GameId, AuthorId)` (FR-005a); partial unique indexes on `Report(ReporterId, ReviewId)` where `ReviewId IS NOT NULL` and `Report(ReporterId, CommentId)` where `CommentId IS NOT NULL` (FR-017); cascade delete `Review` → `Comment`; **`SetNull` (not cascade)** on `Report.ReviewId`/`Report.CommentId` so a Report survives its target's deletion (data-model.md, research.md Decision 3 — revised: the original cascade choice made FR-019's "mark resolved after removing content" impossible, since the report row would already be gone); cascade delete `ApplicationUser` → `Review.AuthorId`/`Comment.AuthorId`/`Report.ReporterId` (research.md Decision 6, for FR-018d account deletion) (depends on: T003, T004, T005, T006, T007)
- [X] T009 Generate and apply the EF Core migration (`dotnet ef migrations add AddGameReviewsModeration` then `dotnet ef database update`) from `apps/GameRetro/GameRetro.Api` (depends on: T008)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse Games and View Game Details (Priority: P1) 🎯 MVP

**Goal**: A signed-in user opens a game's detail page and sees its info, aggregate score,
and review list (or an explicit empty state).

**Independent Test**: Open a game's detail page with no reviews yet → info shown, "no
reviews yet" state, no score. (quickstart.md Scenario 1, steps 1–2.)

### Implementation for User Story 1

- [X] T010 [P] [US1] Create `GameDetailResponse` and `ReviewResponse` DTOs (`aggregateScore: number | null`, `reviewCount`, `reviews: ReviewResponse[]`, `page`, `pageSize` — paginated per Constitution Principle IV) in `apps/GameRetro/GameRetro.Api/DTOs/Responses/GameDetailResponse.cs` and `ReviewResponse.cs`, per [contracts/games-and-reviews-api.md](./contracts/games-and-reviews-api.md)
- [X] T011 [US1] Create `IGameDetailService`/`GameDetailService` — merges live IGDB data (via existing `IGameLibraryService`) with the local `Game` row's overrides/`IsHidden` state, computes the aggregate score as the average of reviews' overall scores (research.md Decision 2), returns `null` (→ 404) for a hidden game when the caller is not Admin (this hidden-game 404 is what satisfies FR-021 — a hidden game's reviews/comments become inaccessible as a side effect of the whole page being unreachable), and accepts `page`/`pageSize` parameters to return a bounded page of reviews rather than the full list (Constitution Principle IV — built in now rather than deferred, per `/speckit-analyze` finding D1) — in `apps/GameRetro/GameRetro.Api/Services/IGameDetailService.cs` and `GameDetailService.cs` (depends on: T008, T009, T010)
- [X] T012 [US1] Extend `GamesController.GetById` — add `[Authorize]` (matching the existing convention on this controller; satisfies FR-022 for this endpoint), accept optional `page`/`pageSize` query parameters and pass them to `IGameDetailService` — to call `IGameDetailService` and return `GameDetailResponse` (200) or `{ "message": "game not found" }` (404) in `apps/GameRetro/GameRetro.Api/Controllers/GamesController.cs` (depends on: T011)
- [X] T013 [US1] Register `IGameDetailService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T011)
- [X] T014 [P] [US1] Create `GameDetailPage.tsx` (explicit loading/error/"no reviews yet"/"game not found" states, per Constitution Principle III) in `apps/react-frontend/src/pages/GameDetailPage.tsx`
- [X] T015 [P] [US1] Create `ReviewList.tsx` (read-only: each review's five mechanic scores, computed overall score, text, author display name) in `apps/react-frontend/src/components/ReviewList.tsx`
- [X] T016 [US1] Add a `getById` function to `apps/react-frontend/src/services/gamesApi.ts` matching the new `GameDetailResponse` shape (depends on: T012)
- [X] T017 [US1] Add route `/games/:id` → `GameDetailPage` wrapped in the existing `RequireAuth` guard in `apps/react-frontend/src/App.tsx` (depends on: T014)
- [X] T018 [US1] Render `ReviewList` inside `GameDetailPage` using `gamesApi.getById`, and link each game card in `apps/react-frontend/src/pages/LibraryPage.tsx` to `/games/:id` (depends on: T014, T015, T016, T017)

**Checkpoint**: User Story 1 is fully functional and independently verifiable via quickstart.md Scenario 1.

---

## Phase 4: User Story 2 - Write a Scored Review for a Game (Priority: P1)

**Goal**: A signed-in user submits a review with five mechanic scores and text; a repeat
submission for the same game updates their existing review instead of creating a new one.

**Independent Test**: Submit a review for a game not yet reviewed → appears on the detail
page; resubmit for the same game → updates in place, not duplicated. (quickstart.md
Scenario 2.)

### Implementation for User Story 2

- [X] T019 [P] [US2] Create `ReviewRequest` DTO (five `[Range(1,10)]` int scores, `[Required]` `Text`) in `apps/GameRetro/GameRetro.Api/DTOs/Requests/ReviewRequest.cs`
- [X] T020 [US2] Create `IReviewService`/`ReviewService.SubmitAsync` — lazily creates the local `Game` row if it doesn't exist yet (research.md Decision 1), creates or updates the caller's review for that game per the `(GameId, AuthorId)` uniqueness rule (FR-005a), and computes `OverallScore` as the average of the five submitted scores (research.md Decision 2) — in `apps/GameRetro/GameRetro.Api/Services/IReviewService.cs` and `ReviewService.cs` (depends on: T008, T009, T019)
- [X] T021 [US2] Create `ReviewsController` with `[Authorize]` (satisfies FR-022 for this controller) and `POST /api/games/{gameId}/reviews` (201 new / 200 updated / 400 validation / 404 hidden-or-unknown game) in `apps/GameRetro/GameRetro.Api/Controllers/ReviewsController.cs`, per [contracts/games-and-reviews-api.md](./contracts/games-and-reviews-api.md) (depends on: T020)
- [X] T022 [US2] Register `IReviewService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T020)
- [X] T023 [P] [US2] Create `ReviewForm.tsx` (five score inputs + text, inline validation messages, loading/success/error states) in `apps/react-frontend/src/components/ReviewForm.tsx`
- [X] T024 [US2] Add a `submit` function to a new `apps/react-frontend/src/services/reviewsApi.ts` calling the endpoint from T021 (depends on: T021)
- [X] T025 [US2] Integrate `ReviewForm` into `GameDetailPage.tsx`, pre-filling and relabeling it "edit your review" when the caller already has one for this game (depends on: T018, T023, T024)

**Checkpoint**: User Stories 1 AND 2 both work independently, verifiable via quickstart.md Scenario 2 (and the now-populated case of Scenario 1).

---

## Phase 5: User Story 3 - Edit or Delete Own Review (Priority: P2)

**Goal**: A user edits or deletes their own review; attempts on someone else's review are
denied.

**Independent Test**: Edit own review → detail page reflects the update; delete own review →
it disappears and the aggregate score recalculates; attempt either on another user's review
→ `403`. (quickstart.md Scenario 3.)

### Implementation for User Story 3

- [X] T026 [US3] Add `UpdateAsync`/`DeleteAsync` (author-ownership check, throwing/returning a not-authorized result otherwise) to `apps/GameRetro/GameRetro.Api/Services/ReviewService.cs` (depends on: T020)
- [X] T027 [US3] Add `PUT /api/reviews/{reviewId}` and `DELETE /api/reviews/{reviewId}` (200/204/400/403/404) to `apps/GameRetro/GameRetro.Api/Controllers/ReviewsController.cs`, per contracts/games-and-reviews-api.md (depends on: T026)
- [X] T028 [P] [US3] Add edit/delete controls to `ReviewList.tsx`, shown only for the signed-in user's own review
- [X] T029 [US3] Add `update`/`remove` functions to `apps/react-frontend/src/services/reviewsApi.ts` (depends on: T027)
- [X] T030 [US3] Wire `ReviewList`'s edit action to open `ReviewForm` pre-filled, and its delete action (with a confirmation step) into `GameDetailPage.tsx` (depends on: T025, T028, T029)

**Checkpoint**: User Stories 1–3 work independently, verifiable via quickstart.md Scenario 3.

---

## Phase 6: User Story 4 - Comment on a Review (Priority: P2)

**Goal**: A signed-in user posts a non-empty comment on a review; empty comments are
rejected.

**Independent Test**: Post a comment on a review → appears attached to it; post an empty
comment → rejected. (quickstart.md Scenario 4, steps 1–2.)

### Implementation for User Story 4

- [X] T031 [P] [US4] Create `CommentRequest` DTO (`[Required]` non-empty `Text`) and `CommentResponse` DTO in `apps/GameRetro/GameRetro.Api/DTOs/Requests/CommentRequest.cs` and `DTOs/Responses/CommentResponse.cs`
- [X] T032 [US4] Create `ICommentService`/`CommentService.CreateAsync` plus a `ListAsync(reviewId, page, pageSize)` returning a bounded page of comments for a review (Constitution Principle IV — built in now rather than deferred, per `/speckit-analyze` finding D1) in `apps/GameRetro/GameRetro.Api/Services/ICommentService.cs` and `CommentService.cs` (depends on: T008, T009, T031)
- [X] T033 [US4] Create `CommentsController` with `[Authorize]` (satisfies FR-022 for this controller), `POST /api/reviews/{reviewId}/comments` (201/400/404) and `GET /api/reviews/{reviewId}/comments?page=&pageSize=` (200, paginated list) in `apps/GameRetro/GameRetro.Api/Controllers/CommentsController.cs`, per [contracts/comments-api.md](./contracts/comments-api.md) (depends on: T032)
- [X] T034 [US4] Register `ICommentService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T032)
- [X] T035 [P] [US4] Create `CommentList.tsx` (read-only, per-review comment list) and `CommentForm.tsx` (new-comment input with inline validation) in `apps/react-frontend/src/components/CommentList.tsx` and `CommentForm.tsx`
- [X] T036 [US4] Add `list` and `create` functions to a new `apps/react-frontend/src/services/commentsApi.ts` (depends on: T033)
- [X] T037 [US4] Render `CommentList` (fetching via `commentsApi.list`) + `CommentForm` under each review inside `GameDetailPage.tsx`/`ReviewList.tsx` (depends on: T030, T035, T036)

**Checkpoint**: User Stories 1–4 work independently, verifiable via quickstart.md Scenario 4 (steps 1–2).

---

## Phase 7: User Story 5 - Edit or Delete Own Comment (Priority: P2)

**Goal**: A user edits or deletes their own comment; attempts on someone else's comment are
denied.

**Independent Test**: Edit own comment → updated text shown; delete own comment → it
disappears; attempt either on another user's comment → `403`. (quickstart.md Scenario 4,
steps 3–5.)

### Implementation for User Story 5

- [X] T038 [US5] Add `UpdateAsync`/`DeleteAsync` (author-ownership check) to `apps/GameRetro/GameRetro.Api/Services/CommentService.cs` (depends on: T032)
- [X] T039 [US5] Add `PUT /api/comments/{commentId}` and `DELETE /api/comments/{commentId}` (200/204/400/403/404) to `apps/GameRetro/GameRetro.Api/Controllers/CommentsController.cs` (depends on: T038)
- [X] T040 [P] [US5] Add edit/delete controls to `CommentList.tsx`, shown only for the signed-in user's own comments
- [X] T041 [US5] Add `update`/`remove` functions to `apps/react-frontend/src/services/commentsApi.ts` (depends on: T039)
- [X] T042 [US5] Wire `CommentList`'s edit/delete actions into `GameDetailPage.tsx` (depends on: T037, T040, T041)

**Checkpoint**: User Stories 1–5 work independently, verifiable via quickstart.md Scenario 4 (steps 3–5).

---

## Phase 8: User Story 6 - Edit Own Profile (Priority: P2)

**Goal**: A signed-in user updates their display name/bio and can change their password
(new password + confirmation only, no current-password check, per clarification).

**Independent Test**: Update `displayName`/`bio` → reflected on the profile and on the
user's existing reviews/comments; change password with matching confirmation → can log in
with the new password without ever entering the old one; mismatched confirmation or a
policy-violating new password → rejected, old password still works. (quickstart.md
Scenario 5.)

### Implementation for User Story 6

- [X] T043 [P] [US6] Create `ProfileResponse`, `ProfileUpdateRequest`, and `ChangePasswordRequest` (`newPassword`, `confirmNewPassword` — no current-password field) DTOs in `apps/GameRetro/GameRetro.Api/DTOs/Responses/ProfileResponse.cs` and `DTOs/Requests/ProfileUpdateRequest.cs`, `ChangePasswordRequest.cs`
- [X] T044 [US6] Create `IProfileService`/`ProfileService` with `GetAsync`/`UpdateAsync` (validates non-blank `displayName` if provided, FR-014) and `ChangePasswordAsync` (matches `newPassword`/`confirmNewPassword`, then `UserManager.RemovePasswordAsync` + `AddPasswordAsync` — research.md Decision 8, FR-014a/FR-014b) in `apps/GameRetro/GameRetro.Api/Services/IProfileService.cs` and `ProfileService.cs` (depends on: T007, T009, T043)
- [X] T045 [US6] Create `ProfileController` with `[Authorize]` (satisfies FR-022 for this controller), `GET /api/profile`, `PUT /api/profile`, and `POST /api/profile/password` in `apps/GameRetro/GameRetro.Api/Controllers/ProfileController.cs`, per [contracts/profile-api.md](./contracts/profile-api.md) (depends on: T044)
- [X] T046 [US6] Register `IProfileService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T044)
- [X] T047 [P] [US6] Create `ProfilePage.tsx` (view/edit `displayName`/`bio`, plus a separate `newPassword`/`confirmNewPassword` password-change form, both with inline validation) in `apps/react-frontend/src/pages/ProfilePage.tsx`
- [X] T048 [US6] Add `get`/`update`/`changePassword` functions to a new `apps/react-frontend/src/services/profileApi.ts` (depends on: T045)
- [X] T049 [US6] Add route `/profile` → `ProfilePage` wrapped in `RequireAuth`, plus a nav link, in `apps/react-frontend/src/App.tsx` (depends on: T047, T048)
- [X] T050 [US6] Confirm `ReviewResponse`/`CommentResponse` projections in `ReviewService.cs`/`CommentService.cs` read the author's *current* `DisplayName`/`Username` at query time (no denormalized copy), satisfying FR-015 (depends on: T020, T032, T044)

**Checkpoint**: verifiable via quickstart.md Scenario 5.

---

## Phase 9: User Story 7 - Report Inappropriate Reviews or Comments (Priority: P3)

**Goal**: A signed-in user reports a review or comment with a reason; duplicate reports
from the same user against the same target are blocked.

**Independent Test**: Report a review/comment with a reason → recorded; report the exact
same target again → `409`; report with no reason → `400`. (quickstart.md Scenario 6.)

### Implementation for User Story 7

- [X] T051 [P] [US7] Create `ReportRequest` (`reviewId`/`commentId` nullable, `reason` enum, `[Required]`) and `ReportResponse` DTOs in `apps/GameRetro/GameRetro.Api/DTOs/Requests/ReportRequest.cs` and `DTOs/Responses/ReportResponse.cs`
- [X] T052 [US7] Create `IReportService`/`ReportService.SubmitAsync` — validates exactly one of `reviewId`/`commentId` is set (research.md Decision 3), rejects a duplicate `(ReporterId, target)` pair (FR-017) — in `apps/GameRetro/GameRetro.Api/Services/IReportService.cs` and `ReportService.cs` (depends on: T008, T009, T051)
- [X] T053 [US7] Create `ReportsController` with `[Authorize]` (satisfies FR-022 for this controller) and `POST /api/reports` (201/400/409/404) in `apps/GameRetro/GameRetro.Api/Controllers/ReportsController.cs`, per [contracts/reports-api.md](./contracts/reports-api.md) (depends on: T052)
- [X] T054 [US7] Register `IReportService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T052)
- [X] T055 [P] [US7] Create `ReportDialog.tsx` (reason selector + submit, shows the duplicate-report message inline) in `apps/react-frontend/src/components/ReportDialog.tsx`
- [X] T056 [US7] Add a `submit` function to a new `apps/react-frontend/src/services/reportsApi.ts` (depends on: T053)
- [X] T057 [US7] Add a "Report" action to each review (in `ReviewList.tsx`) and comment (in `CommentList.tsx`) that opens `ReportDialog` (depends on: T042, T055, T056)

**Checkpoint**: verifiable via quickstart.md Scenario 6.

---

## Phase 10: User Story 8 - Admin Moderation of Users, Games, Reviews/Comments, and Reports (Priority: P3)

**Goal**: An Admin manages user accounts (role change, deactivate/reactivate, delete),
hides/overrides games, removes any review/comment, and resolves reports (remove content or
dismiss); non-Admins are denied all of it.

**Independent Test**: As Admin — change a user's role, deactivate an account (it can no
longer log in) then reactivate it, delete an account (its content goes with it), hide a game
(now `404` for non-Admins), remove a reported review/comment, resolve a report; as a
non-Admin — every `/api/admin/*` call returns `403`. (quickstart.md Scenario 7.)

### Implementation for User Story 8

- [X] T058 [P] [US8] Create `UserRoleUpdateRequest` and `AdminUserResponse` (now includes `isDeactivated`) DTOs in `apps/GameRetro/GameRetro.Api/DTOs/Requests/UserRoleUpdateRequest.cs` and `DTOs/Responses/AdminUserResponse.cs`
- [X] T058a [P] [US8] Create `UserStatusUpdateRequest` DTO (`isDeactivated`) in `apps/GameRetro/GameRetro.Api/DTOs/Requests/UserStatusUpdateRequest.cs` (FR-018c)
- [X] T059 [P] [US8] Create `GameModerationRequest` DTO (`isHidden`, `titleOverride`, `descriptionOverride`, `coverImageUrlOverride`) in `apps/GameRetro/GameRetro.Api/DTOs/Requests/GameModerationRequest.cs`
- [X] T060 [US8] Create `IUserAdminService`/`UserAdminService` — lists accounts, changes a user's role via `UserManager`/`RoleManager` (remove from current role, add the new one, enforcing exactly one of Author/Admin per FR-008) — in `apps/GameRetro/GameRetro.Api/Services/IUserAdminService.cs` and `UserAdminService.cs` (depends on: T008, T009, T058)
- [X] T060a [US8] Add `DeactivateAsync(userId, isDeactivated)` (sets `ApplicationUser.IsDeactivated`, FR-018c) and `DeleteAsync(userId)` (calls `UserManager.DeleteAsync`; relies on T008's cascade to remove that account's Reviews/Comments/Reports, FR-018d) to `apps/GameRetro/GameRetro.Api/Services/UserAdminService.cs` (depends on: T060, T007, T008)
- [X] T061 [US8] Create `IGameModerationService`/`GameModerationService` — lazily creates the local `Game` row if needed, sets `IsHidden`/override fields (FR-018b) — in `apps/GameRetro/GameRetro.Api/Services/IGameModerationService.cs` and `GameModerationService.cs` (depends on: T008, T009, T059)
- [X] T062 [US8] Create `Controllers/Admin/AdminUsersController.cs` with `[Authorize(Roles = "Admin")]`, `GET /api/admin/users`, `PUT /api/admin/users/{userId}/role` in `apps/GameRetro/GameRetro.Api/Controllers/Admin/AdminUsersController.cs`, per [contracts/admin-api.md](./contracts/admin-api.md) (depends on: T060)
- [X] T062a [US8] Add `PUT /api/admin/users/{userId}/status` (200/404) and `DELETE /api/admin/users/{userId}` (204/404) to `apps/GameRetro/GameRetro.Api/Controllers/Admin/AdminUsersController.cs`, per contracts/admin-api.md (depends on: T060a, T058a)
- [X] T062b [US8] Modify `AuthService.LoginAsync` (feature 001; cross-feature edit, necessary because `IsDeactivated` lives on the shared `ApplicationUser`) to deny login and return the existing generic invalid-credentials response when `IsDeactivated` is `true`, per FR-018c and research.md's cross-feature note, in `apps/GameRetro/GameRetro.Api/Services/AuthService.cs` (depends on: T007)
- [X] T063 [US8] Create `Controllers/Admin/AdminGamesController.cs` with `[Authorize(Roles = "Admin")]`, `PUT /api/admin/games/{gameId}` in `apps/GameRetro/GameRetro.Api/Controllers/Admin/AdminGamesController.cs` (depends on: T061)
- [X] T064 [US8] Create `Controllers/Admin/AdminContentController.cs` with `[Authorize(Roles = "Admin")]`, `DELETE /api/admin/reviews/{reviewId}` and `DELETE /api/admin/comments/{commentId}` reusing `ReviewService`/`CommentService`'s delete logic without the author-ownership check, in `apps/GameRetro/GameRetro.Api/Controllers/Admin/AdminContentController.cs` (depends on: T026, T038)
- [X] T065 [US8] Add `ListAsync(status)` and `ResolveAsync(reportId, action)` to `apps/GameRetro/GameRetro.Api/Services/ReportService.cs` — action `RemoveContent` MUST set this report's `Status = Resolved` and save **before** deleting the target via `ReviewService`/`CommentService` (order matters: the target's Comments cascade-delete, but this Report survives via `SetNull` per T008 — reversing the order or relying on the old cascade would delete the report before it can be marked resolved, per F1 in the `/speckit-analyze` findings); `Dismiss` leaves content untouched and marks `Dismissed` (depends on: T052, T026, T038)
- [X] T066 [US8] Create `Controllers/Admin/AdminReportsController.cs` with `[Authorize(Roles = "Admin")]`, `GET /api/admin/reports?status=Open`, `POST /api/admin/reports/{reportId}/resolve` in `apps/GameRetro/GameRetro.Api/Controllers/Admin/AdminReportsController.cs`, per contracts/admin-api.md (depends on: T065)
- [X] T067 [US8] Register `IUserAdminService`/`IGameModerationService` in the DI container in `apps/GameRetro/GameRetro.Api/Program.cs` (depends on: T060, T061)
- [X] T068 [P] [US8] Create `apps/react-frontend/src/services/adminApi.ts` (users list/role update, games hide/override, review/comment delete, reports list/resolve)
- [X] T068a [US8] Add `updateUserStatus`/`deleteUser` functions to `apps/react-frontend/src/services/adminApi.ts` (depends on: T062a, T068)
- [X] T069 [P] [US8] Create `AdminUsersPage.tsx` (account list + role-change control) in `apps/react-frontend/src/pages/admin/AdminUsersPage.tsx`
- [X] T069a [US8] Add deactivate/reactivate controls and a delete control (with a confirmation step, since it's irreversible) to `AdminUsersPage.tsx` (depends on: T068a, T069)
- [X] T070 [P] [US8] Create `AdminGamesPage.tsx` (hide/unhide + override form) in `apps/react-frontend/src/pages/admin/AdminGamesPage.tsx`
- [X] T071 [P] [US8] Create `AdminReportsPage.tsx` (open-reports list, remove-content/dismiss actions) in `apps/react-frontend/src/pages/admin/AdminReportsPage.tsx`
- [X] T072 [US8] Add `/admin/users`, `/admin/games`, `/admin/reports` routes wrapped in the existing `RequireRole(["Admin"])` guard, plus an Admin nav section, in `apps/react-frontend/src/App.tsx` (depends on: T068, T069, T070, T071)

**Checkpoint**: all eight user stories independently functional, verifiable via quickstart.md Scenario 7.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Verification and hardening across all stories

- [X] T073 [P] Verify the review-list pagination (`GameDetailService.cs`, T011) and comment-list pagination (`CommentService.cs`, T032) actually bound query results end-to-end (e.g., request `pageSize=1` against a game/review with 2+ items and confirm only one comes back) — pagination itself was built into T011/T032 directly rather than deferred here, per `/speckit-analyze` finding D1
- [X] T074 [P] Verify every new endpoint/service method uses async/await and accepts a `CancellationToken`, per Constitution Principle IV, across all new files under `apps/GameRetro/GameRetro.Api/Controllers/` and `Services/`
- [X] T075 Manually execute quickstart.md Scenarios 1–7 end-to-end against a locally running API + frontend
- [X] T076 [P] Confirm no new NuGet/npm packages were actually needed beyond what's already installed (research.md); if any were added, update `docs/techstack.md` in the same change set per the constitution's Technology Stack Constraints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–10)**: All depend on Foundational completion
  - US1 and US2 are both P1; US2's review-writing is most useful once US1's detail page
    exists to display it on, but neither has a hard code dependency on the other beyond
    both needing `GameDetailPage.tsx`/`Game`/`Review` from Foundational
  - US3 depends on US2 existing (editing/deleting a review requires `ReviewService`/
    `ReviewsController` from US2)
  - US4 depends on US1/US2 existing (comments attach to a review, and are best demoed on
    the detail page)
  - US5 depends on US4 existing (editing/deleting a comment requires `CommentService`/
    `CommentsController` from US4)
  - US6 (profile) depends only on Foundational — independent of US1–US5
  - US7 (reports) depends on US2/US4 existing (something to report)
  - US8 (admin) depends on US2 (review delete), US4 (comment delete), and US7 (reports to
    resolve) all existing
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### Within Each User Story

- DTOs before services
- Services before controller endpoints
- Backend endpoint before the frontend page/function that calls it
- Story complete before moving to the next priority (if working sequentially)

### Parallel Opportunities

- Setup tasks T001–T002 can run in parallel
- Within Foundational, T003–T007 are each `[P]` and can run in parallel; T008–T009 are
  sequential (both touch/depend on the shared `AuthDbContext`)
- US1 and US2 can be staffed in parallel once Foundational is done (both only depend on
  Foundational, not on each other, even though US2 is most demoable after US1)
- US6 (profile) can be staffed in parallel with any other story, since it depends only on
  Foundational
- DTO-creation and independent component-creation tasks marked `[P]` within any story can
  run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch both independent User Story 1 DTO/component tasks together:
Task: "Create GameDetailResponse and ReviewResponse DTOs in apps/GameRetro/GameRetro.Api/DTOs/Responses/"
Task: "Create GameDetailPage.tsx in apps/react-frontend/src/pages/GameDetailPage.tsx"
Task: "Create ReviewList.tsx in apps/react-frontend/src/components/ReviewList.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (game detail page, empty-state)
4. Complete Phase 4: User Story 2 (write a review)
5. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 independently
6. Deploy/demo if ready — a detail page with real reviews is the smallest slice that
   delivers this feature's core value

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 + US2 → validate → demo (MVP: browse + review)
3. US3 → validate → demo (edit/delete own review)
4. US4 + US5 → validate → demo (comment, edit/delete own comment)
5. US6 → validate → demo (profile + password change)
6. US7 → validate → demo (reporting)
7. US8 → validate → demo (full admin moderation)
8. Phase 11 polish → run the full quickstart.md validation end-to-end

### Parallel Team Strategy

With multiple developers, after Foundational is done:
- Developer A: US1 → US3 (game detail, then review edit/delete)
- Developer B: US2 → US4 → US5 (write review, then comments)
- Developer C: US6 (profile, fully independent)
- Developer D: US7 → US8 (reports, then admin moderation) once US2/US4 land

Multiple stories touch `GameDetailPage.tsx`/`ReviewList.tsx`/`CommentList.tsx` and
`Program.cs` at points — coordinate merges on those shared files even though the stories
are otherwise independent.

---

## Notes

- `[P]` tasks = different files, no unmet dependencies
- `[Story]` label maps each task to its user story for traceability
- Every user story is independently completable and verifiable per its quickstart.md scenario
- No automated tests per Constitution v2.0.0 — verify manually against a running API + dev
  server before marking a task done
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
