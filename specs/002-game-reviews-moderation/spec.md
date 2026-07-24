# Feature Specification: Game Reviews & Community Moderation

**Feature Branch**: `002-game-reviews-moderation`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "This speckit will be used for the next features that would be implemented to the web app. Create a way for users to be able to edit and update their user profile. Create also a way for users to be able to view the games from the database/API. Create a way for users to be able to review the games reviews and score base on the following mechanics (gameplay mechanics, story and narrative, audiovisual presentation, replayability and over all enjoyment), users must also be able to update and delete them. Create also a way for users to be able to comment to those reviews and be able to also edit and delete those comments. Also implement a page for the games, this page would show details about the games, current reviews, and the over all details of the game. Implement also a way for users to be able to report inapropriate comments and reviews. We should also implement a way for the admin to be able to manage the users, the games, the reviews/comments and the reports of the users."

## Clarifications

### Session 2026-07-23

- Q: Should a user be limited to exactly one review per game (edit-in-place), or can they
  submit multiple separate reviews for the same game over time? → A: One review per user
  per game — a second submission attempt updates their existing review in place.
- Q: What user-management actions must Admins have? → A: Full account editing, including
  the ability to change a user's role between Author and Admin.
- Q: Does "manage the games" mean moderating/curating the existing game catalog, or full
  local catalog creation independent of the existing game source? → A: Moderate/curate the
  existing catalog only (e.g., hide a game from listings, correct its displayed details) —
  no capability to create brand-new games outside the existing game source.
- Q: Should changing the password (as part of profile update) require re-entering the
  current password? → A: No — only a new password and a matching confirmation are
  required; there is no current-password check.
- Q: What does "edit a user account's details" (FR-018a) actually let an Admin do, beyond
  changing a user's role? → A: Three concrete actions: delete an account, change its role
  between Author and Admin, and activate/deactivate an account.
- Q: When an Admin hides a game (FR-018b), does the game get removed/deleted, or just
  hidden? → A: Just hidden — along with its reviews and comments becoming inaccessible to
  non-Admins. Games and their content are never deleted by this feature, only hidden.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Games and View Game Details (Priority: P1)

A signed-in user searches the game catalog and opens a game's detail page to see its
information, its community score, and the reviews other users have written about it.

**Why this priority**: Every other capability in this feature (reviewing, commenting,
reporting) happens on or from the game detail page. Without it, there is nothing for users
to review or comment on.

**Independent Test**: Can be fully tested by searching for a game, opening its detail page,
and confirming the page shows the game's core details, its aggregate score, and the current
list of reviews (or an explicit empty state if none exist yet).

**Acceptance Scenarios**:

1. **Given** a signed-in user has searched for a game, **When** they open that game's detail
   page, **Then** the page shows the game's title, description, cover image, and other
   available details.
2. **Given** a game has one or more published reviews, **When** its detail page loads,
   **Then** the page shows an aggregate community score and the list of individual reviews
   (each showing its per-mechanic scores and written text).
3. **Given** a game has no reviews yet, **When** its detail page loads, **Then** the page
   shows an explicit "no reviews yet" state rather than an empty or broken section.
4. **Given** a user opens a detail page for a game that does not exist (e.g., an invalid or
   removed game reference), **When** the page loads, **Then** the user sees a clear
   "game not found" message rather than a blank page or unhandled error.

---

### User Story 2 - Write a Scored Review for a Game (Priority: P1)

A signed-in user who wants to share their opinion of a game writes a review that scores it
on five specific mechanics (gameplay mechanics, story and narrative, audiovisual
presentation, replayability, and overall enjoyment) plus a written comment.

