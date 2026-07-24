# Contract: Game Detail & Reviews API

**Feature**: [../spec.md](../spec.md) | **Base paths**: `/api/games`, `/api/games/{gameId}/reviews`

All error responses share `{ "message": "..." }` per Constitution Principle III.

---

## `GET /api/games/{gameId}`

Signed-in users only (existing `[Authorize]` on `GamesController`, unchanged). Returns the
game's detail info merged with any local Admin overrides (User Story 1, FR-001/FR-002/FR-003).

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Game exists and is not hidden (or caller is Admin) | `GameDetailResponse`: `{ id, title, description, coverImageUrl, releaseYear, age, systemRequirements, aggregateScore: number \| null, reviewCount: number, reviews: ReviewResponse[] }` — `aggregateScore` is `null` and `reviews` is `[]` when `reviewCount` is 0 (FR-003) |
| 404 Not Found | Game id unknown to IGDB, **or** hidden by an Admin and caller is not Admin | `{ "message": "game not found" }` |

`ReviewResponse`: `{ id, gameId, authorId, authorDisplayName, gameplayScore, storyScore, audiovisualScore, replayabilityScore, overallEnjoymentScore, overallScore, text, createdAt, updatedAt }`

---

## `POST /api/games/{gameId}/reviews`

Signed-in users. Creates or updates the caller's own review for this game (FR-004, FR-005,
FR-005a).

**Request body**:

```json
{
  "gameplayScore": 8,
  "storyScore": 7,
  "audiovisualScore": 9,
  "replayabilityScore": 6,
  "overallEnjoymentScore": 8,
  "text": "Great game, a few pacing issues in act two."
}
```

**Responses**:

| Status | When | Body |
|---|---|---|
| 201 Created | Caller had no existing review for this game | `ReviewResponse` |
| 200 OK | Caller already had a review for this game — updated in place (FR-005a) | `ReviewResponse` |
| 400 Bad Request | Missing/out-of-range mechanic score, or empty text | `{ "message": "..." }` naming the specific field |
| 404 Not Found | Game hidden/unknown | `{ "message": "game not found" }` |

---

## `PUT /api/reviews/{reviewId}`

Signed-in users; must be the review's author (FR-007, FR-009).

**Request body**: same shape as the POST above.

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Updated | `ReviewResponse` |
| 400 Bad Request | Validation failure | `{ "message": "..." }` |
| 403 Forbidden | Caller is not this review's author (and not Admin — Admin removal is a separate endpoint, see admin-api.md) | `{ "message": "not authorized" }` |
| 404 Not Found | Review does not exist | `{ "message": "review not found" }` |

---

## `DELETE /api/reviews/{reviewId}`

Signed-in users; must be the review's author (FR-008, FR-009). Cascades to the review's
comments and any reports on the review or its comments (data-model.md).

**Responses**:

| Status | When | Body |
|---|---|---|
| 204 No Content | Deleted | *(empty)* |
| 403 Forbidden | Caller is not this review's author | `{ "message": "not authorized" }` |
| 404 Not Found | Review does not exist | `{ "message": "review not found" }` |
