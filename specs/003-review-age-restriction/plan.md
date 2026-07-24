# Implementation Plan: Review Age Restriction (Retro-Only Reviews)

**Branch**: `003-review-age-restriction` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-review-age-restriction/spec.md`

## Summary

Block new reviews on games released less than 5 years ago (or with unknown release dates):
the detail page replaces the "write a review" form with a plain-language ineligibility
message (including when the game becomes eligible, when known), and the review-creation
endpoint rejects ineligible submissions server-side regardless of how they arrive. Editing
and deleting pre-existing reviews stays allowed; all other flows are untouched. Technical
approach: surface IGDB's full `first_release_date` as a new `ReleaseDate` field on
`GameDto` (the mapper already parses it and currently keeps only the year), add one pure
static helper `ReviewEligibility` holding the single inclusive `releaseDate <=
utcNow.AddYears(-5)` rule, enforce it on `ReviewService.SubmitAsync`'s create path (new
`GameNotEligible` outcome → `403`), and expose `IsEligibleForReview` +
`ReviewEligibleAtUtc` on `GameDetailResponse` so `GameDetailPage.tsx` can render the
correct state. No schema change, no migration, no new packages.

## Technical Context

**Language/Version**: C# / .NET 9 (backend, `apps/GameRetro/GameRetro.Api`); TypeScript +
React 19 with Vite (frontend, `apps/react-frontend`) — unchanged

**Primary Dependencies**: None new. IGDB already returns `first_release_date`
(unix timestamp) in every game query (`GameLibraryService.GameFields`); this feature stops
discarding its sub-year precision.

**Storage**: No schema change and no migration — eligibility is computed live from IGDB
data at view/submission time (FR-005); nothing is persisted (research.md Decision 1).

**Testing**: No automated test suite (Constitution v2.0.0, Principle II). Behavior verified
manually per quickstart.md, using games with known release dates on both sides of the
5-year boundary.

**Target Platform**: Web — ASP.NET Core Web API + browser-based React SPA (unchanged)

**Project Type**: Web application (frontend + backend, existing `apps/` layout)

**Performance Goals**: Zero additional queries or external calls — both enforcement points
(`GameDetailService.GetDetailAsync`, `ReviewService.SubmitAsync` create path) derive
eligibility from an IGDB fetch they already perform or already need (see Constitution
Check note on `SubmitAsync` below); the rule itself is one date comparison.

**Constraints**: Inclusive boundary — exactly 5 years old is eligible (FR-001); unknown
release date → ineligible (FR-002); enforcement on review *creation* only — updates and
deletes of existing reviews are exempt (spec edge case); rule applies to every role
including Admin (FR-007); server-side evaluation at submission time is the source of truth
for races around the threshold (spec edge case)

**Scale/Scope**: Small, surgical change — one new helper file, two services touched, two
DTOs extended, one controller mapping added, one frontend page conditional

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality | The rule lives in exactly one place (`ReviewEligibility`, a pure static helper — deliberately *not* a new injected service interface, per YAGNI: it is a single date comparison with no dependencies) and is called from the two services that need it. Controllers stay thin: `ReviewsController` only maps the new `GameNotEligible` outcome to a 403; no logic added there. The change is traceable end-to-end: IGDB timestamp → `GameDto.ReleaseDate` → `ReviewEligibility` → outcome/response field. | PASS |
| II. Validation Standards | Each touched path is verified manually against a running API + dev server per quickstart.md: an ineligible game (page state + direct 403), an eligible game (unchanged flow), the exact-boundary case, and the unknown-release-date case. | PASS |
| III. User Experience Consistency | The ineligibility state is an explicit rendered state (never a blank/broken form area); the rejection message wording comes from the server's `{ "message": ... }` payload, matching the existing error-shape convention; status codes stay honest — new `403` for policy refusal, `404` still means unknown/hidden game, `400` still means payload validation. FR-008's "when eligible" detail is shown whenever the release date is known. | PASS |
| IV. Performance Requirements | No new queries, no new external calls, no collection endpoints touched; all touched code paths remain async with `CancellationToken` flowing through unchanged. One note: `ReviewService.SubmitAsync` currently skips the IGDB fetch when the local `Game` row already exists — the eligibility gate needs the release date, so the create path now always fetches IGDB once (the same single call the first-ever review for a game already makes; an edit submission for an existing review skips the gate and adds no call). | PASS |

No violations identified. Complexity Tracking is not needed for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/003-review-age-restriction/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── review-eligibility-changes.md   # additive changes to existing 002 contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/
├── GameRetro/
│   └── GameRetro.Api/
│       ├── DTOs/Responses/
│       │   ├── GameDto.cs                  # + ReleaseDate (DateTime?) from IGDB first_release_date
│       │   └── GameDetailResponse.cs       # + IsEligibleForReview (bool), ReviewEligibleAtUtc (DateTime?)
│       ├── Services/
│       │   ├── ReviewEligibility.cs        # NEW — pure static helper; the single 5-year rule
│       │   ├── GameLibraryService.cs       # MapToDto keeps the parsed release DateTime, not just Year
│       │   ├── GameDetailService.cs        # populate the two new response fields
│       │   ├── IReviewService.cs           # ReviewSubmitOutcome + GameNotEligible
│       │   └── ReviewService.cs            # SubmitAsync create-path gate (fetch IGDB, check eligibility)
│       └── Controllers/
│           └── ReviewsController.cs        # map GameNotEligible → 403 { message }
└── react-frontend/
    └── src/
        ├── services/gamesApi.ts            # Game/GameDetail types + isEligibleForReview, reviewEligibleAtUtc
        └── pages/GameDetailPage.tsx        # ineligible state replaces the write-review entry point
                                            # (ReviewModal untouched internally — it is simply not opened)
```

**Structure Decision**: Purely additive edits inside the existing feature-002 structure —
no new folders, controllers, services (beyond one static helper file), pages, or packages.
This is the "smallest slice explainable end to end" the constitution's workflow section
asks for: timestamp → helper → gate/field → page state.

## Complexity Tracking

> No entries — Constitution Check reported no violations.
