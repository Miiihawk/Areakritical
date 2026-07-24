# Quickstart: Validating Game Reviews & Community Moderation

**Feature**: [spec.md](./spec.md) | **Contracts**: [contracts/](./contracts/) | **Data model**: [data-model.md](./data-model.md)

This guide validates the feature end-to-end once implemented. It does not include
implementation code — see `tasks.md` for build tasks. Assumes feature 001 (auth, including
Username) is already running.

## Prerequisites

- Backend and frontend set up per feature 001's quickstart (LocalDb migrated, `dotnet run`,
  `npm run dev`)
- An Author account and the seeded Admin account, both able to log in
- IGDB credentials configured (existing `Igdb:ClientId`/`Igdb:ClientSecret`), so game search
  returns real results

## Setup

```powershell
cd apps/GameRetro/GameRetro.Api
dotnet ef migrations add AddGameReviewsModeration
dotnet ef database update
dotnet run
```

## Scenario 1 — Game detail page, empty then populated (FR-001–FR-003, User Story 1)

1. As the Author, search for a game and open its detail page.
2. **Expected**: title/description/cover shown; "no reviews yet" state; no aggregate score.
3. Submit a review (Scenario 2 below), then reload the detail page.
4. **Expected**: the review now appears, with an aggregate score equal to that single
   review's overall score.

## Scenario 2 — Write and re-submit a review (FR-004–FR-006, FR-005a, User Story 2)

1. `POST /api/games/{gameId}/reviews` with all five mechanic scores (1–10) and text.
2. **Expected**: `201 Created`; `overallScore` equals the average of the five scores.
3. Submit again for the same game with different scores.
4. **Expected**: `200 OK` (not `201`) — the existing review is updated, not duplicated;
   the game detail page still shows exactly one review from this Author.
5. Submit with a missing mechanic score, then with a score of `11`.
6. **Expected**: both rejected `400` with a message naming the specific problem.

## Scenario 3 — Edit/delete own review, blocked for others (FR-007–FR-009, User Story 3)

1. `PUT /api/reviews/{reviewId}` as the review's author with new scores/text.
2. **Expected**: `200 OK`; game detail page reflects the update and recalculated aggregate.
3. Log in as a different Author; attempt the same `PUT`, then `DELETE /api/reviews/{reviewId}`.
4. **Expected**: both `403 Forbidden`.
5. As the original author, `DELETE /api/reviews/{reviewId}`.
6. **Expected**: `204`; review (and its comments, if any) no longer appear; aggregate score
   recalculates without it.

## Scenario 4 — Comment on a review, edit/delete own (FR-010–FR-013, User Stories 4–5)

1. `POST /api/reviews/{reviewId}/comments` with non-empty text → `201`.
2. `POST` with empty text → `400`.
3. `PUT /api/comments/{commentId}` as its author → `200`, text updated.
4. As a different user, attempt `PUT`/`DELETE` on that comment → both `403`.
5. As its author, `DELETE /api/comments/{commentId}` → `204`, comment no longer shown.

## Scenario 5 — Edit own profile, including password change (FR-014–FR-015, FR-014a–FR-014b, User Story 6)

1. `GET /api/profile` → shows current `username`/`email`/`displayName`/`bio`.
2. `PUT /api/profile` with a new `displayName` → `200`, updated.
3. View an existing review/comment by this user.
4. **Expected**: the new `displayName` is shown, not a stale snapshot (FR-015).
5. `PUT /api/profile` with `displayName: ""` → `400`.
6. `POST /api/profile/password` with matching `newPassword`/`confirmNewPassword` → `204`.
7. Log out, then log in again using the *new* password.
8. **Expected**: login succeeds — no current-password field was ever required to make this
   change (FR-014a).
9. `POST /api/profile/password` with a `newPassword`/`confirmNewPassword` that don't match
   → `400`, password unchanged (confirm by logging in again with the *old* password —
   should still work).
10. `POST /api/profile/password` with a `newPassword` that violates the password policy
    (e.g., too short) → `400`, password unchanged.

## Scenario 6 — Report a review/comment (FR-016–FR-017, User Story 7)

1. `POST /api/reports` with `reviewId` set and a `reason` → `201`.
2. Repeat the exact same report (same user, same review) → `409 Conflict`.
3. `POST /api/reports` with no `reason` → `400`.

## Scenario 7 — Admin moderation (FR-018–FR-021, User Story 8)

1. As Admin, `GET /api/admin/users` → lists accounts; `PUT /api/admin/users/{id}/role` with
   `{ "role": "Admin" }` on an Author account → `200`; that account can now reach
   `/api/admin/*` endpoints.
2. As Admin, `PUT /api/admin/users/{id}/status` with `{ "isDeactivated": true }` on a
   different Author account.
3. **Expected**: that account can no longer log in (same generic invalid-credentials
   response as any other failed login — FR-018c). `PUT` again with `{ "isDeactivated":
   false }` → the account can log in again.
4. As Admin, `DELETE /api/admin/users/{id}` on an Author account that has an existing
   review/comment.
5. **Expected**: `204`; that account can no longer log in, and its review/comment no
   longer appear anywhere (FR-018d).
6. As Admin, `PUT /api/admin/games/{gameId}` with `{ "isHidden": true }`.
7. **Expected**: as a non-Admin, `GET /api/games/{gameId}` now returns `404` ("game not
   found"); as Admin, it still returns `200`. `PUT` again with `{ "isHidden": false }` →
   visible again to non-Admins.
8. As Admin, `GET /api/admin/reports?status=Open` → shows the report from Scenario 6.
9. `POST /api/admin/reports/{reportId}/resolve` with `{ "action": "RemoveContent" }`.
10. **Expected**: the reported review/comment is gone from the regular detail page; the
    report's status is `Resolved` (not deleted along with its target — confirm with
    `GET /api/admin/reports?status=Resolved`).
11. As a non-Admin, attempt any `/api/admin/*` endpoint → `403 Forbidden`.

## Frontend UX checks (Constitution Principle III)

- `GameDetailPage` shows explicit loading/error/"no reviews yet"/"game not found" states.
- `ReviewForm`/`CommentForm` show inline validation messages matching the API's `message`
  field, not raw errors.
- Admin pages (`AdminUsersPage`/`AdminGamesPage`/`AdminReportsPage`) are unreachable (via
  `RequireRole`) for a signed-in Author, redirecting or showing "not authorized" instead of
  a blank/broken page.
