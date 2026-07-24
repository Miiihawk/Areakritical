# Data Model: User Authentication

**Feature**: [spec.md](./spec.md) | **Derived from**: Key Entities section + Functional Requirements

## Account (`ApplicationUser`, extends Identity's `IdentityUser`)

Represents a person who can authenticate into the system (spec: **Account** entity).

| Field | Type | Rules |
|---|---|---|
| `Id` | string (GUID) | Primary key; provided by Identity |
| `Email` / `UserName` | string | Unique (case-insensitive, enforced by Identity's normalized index); required; valid email format (FR-001, edge case: empty email rejected) |
| `PasswordHash` | string | Never plain text (FR-012); managed entirely by Identity's `PasswordHasher`, never read/set directly by application code |
| `CreatedAt` | DateTime (UTC) | Set once at creation; not user-editable |
| Role (via `AspNetUserRoles`) | one of `Admin` \| `Author` | Exactly one role per account (FR-008); assigned at creation and not changed by this feature |

**Validation rules** (FR-001–FR-003):
- Email: required, valid format, must not already exist on another Account (FR-002).
- Password: required, must satisfy the minimum password policy (minimum length; delegated
  to Identity's configurable `PasswordOptions`) (FR-003).

**Relationships**: An Account has exactly one Role (one-to-one via Identity's user-role
join, constrained by application logic to a single role per account). An Account can have
zero or one active Authenticated Session at a time from the API's perspective (JWTs are
stateless, so "session" is really "a currently-valid, non-expired token" — see below).

**Lifecycle**: Created via public registration (always `Author`) or via the Admin seeding
routine (always `Admin`, and only ever via seeding — FR-004, FR-010). No update or delete
lifecycle is in scope for this feature (no profile management, per spec Assumptions).

## Role

Represents the level of access an Account has (spec: **Role** entity).

| Value | Population path |
|---|---|
| `Author` | Public registration page only (FR-004) |
| `Admin` | Pre-seeding routine only, never public registration (FR-004, FR-010) |

Implemented as Identity's built-in `IdentityRole` with exactly these two seeded rows; no
additional roles are created by this feature (FR-008).

## Authenticated Session (JWT access token — not a persisted entity)

Represents a period during which an Account is recognized as signed in (spec:
**Authenticated Session** entity). Because the chosen mechanism (research.md, Decision 2)
is a stateless JWT, this is not a database row — it is the token itself, held by the
frontend and validated by the backend on each request.

| Claim | Meaning |
|---|---|
| `sub` | Account `Id` |
| `email` | Account email |
| `role` | `Admin` or `Author` |
| `exp` | Expiry (fixed at issuance, e.g., 60 minutes — research.md Decision 2) |

**State transitions**:
- **Issued**: on successful login (FR-005); a new token is minted with a fresh `exp`.
- **Ended by logout (FR-007)**: the frontend discards the in-memory token; because the
  token is stateless, the backend does not need a server-side revocation list for this
  feature's scope — a logged-out token would still cryptographically validate until `exp`,
  but the frontend no longer sends it. (This limitation is acceptable at this feature's
  scope: no requirement exists for forced remote logout or token revocation lists; noted
  here for follow-up rather than left implicit.)
- **Ended by expiry**: token's `exp` passes; the API rejects it as any other invalid token,
  and the frontend treats a 401 response as "no longer authenticated" and prompts re-login
  (FR-013, User Story 2 acceptance scenario 4).

## Entity relationship summary

```text
Account (1) ──has exactly one── Role (Admin | Author)
Account (1) ──can hold zero-or-one valid── Authenticated Session (JWT, not persisted)
```
