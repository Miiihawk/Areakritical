# Data Model: Game Reviews & Community Moderation

**Feature**: [spec.md](./spec.md) | **Derived from**: Key Entities section + Functional Requirements + [research.md](./research.md)

## Game (local shadow row)

Represents a title from the existing IGDB-backed catalog, persisted locally only to give
Reviews/Comments/Reports a stable FK target and to hold Admin moderation state
(research.md Decision 1).

| Field | Type | Rules |
|---|---|---|
| `Id` | `long` | Primary key — **reused directly from the external IGDB id**, not a separately generated identity |
| `TitleOverride` | string? | Nullable; when set, overrides the live IGDB title on the detail page (FR-018b) |
| `DescriptionOverride` | string? | Nullable; same override pattern |
| `CoverImageUrlOverride` | string? | Nullable; same override pattern |
| `IsHidden` | bool | Default `false`; when `true`, the game (and its reviews/comments) is inaccessible to non-Admins (research.md Decision 4) |
| `FirstSeenAt` | DateTime (UTC) | Set once, at lazy-creation time |

**Lifecycle**: Created lazily on first review submission for an external id not yet seen
locally, or explicitly by an Admin action (hide, or set an override) before any review
exists. Never hard-deleted (research.md Decision 4).

## Review

A single user's evaluation of a specific Game (spec: **Review** entity).

| Field | Type | Rules |
|---|---|---|
| `Id` | Guid | Primary key |
| `GameId` | `long` | FK → Game; required |
| `AuthorId` | string | FK → `ApplicationUser.Id`; required |
| `GameplayScore` | int | 1–10 (FR-004/FR-005) |
| `StoryScore` | int | 1–10 |
| `AudiovisualScore` | int | 1–10 |
| `ReplayabilityScore` | int | 1–10 |
| `OverallEnjoymentScore` | int | 1–10 |
| `Text` | string | Required, non-empty |
| `CreatedAt` | DateTime (UTC) | Set on creation |
| `UpdatedAt` | DateTime (UTC) | Set on creation, refreshed on edit |

**Computed (not stored)**: `OverallScore` = average of the five mechanic scores
(research.md Decision 2).