**Why this priority**: Reviews are the core content of this feature — every other piece
(comments, reports, the detail page's aggregate score) exists to support or react to reviews.

**Independent Test**: Can be fully tested by submitting a review with all five mechanic
scores and written text for a game the user has not yet reviewed, and confirming it appears
on that game's detail page with its scores and text intact.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing a game they have not yet reviewed, **When** they
   submit a review with a score for each of the five mechanics and written text, **Then**
   the review is saved and appears on the game's detail page, attributed to that user.
2. **Given** a signed-in user submits a review missing one or more of the five required
   mechanic scores, **When** they submit, **Then** the submission is rejected with a message
   identifying which score(s) are missing.
3. **Given** a signed-in user submits a mechanic score outside the valid scoring range,
   **When** they submit, **Then** the submission is rejected with a message stating the
   valid range.
4. **Given** a signed-in user has already reviewed a specific game, **When** they attempt to
   submit another review for that same game, **Then** the system updates their existing
   review in place rather than creating a second, separate review (a user has at most one
   review per game).

---

### User Story 3 - Edit or Delete Own Review (Priority: P2)

A user who has already reviewed a game changes their mind, corrects a mistake, or wants to
remove their review entirely.

**Why this priority**: Important for content accuracy and user trust, but the core review
loop (User Story 2) already delivers value without it.

**Independent Test**: Can be fully tested by editing an existing review's scores/text and
confirming the change is reflected on the game's detail page, and separately by deleting a
review and confirming it no longer appears.

**Acceptance Scenarios**:

1. **Given** a user viewing their own previously submitted review, **When** they edit any of
   its scores or its text and save, **Then** the game's detail page reflects the updated
   values.
2. **Given** a user viewing their own previously submitted review, **When** they delete it,
   **Then** it no longer appears on the game's detail page and the game's aggregate score
   recalculates without it.
3. **Given** a user attempts to edit or delete a review that belongs to someone else,
   **When** they attempt the action, **Then** the system denies it with a clear
   "not authorized" message.

---

### User Story 4 - Comment on a Review (Priority: P2)

A user who reads a review wants to respond to it — agree, disagree, ask a question, or add
their own perspective — by leaving a comment on that review.

**Why this priority**: Adds a discussion layer on top of reviews, which is valuable for
engagement but not required for the review content itself to have value.

**Independent Test**: Can be fully tested by posting a comment on an existing review and
confirming it appears attached to that review, visible to other users viewing the same
review.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing a review, **When** they submit a non-empty comment,
   **Then** the comment is saved and displayed under that review, attributed to that user.
2. **Given** a signed-in user submits an empty comment, **When** they submit, **Then** the
   submission is rejected with a message that a comment cannot be empty.

---

### User Story 5 - Edit or Delete Own Comment (Priority: P2)

A user who posted a comment wants to correct or remove it.

**Why this priority**: Same rationale as editing/deleting reviews — important for user
trust and content accuracy, but the base commenting capability (User Story 4) already
delivers value without it.

**Independent Test**: Can be fully tested by editing an existing comment's text and
confirming the change is reflected under the review, and separately by deleting a comment
and confirming it no longer appears.

**Acceptance Scenarios**:

1. **Given** a user viewing their own previously posted comment, **When** they edit its text
   and save, **Then** the review shows the updated comment text.
2. **Given** a user viewing their own previously posted comment, **When** they delete it,
   **Then** it no longer appears under the review.
3. **Given** a user attempts to edit or delete a comment that belongs to someone else,
   **When** they attempt the action, **Then** the system denies it with a clear
   "not authorized" message.

---

### User Story 6 - Edit Own Profile (Priority: P2)

A signed-in user updates their own profile information — including changing their password
— so that their public identity in the community (their name/display info) reflects who
they are, and they can rotate their credentials without needing the (out-of-scope)
forgot-password flow.

**Why this priority**: Improves the personalization and trustworthiness of reviews/comments
(readers see a meaningful identity), but the review/comment system already functions using
whatever identity exists at registration, so this is not blocking for the core loop.

**Independent Test**: Can be fully tested by updating profile fields and confirming the
updated values are shown wherever that user's identity is displayed (e.g., next to their
reviews and comments).

**Acceptance Scenarios**:

1. **Given** a signed-in user on their profile page, **When** they update their editable
   profile fields and save, **Then** the changes are persisted and reflected the next time
   their profile is viewed.
