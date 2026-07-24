# Feature Specification: Review Age Restriction (Retro-Only Reviews)

**Feature Branch**: `003-review-age-restriction`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Implement a way or an algorithm that would restrict users to review games that are below 5 years of age. an example is that the write a review would instead say that the game is not yet eligible for review or the game is not mature enough for reviewed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Blocked from Reviewing a Too-Recent Game (Priority: P1)

A signed-in user opens the detail page of a game released less than 5 years ago. Instead of
the usual "write a review" form, they see a clear message that the game is not yet eligible
for review, and they have no way to submit one.

**Why this priority**: This is the core of the feature — the platform's identity is
reviewing *retro* games, so preventing reviews of recent titles is the entire point.

**Independent Test**: Can be fully tested by opening the detail page of a game released
less than 5 years ago and confirming the review form is replaced by an ineligibility
message, and that a direct submission attempt is also rejected.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing the detail page of a game released less than 5 years
   ago, **When** the page loads, **Then** the "write a review" form is not shown and an
   explicit message is shown instead (e.g., "This game is not yet eligible for review — it
   must be at least 5 years old."), including when the game becomes eligible if its release
   date is known.
2. **Given** a game released less than 5 years ago, **When** a review submission for it is
   attempted directly (bypassing the page, e.g., a crafted request), **Then** the system
   rejects it with a clear "not yet eligible for review" message and no review is created.
3. **Given** a game released less than 5 years ago that already existed in the catalog,
   **When** its detail page loads, **Then** its other content (title, description, cover,
   details) still displays normally — only the ability to review is restricted.

---

### User Story 2 - Reviewing an Eligible (5+ Year Old) Game Still Works (Priority: P1)

A signed-in user opens the detail page of a game released 5 or more years ago and can
write, edit, and delete their review exactly as before — the restriction must not affect
eligible games.

**Why this priority**: The restriction is only correct if it doesn't break the existing
review flow for the games the platform exists to cover; both halves must be verified
together.

**Independent Test**: Can be fully tested by opening the detail page of a game released 5+
years ago and confirming the review form appears and a submission succeeds.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing the detail page of a game released 5 or more years
   ago, **When** the page loads, **Then** the "write a review" form is available as normal.
2. **Given** a game released exactly 5 years ago (boundary case), **When** a review is
   submitted for it, **Then** the submission is accepted — "at least 5 years old" is
   inclusive.
3. **Given** a game that was ineligible when a user last visited but has since crossed the
   5-year threshold, **When** the user next opens its detail page, **Then** the review form
   is available without any manual intervention (eligibility is evaluated at the time of
   viewing/submission, not stored once).

---

### User Story 3 - Existing Interactions on Eligible Games Are Unaffected (Priority: P2)

Comments, reports, edits, and deletions on reviews of eligible games continue to work
unchanged; the restriction applies only to creating/updating reviews on ineligible games.

**Why this priority**: Guards against the restriction accidentally leaking into unrelated
flows, but it is a regression-prevention concern rather than new behavior.

**Independent Test**: Can be fully tested by exercising comment/report/edit/delete flows on
a review of an eligible game and confirming they behave exactly as before this feature.

**Acceptance Scenarios**:

1. **Given** an existing review on an eligible game, **When** users comment on it, report
   it, or its author edits/deletes it, **Then** those actions behave exactly as they did
   before this feature.

---

### Edge Cases

- What happens when a game's release date is unknown/not provided by the catalog? The game
  MUST be treated as ineligible for review (conservative default), with the same
  ineligibility message; it becomes reviewable only once a release date is known and is 5+
  years old.
- What happens when a game is exactly at the 5-year boundary? It is eligible — the rule is
  "at least 5 years old" (inclusive).
- What happens if a review submission and the eligibility threshold cross at nearly the
  same moment (e.g., the game turns 5 between page load and submission)? Eligibility MUST
  be evaluated at submission time on the server; a page that showed the restriction but a
  submission that arrives after the threshold passes MAY succeed (this is acceptable —
  server-side evaluation is the source of truth).
- What happens to the restriction for Admins? The restriction is about the game's
  eligibility, not user permissions — it applies to all users, including Admins (an Admin
  has no reason to review an ineligible game either; Admin moderation powers from the
  existing moderation feature are unaffected).
- Can an ineligible game somehow already have reviews (e.g., the restriction is added after
  a recent game was reviewed)? Any pre-existing reviews remain visible and manageable
  (editable/deletable by their author, moderatable by Admins) — the restriction blocks only
  *new* review creation on ineligible games; editing an existing review on a now-ineligible
  game remains allowed so authors are not locked out of their own content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST determine a game's review eligibility from its release date: a
  game is eligible for review only when at least 5 full years have passed since its release
  (inclusive at the boundary).
- **FR-002**: System MUST treat a game with no known release date as ineligible for review
  until a release date is known and satisfies FR-001.
- **FR-003**: System MUST, on an ineligible game's detail page, replace the "write a
  review" form with an explicit, plain-language ineligibility message (e.g., "This game is
  not yet eligible for review — it must be at least 5 years old.").
- **FR-004**: System MUST reject any review-creation attempt against an ineligible game —
  regardless of how the request is made — with a clear ineligibility message, and MUST NOT
  create or modify any review as a result.
- **FR-005**: System MUST evaluate eligibility at the time of each page view and each
  submission (not as a stored, one-time flag), so a game automatically becomes reviewable
  once it crosses the 5-year threshold with no manual action needed.
- **FR-006**: System MUST NOT restrict any non-review interaction on an ineligible game:
  viewing its details remains available, and (if any reviews exist from before the
  restriction) commenting on, reporting, editing, and deleting those existing reviews
  remain available per the existing rules.
- **FR-007**: System MUST apply the eligibility rule uniformly to all users, including
  Admins.
- **FR-008**: System MUST show, alongside the ineligibility message, when the game will
  become eligible (e.g., the year), whenever the game's release date is known.

### Key Entities

- **Game (extended)**: The existing Game entity's release date becomes the input to a
  computed review-eligibility state (eligible / not yet eligible / unknown-release-date).
  No new stored attribute is required by this feature's behavior — eligibility is derived,
  not persisted (FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of review-creation attempts against games released less than 5 years ago
  (or with unknown release dates) are rejected, verified for both the normal page flow and
  direct submission attempts.
- **SC-002**: 100% of games released 5 or more years ago remain reviewable, with zero
  regressions in the existing review/comment/report flows on them.
- **SC-003**: A user viewing an ineligible game's page can tell within 5 seconds why they
  cannot review it, without needing help or documentation (the message is present, visible,
  and plain-language).
- **SC-004**: A game that crosses the 5-year threshold becomes reviewable with zero manual
  intervention in 100% of tested cases.

## Assumptions

- "Below 5 years of age" in the request means the game's *release date* is less than 5
  years before today — i.e., the platform only allows reviews of games at least 5 years
  old (a "retro-only" rule consistent with the application's identity). Age is measured
  from the game's original release date as provided by the existing game catalog.
- The 5-year threshold is a fixed rule of this feature, not an Admin-configurable setting;
  making it configurable is out of scope until requested.
- Eligibility is computed from the release date already available on games in the existing
  catalog; this feature does not add any new data-entry flow for release dates. A game
  whose release date is missing in the catalog is simply ineligible (FR-002) until the
  catalog provides one.
- The existing game detail page already displays release-year information, so users can see
  the game's age context alongside the ineligibility message.
- Pre-existing reviews on games that are (or become) ineligible are preserved and remain
  editable by their authors and moderatable by Admins — the restriction governs new review
  creation only. (In practice, under the current catalog rules such reviews should be rare
  or nonexistent, but the behavior is defined so the system is never in an undefined state.)
- Admin game-management powers from the moderation feature (hide/unhide, detail overrides)
  are unrelated to and unaffected by review eligibility.
