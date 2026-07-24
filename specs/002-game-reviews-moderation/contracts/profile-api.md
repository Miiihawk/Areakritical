# Contract: Profile API

**Feature**: [../spec.md](../spec.md) | **Base path**: `/api/profile`

---

## `GET /api/profile`

Signed-in users. Returns the caller's own profile (FR-014).

**Response**: `200 OK` — `ProfileResponse`: `{ id, username, email, displayName, bio }`
(`username`/`email` are read-only here — governed by the authentication feature).

---

## `PUT /api/profile`

Signed-in users. Updates the caller's own editable profile fields (FR-014, FR-015).

**Request body**: `{ "displayName": "PixelPundit", "bio": "JRPG enjoyer." }`

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Updated | `ProfileResponse` |
| 400 Bad Request | `displayName` explicitly submitted as empty/whitespace | `{ "message": "display name cannot be blank" }` |

Per FR-015, every place a user's identity is displayed (reviews, comments) reads the current
`ApplicationUser.DisplayName`/`Username` at render time — no denormalized copy of the name
is stored on Review/Comment.

---

## `POST /api/profile/password`

Signed-in users. Changes the caller's own password (FR-014a, FR-014b). **No current
password is requested or accepted** — this is a deliberate clarification decision (see
spec.md's Clarifications and Assumptions), implemented via Identity's
`RemovePasswordAsync`/`AddPasswordAsync` pair (research.md Decision 8).

**Request body**:

```json
{
  "newPassword": "correct horse battery staple",
  "confirmNewPassword": "correct horse battery staple"
}
```

**Responses**:

| Status | When | Body |
|---|---|---|
| 204 No Content | Password changed | *(empty)* |
| 400 Bad Request | `newPassword` ≠ `confirmNewPassword` | `{ "message": "passwords do not match" }` |
| 400 Bad Request | `newPassword` fails the password policy | `{ "message": "..." }` describing the policy (same wording style as registration's policy failure) |

Note (per spec.md's edge cases): this endpoint does not revoke the caller's other
already-issued, still-valid bearer tokens — they remain usable until they naturally expire,
consistent with the authentication feature's stateless-JWT, no-revocation-list design.
