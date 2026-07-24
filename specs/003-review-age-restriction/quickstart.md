# Quickstart: Validating Review Age Restriction

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/review-eligibility-changes.md](./contracts/review-eligibility-changes.md) | **Data model**: [data-model.md](./data-model.md)

Validates the 5-year review-eligibility rule end-to-end once implemented. Assumes features
001/002 are running (auth + reviews working). No migration is needed for this feature.

## Prerequisites

- Backend + frontend running per feature 002's quickstart (API `dotnet run`, `npm run dev`)
- An Author account and the seeded Admin account
- IGDB credentials configured, and three test games identified in the catalog:
  - **RECENT**: released less than 5 years ago (any current-gen title)
  - **RETRO**: released well over 5 years ago
  - **UNDATED**: a game IGDB lists without a release date (e.g., an unreleased/TBD title
    found via search)

## Scenario 1 — Ineligible game: page state (FR-003, FR-008, User Story 1)

1. As the Author, open RECENT's detail page.
2. **Expected**: game details render normally (title/cover/description); the "write a
   review" button/form is absent; a plain-language notice appears instead, including the
   year it becomes eligible (release year + 5).
3. `GET /api/games/{RECENT_id}` directly.
4. **Expected**: `200` with `isEligibleForReview: false` and a future `reviewEligibleAtUtc`.

## Scenario 2 — Ineligible game: server-side gate (FR-004, SC-001)

1. As the Author (who has no review on RECENT), `POST /api/games/{RECENT_id}/reviews` with
   a fully valid body (all five scores + text).
2. **Expected**: `403 Forbidden`, `{ "message": "this game is not yet eligible for review — it must be at least 5 years old" }`; no review appears on the page afterward.
3. Repeat as the Admin.
4. **Expected**: same `403` — the rule is uniform across roles (FR-007).

## Scenario 3 — Eligible game unaffected (FR-001, SC-002, User Story 2)

1. Open RETRO's detail page.
2. **Expected**: the review form appears as before this feature; `GET /api/games/{RETRO_id}`
   shows `isEligibleForReview: true`.
3. Submit a review → `201`; edit it → `200`; comment on it, report it, delete it.
4. **Expected**: every flow behaves exactly as in feature 002's quickstart (no regression).

## Scenario 4 — Unknown release date (FR-002)

1. Open UNDATED's detail page.
2. **Expected**: ineligible notice, worded for the unknown-date case (no eligibility year
   shown); `GET /api/games/{UNDATED_id}` shows `isEligibleForReview: false`,
   `reviewEligibleAtUtc: null`.
3. `POST /api/games/{UNDATED_id}/reviews` with a valid body → `403`.

## Scenario 5 — Boundary and precedence checks

1. Find (or reason about) a game whose release date is as close to exactly 5 years ago as
   the catalog offers.
2. **Expected**: a game at or past the boundary is eligible (inclusive rule, FR-001);
   verify via `isEligibleForReview` rather than the year fields (the check uses the full
   date, not year arithmetic).
3. As Admin, hide RECENT (feature 002's `PUT /api/admin/games/{id}`), then as the Author
   `POST` a review to it.
4. **Expected**: `404` (not `403`) — hidden-game secrecy takes precedence over the
   eligibility rejection (see contract's precedence note). Unhide afterward.

## Scenario 6 — Existing review on an ineligible game stays editable (spec edge case)

*Requires a pre-existing review on a now-ineligible game. If none exists naturally, this
scenario can be validated at implementation time by temporarily seeding one directly in the
database, or deferred with a note.*

1. With a review of the Author's own on an ineligible game, `PUT /api/reviews/{reviewId}`
   with changed scores.
2. **Expected**: `200` — the author is not locked out of existing content; only *creation*
   is gated.
3. `DELETE /api/reviews/{reviewId}` → `204`.
4. After deletion, `POST` a new review for the same game → `403` (the create gate now
   applies — deleting forfeited the pre-restriction review).

## Frontend UX checks (Constitution Principle III)

- The ineligibility notice is a deliberate rendered state — no blank space where the form
  was, no broken button.
- The notice includes the eligibility year when the release date is known (FR-008) and a
  "release date not yet known" variant otherwise (FR-002).
- If a stale page submits anyway (e.g., form was open in another tab), the server's `403`
  message surfaces inline via the existing error display, not as an unhandled failure.
