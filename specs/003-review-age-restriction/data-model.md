# Data Model: Review Age Restriction (Retro-Only Reviews)

**Feature**: [spec.md](./spec.md) | **Derived from**: Key Entities + [research.md](./research.md)

This feature persists **nothing new** — no tables, no columns, no migration (FR-005:
eligibility is evaluated live, never stored). The "model" is a derived value computed from
data that already flows through the system.

## GameDto (in-memory IGDB projection — extended)

| Field | Type | Change |
|---|---|---|
| `ReleaseDate` | `DateTime?` | **New.** The full UTC release date parsed from IGDB's `first_release_date` unix timestamp. `GameLibraryService.MapToDto` already parses this value to derive `ReleaseYear`/`Age`; it now also keeps the date itself. `null` when IGDB has no release date. |
| `ReleaseYear`, `Age` | `int?` | Unchanged — still used for display. Eligibility does **not** use these (research.md Decision 1: year arithmetic misclassifies near the boundary). |

## Review eligibility (derived value, not persisted)

Computed by the pure helper `ReviewEligibility` from `GameDto.ReleaseDate`:

| Input | `IsEligible` | `EligibleAtUtc` |
|---|---|---|
| `ReleaseDate` ≤ now − 5 years (UTC) | `true` (inclusive boundary, FR-001) | `ReleaseDate + 5 years` (in the past) |
| `ReleaseDate` > now − 5 years | `false` | `ReleaseDate + 5 years` (shown to the user, FR-008) |
| `ReleaseDate` is `null` | `false` (FR-002, conservative) | `null` |

**State transitions**: none stored. A game "becomes" eligible purely by the passage of time —
the next evaluation after the threshold returns `true` (FR-005, SC-004).

## GameDetailResponse (API payload — extended)

| Field | Type | Meaning |
|---|---|---|
| `IsEligibleForReview` | `bool` | **New.** Whether a new review may be created for this game right now. |
| `ReviewEligibleAtUtc` | `DateTime?` | **New.** When the game becomes (or became) eligible; `null` when the release date is unknown. Powers FR-008's "eligible in {year}" display. |

All existing fields unchanged.

## Enforcement relationships

```text
IGDB first_release_date ──parsed by──▶ GameDto.ReleaseDate
GameDto.ReleaseDate ──ReviewEligibility──▶ derived eligibility
derived eligibility ──▶ GameDetailResponse.IsEligibleForReview / ReviewEligibleAtUtc   (display)
derived eligibility ──▶ ReviewService.SubmitAsync CREATE path gate → GameNotEligible → 403   (enforcement)
```

Not gated (unchanged): `ReviewService.UpdateAsync`, `DeleteAsync` (authors keep control of
existing content — spec edge case); comments, reports, Admin moderation (FR-006).
