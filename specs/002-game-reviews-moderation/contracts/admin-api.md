# Contract: Admin Moderation API

**Feature**: [../spec.md](../spec.md) | **Base path**: `/api/admin/*` | User Story 8

All endpoints below require the caller's role to be Admin (FR-018); non-Admin callers
receive `403 Forbidden`, `{ "message": "not authorized" }`.

---

## Users — `/api/admin/users`

### `GET /api/admin/users`

Lists accounts. `200 OK` — `AdminUserResponse[]`: `{ id, username, email, role, isDeactivated, createdAt }`.

### `PUT /api/admin/users/{userId}/role`

Changes an account's role (FR-018a).

**Request body**: `{ "role": "Admin" }` (or `"Author"`).

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Role changed | `AdminUserResponse` |
| 400 Bad Request | `role` is not exactly `"Admin"` or `"Author"` | `{ "message": "..." }` |
| 404 Not Found | User does not exist | `{ "message": "user not found" }` |

### `PUT /api/admin/users/{userId}/status`

Deactivates or reactivates an account (FR-018c). A deactivated account cannot log in
(enforced in feature 001's `AuthService.LoginAsync`).

**Request body**: `{ "isDeactivated": true }` (or `false` to reactivate).

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Status changed | `AdminUserResponse` |
| 404 Not Found | User does not exist | `{ "message": "user not found" }` |

### `DELETE /api/admin/users/{userId}`

Deletes an account (FR-018d). Cascades to delete that account's Reviews, Comments, and
Reports (data-model.md's `ApplicationUser` Delete behavior).

**Responses**:

| Status | When | Body |
|---|---|---|
| 204 No Content | Deleted | *(empty)* |
| 404 Not Found | User does not exist | `{ "message": "user not found" }` |

---

## Games — `/api/admin/games/{gameId}`

### `PUT /api/admin/games/{gameId}`

Hides/unhides a game and/or sets detail overrides (FR-018b). Lazily creates the local
`Game` shadow row if it doesn't exist yet (research.md Decision 1).

**Request body**: `{ "isHidden": true, "titleOverride": null, "descriptionOverride": null, "coverImageUrlOverride": null }`

**Response**: `200 OK` — `{ id, isHidden, titleOverride, descriptionOverride, coverImageUrlOverride }`

---

## Reviews & Comments (Admin removal)

### `DELETE /api/admin/reviews/{reviewId}`

Removes any review regardless of author (FR-018, cascades per data-model.md).
`204 No Content`, or `404 Not Found` — `{ "message": "review not found" }`.

### `DELETE /api/admin/comments/{commentId}`

Removes any comment regardless of author. `204 No Content`, or `404 Not Found` —
`{ "message": "comment not found" }`.

---

## Reports — `/api/admin/reports`

### `GET /api/admin/reports?status=Open`

Lists reports (default: open only). `200 OK` — `ReportResponse[]` (each includes enough
context — e.g., the reported review/comment's text and target game — for an Admin to judge
it without a separate lookup).

### `POST /api/admin/reports/{reportId}/resolve`

Resolves a report (FR-019).

**Request body**: `{ "action": "RemoveContent" }` or `{ "action": "Dismiss" }`

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | `RemoveContent`: this report is marked `Resolved` first, then its target review/comment is deleted (any Comments on a deleted Review cascade too); the Report row survives the deletion with a null target, since Report→Review/Comment uses `SetNull`, not cascade (research.md Decision 3, revised) | `ReportResponse` (status `Resolved`) |
| 200 OK | `Dismiss`: content is left untouched, report marked `Dismissed` | `ReportResponse` (status `Dismissed`) |
| 400 Bad Request | Invalid `action` | `{ "message": "..." }` |
| 404 Not Found | Report does not exist | `{ "message": "report not found" }` |
| 409 Conflict | Report already resolved/dismissed | `{ "message": "report already resolved" }` |