2. **Given** a signed-in user submits a profile update with invalid data (e.g., an
   empty required field), **When** they save, **Then** the update is rejected with a
   message identifying the problem field.
3. **Given** a signed-in user's profile has been updated, **When** their existing reviews or
   comments are viewed, **Then** the display reflects their current profile information
   rather than stale data from when the content was originally posted.
4. **Given** a signed-in user on their profile page, **When** they submit a new password
   together with a matching confirmation of that new password, **Then** their password is
   changed and they can subsequently log in with the new password (no current-password
   entry is required for this change).
5. **Given** a signed-in user submits a new password whose confirmation does not match,
   **When** they save, **Then** the update is rejected with a message that the passwords do
   not match, and the password is not changed.
6. **Given** a signed-in user submits a new password that does not meet the same minimum
   password policy enforced at registration, **When** they save, **Then** the update is
   rejected with a message explaining the policy, and the password is not changed.

---

### User Story 7 - Report Inappropriate Reviews or Comments (Priority: P3)

A user who encounters a review or comment that violates community expectations (e.g.,
harassment, spam, off-topic content) flags it for the Admin's attention.

**Why this priority**: A safety/moderation mechanism that matters for long-term community
health, but the platform is functional for its core purpose without it at first.

**Independent Test**: Can be fully tested by reporting a review or a comment and confirming
the report is recorded and later visible to an Admin, without needing any Admin-side
resolution workflow to already exist.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing a review or a comment, **When** they submit a report
   against it with a reason, **Then** the report is recorded and associated with that
   specific review or comment.
2. **Given** a user has already reported a specific review or comment, **When** they attempt
   to report the same item again, **Then** the system prevents a duplicate report from the
   same user against the same item.
3. **Given** a user submits a report without selecting/providing a reason, **When** they
   submit, **Then** the submission is rejected with a message that a reason is required.

---

### User Story 8 - Admin Moderation of Users, Games, Reviews/Comments, and Reports (Priority: P3)

An Admin reviews and acts on the community's activity: managing user accounts, managing the
games shown in the catalog, removing or correcting problematic reviews/comments, and
resolving reports that users have submitted.

**Why this priority**: Moderation tooling protects the community over time but is not
required for the first users to browse, review, comment, and report — it becomes necessary
once there is content and reports to act on.

**Independent Test**: Can be fully tested by, as an Admin, opening the moderation area and
performing one action in each area (e.g., changing a user's role/status/deleting an account,
hiding a game listing, removing a review or comment, and resolving a report) and confirming
each action takes effect.

**Acceptance Scenarios**:

1. **Given** an Admin viewing the user-management area, **When** they change an account's
   role between Author and Admin, **Then** the change takes effect for that account.
2. **Given** an Admin viewing the user-management area, **When** they deactivate an account,
   **Then** that account can no longer log in, and **When** they later reactivate it,
   **Then** it can log in again.
3. **Given** an Admin viewing the user-management area, **When** they delete an account,
   **Then** the account and its authored reviews/comments/reports are removed and it can no
   longer log in.
4. **Given** an Admin viewing the game-management area, **When** they hide a game from the
   public listing, **Then** that game and its reviews/comments become inaccessible to
   regular users (the game and its content are hidden, never deleted — see Assumptions), and
   **When** they later unhide it, **Then** it and its content become visible again.
5. **Given** an Admin viewing the game-management area, **When** they correct a game's
   displayed details, **Then** the change is reflected in what regular users see (creating
   brand-new games outside the existing game source is out of scope for this feature — see
   Assumptions).
6. **Given** an Admin viewing a reported review or comment, **When** they remove it,
   **Then** it no longer appears to regular users and the associated report is marked
   resolved.
7. **Given** an Admin viewing the list of open reports, **When** they resolve a report
   without removing the reported content (i.e., they judge it acceptable), **Then** the
   report is marked resolved/dismissed and the content remains visible to regular users.
8. **Given** a non-Admin user attempts to reach any part of the moderation area, **When**
   they attempt it, **Then** access is denied with a clear "not authorized" message.

