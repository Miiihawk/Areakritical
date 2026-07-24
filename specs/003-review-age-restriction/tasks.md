---

description: "Task list template for feature implementation"
---

# Tasks: Review Age Restriction (Retro-Only Reviews)

**Input**: Design documents from `/specs/003-review-age-restriction/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/review-eligibility-changes.md](./contracts/review-eligibility-changes.md), [quickstart.md](./quickstart.md)

**Tests**: Not included. Per Constitution v2.0.0 (Principle II — Validation Standards), this
project does not require automated test files; each user story phase ends with a manual
verification checkpoint tied to its quickstart.md scenario instead.

**Organization**: Tasks are grouped by user story (from spec.md). This is a small, surgical
change on top of the fully implemented feature 002 codebase — no new packages, no
migration, no new folders.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths are included in every description

## Path Conventions

- Backend: `apps/GameRetro/GameRetro.Api/`
- Frontend: `apps/react-frontend/src/`

---

## Phase 1: Setup

**Purpose**: N/A — no new packages, folders, or scaffolding are required (research.md:
zero new dependencies). This phase is intentionally empty; proceed to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared primitive — a full release date on `GameDto` and the pure
eligibility rule — that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Add `ReleaseDate` (`DateTime?`) to the `GameDto` record in `apps/GameRetro/GameRetro.Api/DTOs/Responses/GameDto.cs`, alongside the existing `ReleaseYear`/`Age` fields (research.md Decision 1)
- [X] T002 Update `GameLibraryService.MapToDto` in `apps/GameRetro/GameRetro.Api/Services/GameLibraryService.cs` to also populate `ReleaseDate` from the already-parsed `first_release_date` UTC `DateTime` (it currently derives `year`/`age` from this value and discards the date itself — keep it) (depends on: T001)
- [X] T003 [P] Create the pure static helper `ReviewEligibility` — `IsEligible(DateTime? releaseDate, DateTime utcNow)` (inclusive: `releaseDate <= utcNow.AddYears(-5)`; `false` when `releaseDate` is `null`, FR-002) and `EligibleAtUtc(DateTime? releaseDate)` (returns `releaseDate?.AddYears(5)`) — in `apps/GameRetro/GameRetro.Api/Services/ReviewEligibility.cs` (research.md Decision 2 — deliberately not an injected service; no DI registration needed)

**Checkpoint**: The date and eligibility primitives exist and are unit-correct by
inspection; ready to be wired into the two enforcement/display points.

---

## Phase 3: User Story 1 - Blocked from Reviewing a Too-Recent Game (Priority: P1) 🎯 MVP

**Goal**: An ineligible game's detail page replaces the review form with a clear message,
and any review-creation attempt against it is rejected server-side regardless of how it
arrives.

**Independent Test**: Open an ineligible game's detail page → form replaced by a message
naming when it becomes eligible; `POST` a review directly to it → `403` with the same
message; no review is created. (quickstart.md Scenarios 1, 2, 4.)

### Implementation for User Story 1

- [X] T004 [US1] Add a `GameNotEligible` value to `ReviewSubmitOutcome` in `apps/GameRetro/GameRetro.Api/Services/IReviewService.cs`
- [X] T005 [US1] In `ReviewService.SubmitAsync` (`apps/GameRetro/GameRetro.Api/Services/ReviewService.cs`), make the create path always fetch the game's IGDB record (previously fetched only when the local `Game` row didn't exist yet), call `ReviewEligibility.IsEligible` against its `ReleaseDate`, and return `GameNotEligible` when ineligible **and** the caller has no existing review for this game; when the caller already has an existing review, skip the gate entirely and proceed to the existing update-in-place path unchanged (spec edge case — authors are never locked out of their own content) (depends on: T002, T003, T004)
- [X] T006 [US1] In `ReviewsController` (`apps/GameRetro/GameRetro.Api/Controllers/ReviewsController.cs`), map the new `GameNotEligible` outcome to `403 Forbidden` with body `{ "message": "this game is not yet eligible for review — it must be at least 5 years old" }`, keeping the existing `404` (unknown/hidden game) check evaluated first so a hidden game's ineligibility is never revealed (contracts/review-eligibility-changes.md precedence note) (depends on: T005)
- [X] T007 [US1] Add `IsEligibleForReview` (`bool`) and `ReviewEligibleAtUtc` (`DateTime?`) to `GameDetailResponse` in `apps/GameRetro/GameRetro.Api/DTOs/Responses/GameDetailResponse.cs`
- [X] T008 [US1] In `GameDetailService.GetDetailAsync` (`apps/GameRetro/GameRetro.Api/Services/GameDetailService.cs`), compute and populate the two new fields via `ReviewEligibility` against the fetched IGDB `ReleaseDate` (falling back to ineligible/`null` when IGDB has no release date, FR-002) (depends on: T003, T007)
- [X] T009 [P] [US1] Add `isEligibleForReview`/`reviewEligibleAtUtc` to the game-detail type in `apps/react-frontend/src/services/gamesApi.ts` (depends on: T007)
- [X] T010 [US1] In `GameDetailPage.tsx` (`apps/react-frontend/src/pages/GameDetailPage.tsx`), replace the "write a review" entry point with a plain-language ineligibility notice when `isEligibleForReview` is `false` — including the eligible year when `reviewEligibleAtUtc` is present (FR-008), and an "release date not yet known" variant when it is `null` (FR-002); leave the entry point for the caller's own existing review (edit/delete) rendered regardless (depends on: T009)

**Checkpoint**: User Story 1 is fully functional, verifiable via quickstart.md Scenarios 1, 2, and 4.

---

## Phase 4: User Story 2 - Reviewing an Eligible (5+ Year Old) Game Still Works (Priority: P1)

**Goal**: Nothing built in User Story 1 leaks into the eligible-game path — the existing
review flow from feature 002 is provably untouched.

**Independent Test**: Open an eligible (5+ year old) game's detail page → review form
present as before; submit, edit, comment, report, delete → all succeed exactly as in
feature 002. (quickstart.md Scenario 3; boundary case in Scenario 5.)

### Implementation for User Story 2

- [X] T011 [US2] Re-read `ReviewService.SubmitAsync` (`apps/GameRetro/GameRetro.Api/Services/ReviewService.cs`) and confirm the `GameNotEligible` gate from T005 is reached only on the create path for an ineligible game — an eligible game's create path, and *any* game's update-in-place path, must fall through to the pre-existing logic with zero behavior change
- [ ] T012 [US2] Manually execute quickstart.md Scenario 3 end-to-end (an eligible game: view → submit → edit → comment → report → delete) against a running API + dev server, confirming no regression from feature 002 — ⏳ PENDING: requires the API rebuilt+restarted (the currently-running instance holds the pre-feature binary), an authenticated Author session, and a known RETRO game; not runnable non-interactively

**Checkpoint**: User Stories 1 AND 2 both verified independently, via quickstart.md Scenarios 1–3.

---

## Phase 5: User Story 3 - Existing Interactions on Eligible Games Are Unaffected (Priority: P2)

**Goal**: Confirm the eligibility rule has zero footprint outside review *creation* —
comments, reports, edits/deletes of existing reviews, and Admin moderation are all
untouched, even on an ineligible game.

**Independent Test**: On a pre-existing review of a now-ineligible game, edit and delete
still succeed; comment/report flows on any review are unaffected; a brand-new review
attempt on that same ineligible game after deletion is correctly gated. (quickstart.md
Scenario 6.)

### Implementation for User Story 3

- [X] T013 [US3] Confirm `ReviewService.UpdateAsync` and `DeleteAsync` (`apps/GameRetro/GameRetro.Api/Services/ReviewService.cs`) have no `ReviewEligibility` reference — pre-existing reviews stay editable/deletable by their authors regardless of the parent game's current eligibility (spec edge case)
- [X] T014 [US3] Confirm `CommentsController`, `ReportsController`, and every controller under `apps/GameRetro/GameRetro.Api/Controllers/Admin/` have no `ReviewEligibility` reference — the rule gates review *creation* only, uniformly for every role (FR-006, FR-007)
- [ ] T015 [US3] Manually execute quickstart.md Scenario 6 (edit/delete a pre-existing review on a now-ineligible game; then confirm a fresh review attempt on that same game after deletion is gated) against a running API + dev server — ⏳ PENDING: requires a rebuilt+restarted API, an authenticated Author session, and a seeded pre-existing review; not runnable non-interactively

**Checkpoint**: All three user stories verified independently via quickstart.md.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Boundary/precedence verification and hardening

- [ ] T016 [P] Manually execute quickstart.md Scenario 5 (inclusive-boundary reasoning using the full release date, not year arithmetic; hidden-game `404` takes precedence over the `403` eligibility rejection) against a running API + dev server — ⏳ PENDING: requires a rebuilt+restarted API + authenticated session + IGDB boundary/hidden test games; precedence is implemented (404 arm listed before 403 in `ReviewsController` and hidden-game short-circuit in `ReviewService`) but not yet exercised live
- [X] T017 [P] Verify the now-unconditional IGDB fetch added to `ReviewService.SubmitAsync`'s create path (T005) remains `async`/`await` with `CancellationToken` honored throughout, per Constitution Principle IV, in `apps/GameRetro/GameRetro.Api/Services/ReviewService.cs`
- [ ] T018 Manually execute quickstart.md Scenarios 1–6 end-to-end against a locally running API + frontend — ⏳ PENDING: full E2E sweep; requires a rebuilt+restarted API, an authenticated Author + Admin session, IGDB credentials, and RECENT/RETRO/UNDATED test games; not runnable non-interactively
- [X] T019 [P] Confirm no new NuGet/npm packages were added (research.md: none expected); update `docs/techstack.md` only if that changes, per the constitution's Technology Stack Constraints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty — no dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T001→T002; T003 independent of T001/T002)
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 depends only on Foundational — it is the entire enforcement/display mechanism
  - US2 depends on US1 (T005/T008) existing, since it verifies US1's gate correctly *excludes* eligible games rather than being a separate code path
  - US3 depends on US1 (T005) existing, since it verifies US1's gate correctly *excludes* update/delete/comment/report/admin paths
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- DTO/enum additions before the service logic that uses them
- Service logic before the controller mapping that exposes it
- Backend response fields before the frontend code that reads them

### Parallel Opportunities

- T001 and T003 (Foundational) can run in parallel — different files, no shared dependency
- T009 (frontend type) can run in parallel with backend tasks T004–T008 once T007 (the
  response shape) is agreed, though in practice T007 lands first since it's the contract
- T016, T017, T019 (Polish) can run in parallel — independent verification passes

---

## Parallel Example: Foundational

```bash
# Launch both Foundational primitives together:
Task: "Add ReleaseDate (DateTime?) to GameDto in apps/GameRetro/GameRetro.Api/DTOs/Responses/GameDto.cs"
Task: "Create ReviewEligibility static helper in apps/GameRetro/GameRetro.Api/Services/ReviewEligibility.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (CRITICAL — blocks everything)
2. Complete Phase 3: User Story 1 (the entire rule: gate + display)
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1, 2, 4 independently
4. Deploy/demo if ready — User Story 1 alone delivers the feature's entire stated purpose;
   User Stories 2–3 exist to prove nothing else broke, not to add new behavior

### Incremental Delivery

1. Foundational → shared primitives ready
2. US1 → validate → demo (the restriction itself works)
3. US2 → validate (eligible games provably unaffected)
4. US3 → validate (comments/reports/edits/admin provably unaffected)
5. Phase 6 polish → run the full quickstart.md validation end-to-end

### Parallel Team Strategy

This feature is small enough that a single developer working Phases 2→3→4→5→6 in order is
the natural approach. If split: one developer can own T001/T002/T007/T008/T009/T010
(the "display" half) while another owns T003/T004/T005/T006 (the "gate" half) — both
converge on `ReviewEligibility` from Foundational.

---

## Notes

- `[P]` tasks = different files, no unmet dependencies
- `[Story]` label maps each task to its user story for traceability
- No automated tests per Constitution v2.0.0 — verify manually against a running API + dev
  server before marking a task done
- This feature touches no schema, no migration, no new packages — every task is an edit to
  an existing file except T003 (one new file)
- Commit after each task or logical group
