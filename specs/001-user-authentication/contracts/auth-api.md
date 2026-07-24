# Contract: Authentication API

**Feature**: [../spec.md](../spec.md) | **Base path**: `/api/auth`

All endpoints are JSON over HTTPS. All error responses share the shape:

```json
{ "message": "<human-readable, field-appropriate message>" }
```

per Constitution Principle III (structured, consistent error payloads).

---

## `POST /api/auth/register`

Public. Creates an **Author** account (FR-001, FR-004). Cannot create an Admin account
under any circumstances, regardless of request body contents (FR-004, edge case).

**Request body**:

```json
{
  "email": "author@example.com",
  "password": "a-compliant-password"
}
```

Any additional field (e.g., `"role": "Admin"`) MUST be ignored by the server — the role is
never taken from client input.

**Responses**:

| Status | When | Body |
|---|---|---|
| 201 Created | Account created | `{ "id": "...", "email": "...", "role": "Author" }` |
| 400 Bad Request | Missing/invalid email, or password fails policy (FR-003) | `{ "message": "..." }` describing the specific field problem |
| 409 Conflict | Email already registered (FR-002) | `{ "message": "email already in use" }` |

---

## `POST /api/auth/login`

Public. Authenticates an existing Author or Admin account (FR-005, User Story 2/3).

**Request body**:

```json
{
  "email": "user@example.com",
  "password": "their-password"
}
```

**Responses**:

| Status | When | Body |
|---|---|---|
| 200 OK | Credentials valid | `{ "token": "<jwt>", "role": "Admin" \| "Author", "expiresAtUtc": "..." }` |
| 400 Bad Request | Missing email/password | `{ "message": "..." }` |
| 401 Unauthorized | Unknown email OR wrong password (FR-006) | `{ "message": "invalid email or password" }` — identical wording for both cases |

---

## `POST /api/auth/logout`

Requires a valid bearer token. Ends the caller's authenticated state (FR-007).

**Request**: no body; `Authorization: Bearer <jwt>` header.

**Responses**:

| Status | When | Body |
|---|---|---|
| 204 No Content | Logout acknowledged | *(empty)* |
| 401 Unauthorized | Missing/invalid/expired token | `{ "message": "..." }` |

Note: per data-model.md's Authenticated Session section, this endpoint's practical effect
is a signal for the frontend to discard its in-memory token; no server-side revocation list
is implemented in this feature's scope.

---

## Admin-only areas (illustrative pattern, not a new endpoint list)

Any endpoint outside this auth feature that is Admin-only MUST be annotated
`[Authorize(Roles = "Admin")]` (or equivalent) and MUST return:

| Status | When |
|---|---|
| 401 Unauthorized | No valid token presented |
| 403 Forbidden | Valid token presented, but role is `Author` |

This satisfies FR-008 and User Story 3, acceptance scenario 3.

---

## Out of scope for this contract

- Any `forgot-password` / `reset-password` endpoint (FR-009 — explicitly excluded).
- Any endpoint that lets a client set or change its own role.
- Token refresh endpoints (research.md Decision 2 — no refresh-token flow in this feature).