**Validation rules**: All five mechanic scores required and within 1–10 (FR-005); `Text`
required (implied by FR-004's "plus written review text").

**Uniqueness**: exactly one Review per (`AuthorId`, `GameId`) pair (FR-005a) — enforced by a
unique index on `(GameId, AuthorId)`; a repeat submission updates the existing row instead
of inserting a new one.

**Relationships**: belongs to exactly one Game and exactly one Account (author). Has many
Comments. May have many Reports (via `Report.ReviewId`).

**Delete behavior**: deleting a Review deletes its Comments (cascade). Reports are **not**
cascade-deleted — see Report's Delete behavior below (research.md Decision 3, revised).

## Comment

A user's response to a specific Review (spec: **Comment** entity).

| Field | Type | Rules |
|---|---|---|
| `Id` | Guid | Primary key |
| `ReviewId` | Guid | FK → Review; required |
| `AuthorId` | string | FK → `ApplicationUser.Id`; required |
| `Text` | string | Required, non-empty (FR-010) |
| `CreatedAt` | DateTime (UTC) | Set on creation |
| `UpdatedAt` | DateTime (UTC) | Set on creation, refreshed on edit |

**Relationships**: belongs to exactly one Review and exactly one Account (author). May have
many Reports (via `Report.CommentId`).

**Delete behavior**: deleting a Comment does **not** cascade-delete Reports targeting it —
see Report's Delete behavior below (research.md Decision 3, revised).

## Report

A flag raised by a user against a specific Review or Comment (spec: **Report** entity).

| Field | Type | Rules |
|---|---|---|
| `Id` | Guid | Primary key |
| `ReporterId` | string | FK → `ApplicationUser.Id`; required |
| `ReviewId` | Guid? | Nullable FK → Review |
| `CommentId` | Guid? | Nullable FK → Comment |
| `Reason` | enum (`Spam`, `Harassment`, `OffTopic`, `Other`) | Required (FR-016) |
| `Status` | enum (`Open`, `Resolved`, `Dismissed`) | Default `Open` |
| `CreatedAt` | DateTime (UTC) | Set on creation |
| `ResolvedAt` | DateTime (UTC)? | Set when an Admin resolves/dismisses (FR-019) |

**Validation rules**: exactly one of `ReviewId`/`CommentId` must be set, enforced in
`IReportService` (research.md Decision 3 — not a DB CHECK constraint).

**Uniqueness**: at most one Report per (`ReporterId`, target) pair — enforced by two partial
unique indexes: `(ReporterId, ReviewId)` where `ReviewId IS NOT NULL`, and
`(ReporterId, CommentId)` where `CommentId IS NOT NULL` (FR-017).

**Relationships**: belongs to exactly one Account (reporter); references exactly one Review
or Comment.

**Delete behavior**: `ReviewId`/`CommentId` use `ON DELETE SET NULL`, not cascade — when the
target Review/Comment is deleted, the Report row survives with a null target and its
`Status` intact (research.md Decision 3, revised during `/speckit-analyze`). This is
required so an Admin's "resolve by removing content" action (FR-019) can actually persist
`Status = Resolved` on the report *after* the content is gone — a cascade-deleted row could
never be marked resolved. A Report also loses its target this way if the *reporter's*
account is deleted and the target survives; conversely if the reporter's account is
deleted, the Report itself is deleted (cascade on `ReporterId` — see ApplicationUser
Delete behavior below), since a report authored by a deleted account no longer needs Admin
attention.

## ApplicationUser (extended)

Existing entity from the authentication feature; this feature adds two optional,
cosmetic fields (see research.md's cross-feature note on Username).

| Field | Type | Rules |
|---|---|---|
| `DisplayName` | string? | Nullable; when unset, the UI falls back to the account's Username (from the authentication feature) |
| `Bio` | string? | Nullable, short free text |
| `IsDeactivated` | bool | Default `false`; set by an Admin (FR-018a); a deactivated account cannot log in (research.md Decision 9) |

**Validation rules** (FR-014): if provided, `DisplayName` must be non-empty after trimming
(an explicitly-submitted blank value is a validation error, not silently ignored).

**Password change** (FR-014a/FR-014b): no new column — reuses the existing Identity
`PasswordHash` column via `UserManager.RemovePasswordAsync`/`AddPasswordAsync`
(research.md Decision 8). Validation: `NewPassword` must equal `ConfirmNewPassword` and
must satisfy the same `PasswordOptions` policy enforced at registration; no current-password
field exists on the request by design.

**Admin account deletion** (FR-018a): deleting an `ApplicationUser` cascades to delete all
Reviews, Comments, and Reports **authored/reported by** that account (`AuthorId`/
`ReporterId` FKs use `ON DELETE CASCADE`), consistent with this feature's existing pattern
of not leaving orphaned content behind (research.md Decision 9). Reports whose *target*
(not reporter) was authored by the deleted account are unaffected directly by this cascade,
but will themselves cascade-delete once the now-deleted account's Review/Comment is removed
in the same operation.

**Delete behavior**: `ApplicationUser` deletion cascades to `Review.AuthorId`,
`Comment.AuthorId`, and `Report.ReporterId` (research.md Decision 9).

## Entity relationship summary

```text
ApplicationUser (1) ──authors── (0..1 per Game) Review
ApplicationUser (1) ──authors── (0..many) Comment
ApplicationUser (1) ──reports──  (0..many) Report

Game (1) ──has── (0..many) Review
Review (1) ──has── (0..many) Comment
Review (1) ──may have── (0..many) Report
Comment (1) ──may have── (0..many) Report
```