---

### Edge Cases

- What happens when a user tries to review or comment while not signed in? System MUST deny
  the action and prompt sign-in, consistent with existing authenticated-access behavior.
- What happens when a user deletes their own review that already has comments on it? The
  comments MUST also be removed (or otherwise handled so they are not left attached to
  nothing), since a comment cannot meaningfully exist without its parent review.
- What happens when the content being reported (a review/comment) is deleted before an Admin
  resolves the report? The report MUST be handled gracefully (e.g., auto-resolved or clearly
  marked as referring to removed content) rather than pointing at missing data.
- What happens when an Admin hides a game that has existing reviews/comments? Those
  reviews/comments MUST also become inaccessible to non-Admins along with the game (not
  deleted — games and their content are hidden, never removed, by this feature), since they
  cannot meaningfully be shown without a visible parent game.
- What happens to a deleted account's authored reviews/comments/reports? They MUST be
  removed along with the account, since they cannot meaningfully exist without an author.
- What happens when a deactivated account attempts to log in? It MUST be denied, using the
  same generic message as any other failed login, so as not to reveal that the account
  exists but is deactivated.
- What happens if an Admin deletes or deactivates the only Admin account (e.g., their own)?
  This is a known limitation carried over from this project's pre-seeding design: the system
  does not prevent it, and recovering Admin access afterward is an operational task (e.g.,
  re-running the seed process), not a self-service flow — consistent with the authentication
  feature's existing "no forgot password" precedent.
- What happens when two users try to review the same game around the same time? Each
  review MUST be attributed correctly to its own author without corrupting the other's data.
- What happens when a mechanic score is submitted as a non-numeric or out-of-range value?
  System MUST reject it with a validation message stating the valid range, not silently
  clamp or ignore it.
- What happens when a new password and its confirmation don't match? System MUST reject the
  change with a clear message and MUST NOT change the password.
- What happens to a user's other already-signed-in sessions/devices after a password change,
  given that sessions are stateless tokens with no revocation list (per the authentication
  feature)? Existing valid tokens issued before the change continue to work until they
  naturally expire; this is a known limitation carried over from the authentication
  feature, not a new gap introduced here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a signed-in user to view a dedicated detail page for a
  specific game, showing its title, description, cover image, and other available details.
- **FR-002**: System MUST show, on a game's detail page, the aggregate community score for
  that game and the list of individual reviews for that game.
- **FR-003**: System MUST show an explicit "no reviews yet" state on a game's detail page
  when it has no reviews, rather than an empty or broken section.
- **FR-004**: System MUST allow a signed-in user to submit a review for a game consisting of
  a numeric score for each of exactly five mechanics — gameplay mechanics, story and
  narrative, audiovisual presentation, replayability, and overall enjoyment — plus written
  review text.
- **FR-005**: System MUST reject a review submission that is missing any of the five
  required mechanic scores, or that includes a score outside the valid scoring range, with a
  message identifying the specific problem.
- **FR-005a**: System MUST limit a user to at most one review per game; a subsequent review
  submission for a game the user has already reviewed MUST update their existing review
  rather than create a second one.
- **FR-006**: System MUST compute and display each game's aggregate community score derived
  from its published reviews' scores.
- **FR-007**: System MUST allow a user to edit their own previously submitted review's
  scores and/or text, and MUST reflect the update on the game's detail page and in the
  aggregate score.
- **FR-008**: System MUST allow a user to delete their own previously submitted review, and
  MUST remove it (and its aggregate-score contribution) from the game's detail page.
- **FR-009**: System MUST deny edit/delete attempts on a review by any user other than the
  review's original author (Admins are covered separately under FR-018).
- **FR-010**: System MUST allow a signed-in user to submit a non-empty comment on a review,
  attributed to that user, and MUST reject empty comment submissions with a clear message.
- **FR-011**: System MUST allow a user to edit their own previously posted comment's text,
  reflecting the update wherever the comment is shown.
- **FR-012**: System MUST allow a user to delete their own previously posted comment,
  removing it from display.
