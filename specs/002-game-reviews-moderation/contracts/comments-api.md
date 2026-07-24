# Contract: Comments API

**Feature**: [../spec.md](../spec.md) | **Base paths**: `/api/reviews/{reviewId}/comments`, `/api/comments/{commentId}`

---

## `GET /api/reviews/{reviewId}/comments?page=&pageSize=`

Signed-in users. Lists comments on a review, paginated (Constitution Principle IV — found
missing entirely during `/speckit-analyze`'s D1 remediation; the frontend's `CommentList`
had no endpoint to read from).

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Review exists | `{ comments: CommentResponse[], page, pageSize, totalCount }` |
| 404 Not Found | Review does not exist (or its game is hidden) | `{ "message": "review not found" }` |

---

## `POST /api/reviews/{reviewId}/comments`

Signed-in users. Creates a comment on a review (FR-010, User Story 4).

**Request body**: `{ "text": "I disagree about the pacing." }`

**Responses**:

| Status | When | Body |
|---|---|---|
| 201 Created | Non-empty text | `CommentResponse`: `{ id, reviewId, authorId, authorDisplayName, text, createdAt, updatedAt }` |
| 400 Bad Request | Empty/whitespace-only text | `{ "message": "comment cannot be empty" }` |
| 404 Not Found | Review does not exist (or its game is hidden) | `{ "message": "review not found" }` |

---

## `PUT /api/comments/{commentId}`

Signed-in users; must be the comment's author (FR-011, FR-013).

**Request body**: same shape as the POST above.

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Updated | `CommentResponse` |
| 400 Bad Request | Empty text | `{ "message": "comment cannot be empty" }` |
| 403 Forbidden | Caller is not this comment's author | `{ "message": "not authorized" }` |
| 404 Not Found | Comment does not exist | `{ "message": "comment not found" }` |

---

## `DELETE /api/comments/{commentId}`

Signed-in users; must be the comment's author (FR-012, FR-013). Cascades to delete any
reports targeting the comment.

**Responses**:

| Status | When | Body |
|---|---|---|
| 204 No Content | Deleted | *(empty)* |
| 403 Forbidden | Caller is not this comment's author | `{ "message": "not authorized" }` |
| 404 Not Found | Comment does not exist | `{ "message": "comment not found" }` |
