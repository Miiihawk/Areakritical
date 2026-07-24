# Contract: Review Eligibility — Changes to Existing Endpoints

**Feature**: [../spec.md](../spec.md) | Amends feature 002's
[games-and-reviews-api.md](../../002-game-reviews-moderation/contracts/games-and-reviews-api.md)

No new endpoints. Two additive changes.

---

## `GET /api/games/{gameId}` — response extended

`GameDetailResponse` gains two fields:

```json
{
  "...existing fields...": "unchanged",
  "isEligibleForReview": false,
  "reviewEligibleAtUtc": "2028-11-19T00:00:00Z"
}
```

| Case | `isEligibleForReview` | `reviewEligibleAtUtc` |
|---|---|---|
| Released ≥ 5 years ago (inclusive) | `true` | release date + 5 years (past) |
| Released < 5 years ago | `false` | release date + 5 years (future) — FR-008 |
| Release date unknown to the catalog | `false` (FR-002) | `null` |

All existing response fields and status codes unchanged.

---

## `POST /api/games/{gameId}/reviews` — new rejection case

A new `403 Forbidden` outcome is added for review **creation** against an ineligible game:

| Status | When | Body |
|---|---|---|
| 403 Forbidden | The game is ineligible (released < 5 years ago, or release date unknown) **and** the caller has no existing review for it (create path) | `{ "message": "this game is not yet eligible for review — it must be at least 5 years old" }` |

Unchanged existing outcomes: `201` (created), `200` (caller's existing review updated —
**still allowed even if the game is currently ineligible**, per the spec's author-lockout
edge case), `400` (payload validation), `404` (unknown or hidden game).

Precedence: `404` (unknown/hidden game) is evaluated before `403` (ineligible) — a hidden
game must stay indistinguishable from a missing one (feature 002's FR-021), so the
ineligibility of a hidden game is never revealed.

---

## Explicitly unchanged endpoints

`PUT /api/reviews/{reviewId}`, `DELETE /api/reviews/{reviewId}`, all comment endpoints, all
report endpoints, all `/api/admin/*` endpoints (FR-006, FR-007 — the rule gates review
creation only, uniformly for every role).