- **FR-013**: System MUST deny edit/delete attempts on a comment by any user other than the
  comment's original author (Admins are covered separately under FR-018).
- **FR-014**: System MUST allow a signed-in user to view and update their own profile's
  editable fields, and MUST validate the update (rejecting invalid/empty required fields
  with a message identifying the problem).
- **FR-014a**: System MUST allow a signed-in user to change their own password by submitting
  a new password and a matching confirmation of that new password; System MUST NOT require
  the user's current password as part of this change.
- **FR-014b**: System MUST reject a password change when the new password and its
  confirmation do not match, or when the new password does not meet the same minimum
  password policy enforced at registration (FR-003 in the authentication feature); in
  either case the existing password MUST remain unchanged.
- **FR-015**: System MUST reflect a user's current profile information wherever their
  identity is displayed (including on their existing reviews and comments), not a stale
  snapshot from when that content was created.
- **FR-016**: System MUST allow a signed-in user to submit a report against a specific
  review or comment, requiring a reason, and MUST reject a report submission with no reason.
- **FR-017**: System MUST prevent a user from submitting more than one report against the
  same review or comment (no duplicate reports from the same reporter on the same item).
- **FR-018**: System MUST restrict all moderation actions — managing user accounts, managing
  games, removing/editing any review or comment regardless of author, and resolving reports
  — to Admin accounts only; System MUST deny these actions for non-Admin accounts with a
  clear "not authorized" message.
- **FR-018a**: System MUST allow an Admin to change a user account's role between "Author"
  and "Admin."
- **FR-018c**: System MUST allow an Admin to deactivate a user account, which MUST prevent
  that account from logging in, and to reactivate a previously deactivated account, which
  MUST restore its ability to log in.
- **FR-018d**: System MUST allow an Admin to delete a user account; deleting an account MUST
  also remove that account's authored reviews, comments, and reports.
- **FR-018b**: System MUST allow an Admin to hide/unhide a game from the public listing and
  to correct its displayed details; System MUST NOT require (or provide) a way to create a
  brand-new game independent of the existing game source as part of this feature.
- **FR-019**: System MUST allow an Admin to resolve a report either by removing the reported
  content (which also marks the report resolved) or by dismissing the report while leaving
  the content visible.
- **FR-020**: System MUST, when a review is deleted (by its author or by an Admin), also
  remove or otherwise cleanly detach any comments that were posted on it.
- **FR-021**: System MUST, when a game is hidden by an Admin (FR-018b), also make any
  reviews/comments associated with that game inaccessible to non-Admins, consistent with the
  game itself becoming inaccessible; unhiding the game restores access to its content.
- **FR-022**: System MUST deny review, comment, report, and profile-edit actions for users
  who are not signed in, consistent with the existing authentication requirement.

### Key Entities

- **Game**: A title in the game catalog that users can view, review, and comment on. Key
  attributes: title, description, cover image, other display details, and a stable
  identifier used to associate reviews/comments/reports with it.
- **Review**: A single user's evaluation of a specific game. Key attributes: author
  (Account), the game it belongs to, five mechanic scores (gameplay mechanics, story and
  narrative, audiovisual presentation, replayability, overall enjoyment), written text,
  created/updated timestamps. Belongs to exactly one Account and exactly one Game.
- **Comment**: A user's response to a specific review. Key attributes: author (Account),
  the review it belongs to, text, created/updated timestamps. Belongs to exactly one
  Account and exactly one Review.
- **Report**: A flag raised by a user against a specific review or comment. Key attributes:
  reporter (Account), the reported review or comment, reason, status (open/resolved/
  dismissed), created/resolved timestamps. Belongs to exactly one Account (the reporter) and
  references exactly one reported item (a Review or a Comment).
- **Profile**: The editable, user-facing identity information for an Account (extends the
  existing Account entity from the authentication feature). Key attributes: display
  name/other editable fields shown alongside a user's reviews and comments.
