# Contract: Reports API (user-facing submission)

**Feature**: [../spec.md](../spec.md) | **Base path**: `/api/reports`

Admin-side viewing/resolution lives in [admin-api.md](./admin-api.md) — this contract
covers only the user-facing submission (User Story 7).

---

## `POST /api/reports`

Signed-in users. Reports a review or a comment (FR-016, FR-017).

**Request body** (exactly one of `reviewId`/`commentId` must be set):

```json
{
  "reviewId": "b3f1...",
  "commentId": null,
  "reason": "Harassment"
}
```

`reason` is one of: `Spam`, `Harassment`, `OffTopic`, `Other`.

**Responses**:

| Status | When | Body |
|---|---|---|
| 201 Created | Valid, first report by this user against this target | `ReportResponse`: `{ id, reviewId, commentId, reason, status, createdAt }` |
| 400 Bad Request | Neither/both of `reviewId`/`commentId` set, or `reason` missing/invalid | `{ "message": "..." }` |
| 409 Conflict | Caller already reported this exact target | `{ "message": "you have already reported this" }` |
| 404 Not Found | The referenced review/comment does not exist | `{ "message": "review not found" }` or `{ "message": "comment not found" }` |
