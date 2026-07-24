# Research: Review Age Restriction (Retro-Only Reviews)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-24

This document resolves the technical unknowns for adding the 5-year review-eligibility rule
on top of the fully implemented feature 002 codebase: `GameDetailService` (assembles the
detail page), `ReviewService.SubmitAsync` (create-or-update review path),
`GameLibraryService` (IGDB metadata, currently exposing `ReleaseYear`/`Age` as ints), and
the `GameDetailPage`/`ReviewModal` frontend.

## Decision 1: Eligibility precision — full release date, not just release year

**Decision**: Extend `GameDto` with a `ReleaseDate` (`DateTime?`) field, populated from
IGDB's `first_release_date` unix timestamp (which `GameLibraryService.MapToDto` already
parses to a `DateTime` before discarding everything but the year). Eligibility is computed
from the full date: a game is eligible when `releaseDate <= utcNow.AddYears(-5)`
(inclusive at the boundary, per FR-001). The existing `ReleaseYear`/`Age` int fields stay
untouched for display purposes.

**Rationale**: The spec says "at least 5 full years have passed since its release" with an
inclusive boundary — that is a date comparison, not a year subtraction. The current
`Age = CurrentYear - ReleaseYear` arithmetic would misclassify games for most of the year
(a game released December 2021 would count as "5 years old" in January 2026, 7 months
early). IGDB already gives us the exact timestamp; the mapper already parses it; keeping
the full date is zero extra external cost and removes the boundary error entirely.

**Alternatives considered**:
- Year-based check (`Age >= 5` using existing fields) — rejected: up to ~11 months of
  misclassification either side of the boundary, contradicting FR-001's "5 full years."
- Store the release date on the local `Game` shadow row — rejected: the local row is
  moderation state, not a metadata cache (research 002, Decision 1); persisting IGDB data
  locally would create a staleness problem this feature doesn't need, since eligibility is
  evaluated live per request anyway (FR-005).

## Decision 2: Where the rule lives — one pure helper, enforced at two points

**Decision**: A single small static helper, `ReviewEligibility` (in
`apps/GameRetro/GameRetro.Api/Services/ReviewEligibility.cs`), owning the one rule:
`IsEligible(DateTime? releaseDate, DateTime utcNow)` plus
`EligibleAtUtc(DateTime? releaseDate)` (returns `releaseDate + 5 years`, or `null` when the
release date is unknown). It is called from exactly two places:

1. **`ReviewService.SubmitAsync`** — the authoritative server-side gate (FR-004). Enforced
   on the **create path only**: if the caller already has a review for this game, the
   update-in-place path proceeds regardless of current eligibility (spec edge case:
   authors are never locked out of their own existing content).
2. **`GameDetailService.GetDetailAsync`** — computes the same rule to populate two new
   response fields (Decision 3) so the frontend can render the correct state without
   duplicating the rule client-side.

**Rationale**: One pure function, two call sites, no new injected service — the rule is a
single date comparison, and wrapping it in an `IReviewEligibilityService` interface would
be exactly the over-abstraction Constitution Principle I prohibits (YAGNI). Static + pure
also makes the inclusive-boundary behavior trivially verifiable by inspection. Enforcing at
`SubmitAsync` (not just the UI) is what makes FR-004's "regardless of how the request is
made" hold; the detail-page fields exist only so the UI can explain the state, never as
the enforcement mechanism.

**Alternatives considered**:
- Injected `IReviewEligibilityService` — rejected: a one-line pure function needs no
  interface, no mocking (no automated tests per Constitution v2.0.0), and no DI ceremony.
- Frontend-only gating (hide the form when ineligible) — rejected outright: violates
  FR-004; a crafted request would bypass it.
- Blocking the update path too (fully freeze reviews on ineligible games) — rejected: the
  spec's edge case explicitly preserves authors' ability to edit/delete pre-existing
  reviews so they are never locked out of their own content.

## Decision 3: API surface — additive response fields + one new rejection outcome

**Decision**: No new endpoints. Two additive changes to existing contracts:

1. `GameDetailResponse` gains `IsEligibleForReview` (`bool`) and `ReviewEligibleAtUtc`
   (`DateTime?` — when the game becomes eligible; `null` when the release date is unknown,
   in which case `IsEligibleForReview` is also `false`, per FR-002). This powers FR-003's
   message and FR-008's "when it becomes eligible" display.
2. `POST /api/games/{gameId}/reviews` gains a new `403 Forbidden` rejection for ineligible
   games with body `{ "message": "this game is not yet eligible for review — it must be at
   least 5 years old" }` — distinct from the existing `404` (unknown/hidden game) and `400`
   (validation). `ReviewSubmitOutcome` gains a `GameNotEligible` value that
   `ReviewsController` maps to this 403.

**Rationale**: Additive fields keep the existing frontend and contracts backward-compatible.
`403` is the semantically correct status (the request is understood and authenticated but
refused as a matter of policy) and keeps the Constitution Principle III status-code
discipline: `404` still means "no such game," `400` still means "malformed submission."

**Alternatives considered**:
- Reusing `400` for the ineligibility rejection — rejected: it isn't a validation error in
  the caller's payload; muddying 400 would make the frontend's field-level error handling
  ambiguous.
- A separate `GET /api/games/{id}/review-eligibility` endpoint — rejected: the detail page
  already fetches `GameDetailResponse`; a second round-trip for two fields is waste (YAGNI).

## Decision 4: Frontend behavior

**Decision**: `GameDetailPage.tsx` (and the `ReviewModal` entry point) switch on the new
`isEligibleForReview` field: when `false`, the "write a review" button/form is replaced by
a static notice — "This game is not yet eligible for review — it must be at least 5 years
old." — appending "It becomes eligible in {year}." when `reviewEligibleAtUtc` is present
(FR-008), or "Its release date is not yet known." when it is `null` (FR-002). The existing
edit/delete controls on a user's own pre-existing review remain rendered regardless of
eligibility. As defense-in-depth, the reviews API's error path already surfaces the
server's `message` field, so even a stale page that submits anyway shows the server's 403
message inline (server remains the source of truth, per the spec's race-condition edge
case).

**Rationale**: Mirrors the existing Principle III pattern (explicit states, message text
from one source of truth) and adds no new components — it is a conditional render inside
the components that already own the review form.

**Alternatives considered**: None material — this is the only shape consistent with the
existing page structure.

## Summary of resolved unknowns

| Technical Context field | Resolution |
|---|---|
| Language/Version | C# / .NET 9 (backend); TypeScript + React 19 (frontend) — unchanged |
| Primary Dependencies | None new — IGDB already supplies `first_release_date`; no packages added |
| Storage | No schema change, no migration — eligibility is computed live (FR-005), nothing persisted |
| Testing | None — manual/functional verification only (Constitution v2.0.0) |
| Target Platform | Web: ASP.NET Core Web API + browser-based React SPA (unchanged) |
| Project Type | Web application (frontend + backend, existing `apps/` layout) |
| Performance Goals | Zero additional queries — eligibility derives from the IGDB fetch both call sites already perform |
| Constraints | Inclusive 5-year boundary on the full release date (Decision 1); unknown release date → ineligible (FR-002); create-path-only enforcement (Decision 2); rule uniform for all roles incl. Admin (FR-007) |
| Scale/Scope | Two backend services touched, one helper added, two DTO/contract additions, one frontend page conditional |

No `NEEDS CLARIFICATION` markers remain in the Technical Context.