- **Account** (extended): The existing Account entity from the authentication feature gains
  an Admin-controlled active/deactivated status in this feature (FR-018c); a deactivated
  Account cannot log in. Accounts can also be deleted by an Admin (FR-018d), which removes
  that Account's authored Reviews, Comments, and Reports.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from opening a game's detail page to having a submitted review
  visible on that page in under 3 minutes.
- **SC-002**: 100% of published reviews display all five of their mechanic scores correctly
  alongside the game they were written for.
- **SC-003**: A game's displayed aggregate score always matches the mathematical result of
  its current set of published reviews (0% drift between displayed and computed values,
  verified after any review is added, edited, or deleted).
- **SC-004**: Users attempting to edit or delete content that is not their own are blocked
  in 100% of tested attempts, with no exceptions found for reviews, comments, or profiles.
- **SC-005**: 100% of submitted reports are visible to Admins for resolution, and 100% of
  Admin resolutions (remove or dismiss) are reflected in what regular users see immediately
  after the action.
- **SC-006**: Non-Admin users are blocked from every moderation action in 100% of tested
  attempts.
- **SC-007**: 100% of Admin account actions (role change, deactivate, reactivate, delete)
  take effect immediately — a deactivated or deleted account can no longer log in on its
  very next attempt.

## Assumptions

- A user's identity for reviews/comments is the Account/Author identity already established
  by the authentication feature; this feature adds editable profile fields on top of it
  rather than replacing it.
- Mechanic and overall scores use a 1–10 numeric scale, a common convention for game-review
  scoring; the exact bounds are enforced by FR-005 regardless of the specific numbers chosen.
- A game's aggregate community score (FR-006) is the average of its published reviews'
  overall scores; no separate weighting (e.g., by reviewer reputation) is in scope.
- Reports use a fixed, short list of standard reasons (e.g., spam, harassment, off-topic,
  other) rather than fully free-form text, to keep the report queue easy for Admins to scan.
- Only Reviews and Comments are reportable in this feature; reporting a Game or a user
  Profile directly is out of scope.
- A deleted Review/Comment (FR-020, by its author or an Admin) is genuinely removed; a
  hidden Game (FR-021) is never deleted, only made inaccessible to non-Admins — these are
  deliberately different mechanisms, not the same operation under two names. Whether a
  deleted Review/Comment is hard-deleted or soft-deleted at the storage level is an
  implementation decision for the planning phase, not a behavior visible to users.
- The *initial* Admin account still comes only from the existing pre-seeding mechanism (no
  public registration can ever create an Admin, per the authentication feature). This
  feature adds a distinct, Admin-only capability (FR-018a) to change an *existing* account's
  role between Author and Admin — a controlled, authenticated action, not a public
  registration path, so it does not conflict with that earlier rule.
- "Manage the games" (FR-018b) is moderation/curation over the existing game source (e.g.,
  hide a game, correct its displayed details) — not a separate, locally-authored game
  catalog. Creating new games from scratch is out of scope for this feature. Games and their
  content (reviews/comments) are only ever hidden, never deleted, by this feature (FR-021).
- "Manage the users" (FR-018a/FR-018c/FR-018d) covers exactly three concrete actions: role
  change (Author ↔ Admin), deactivate/reactivate (blocks/restores login), and delete
  (removes the account and its authored content). There is no separate "edit other account
  details" capability beyond these three.
- This feature does not add any safeguard against an Admin deleting or deactivating the last
  remaining Admin account (including their own); recovering from that state is an
  operational task, not a self-service flow, consistent with the authentication feature's
  "no forgot password" precedent (see Edge Cases).
- Password change (FR-014a/FR-014b) intentionally does not require re-entering the current
  password, per an explicit product decision made during clarification. This is a known
  security tradeoff: anyone who gains access to a user's active, valid session token could
  change that user's password with no further proof of identity. Mitigating this (e.g., by
  later requiring current-password confirmation, or by revoking existing tokens on
  password change) is left as a future security-hardening item, consistent with this
  feature's existing "no account-lockout mechanism" precedent from the authentication
  feature.
