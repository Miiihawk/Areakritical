# Feature Specification: User Authentication

**Feature Branch**: `001-user-authentication`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Create authentication for the application that I currently have. Here is my current setup, The backend is using .NET while my frontend is a separate react application. You should check the 'apps' folder for the current structure. Do not implement forgot password because it is not a priority to do and make. you should also add details about pre-seeding the admin before deployment. No admin should be able to register using a public registration page or no admin registration in the public page."

## Clarifications

### Session 2026-07-20

- Q: What are the two backend roles, and how is each one populated? → A: "Admin" (pre-seeded only, never via public registration) and "Author" (self-registered through the public registration page). This replaces the earlier generic "User" role name used in the initial draft.

### Session 2026-07-23

- Q: What role does the new username play — does it replace email for sign-in, sit alongside it as a display-only handle, or work as an alternative sign-in identifier? → A: Username is an alternative sign-in identifier: a user can log in with either their email or their username, both paired with their password.
- Q: Is username required at registration, or optional/settable later? → A: Required at registration — every new account must have a unique username from the moment it is created.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Self-Registration as an Author (Priority: P1)

A new visitor creates their own account by providing a username, an email address, and a password so they can access features that require being signed in.

**Why this priority**: Without self-registration there is no way for ordinary users to obtain an account, so this is the entry point for the entire authentication system.

**Independent Test**: Can be fully tested by submitting the public registration form with a unique username, a valid unused email, and a compliant password, and confirming a new Author account is created and cannot act as an Admin.

**Acceptance Scenarios**:

1. **Given** a visitor is on the public registration page, **When** they submit a unique username, a unique email, and a compliant password, **Then** a new account with the "Author" role is created and they are informed registration succeeded.
2. **Given** a visitor submits the registration form with an email that is already registered, **When** the system validates the submission, **Then** registration is rejected with a clear "email already in use" message and no duplicate account is created.
3. **Given** a visitor submits the registration form with a username that is already taken, **When** the system validates the submission, **Then** registration is rejected with a clear "username already in use" message and no duplicate account is created.
4. **Given** a visitor submits the registration form with a password that does not meet the minimum password policy, **Then** registration is rejected with a clear explanation of the policy.
5. **Given** a visitor submits the registration form without a username, **When** the system validates the submission, **Then** registration is rejected with a message that a username is required.
6. **Given** the public registration page, **When** inspected or submitted with any attempt to set an elevated/Admin role (e.g., via a tampered request), **Then** the system ignores or rejects the elevated role and creates, at most, an "Author" account.

---

### User Story 2 - User Login (Priority: P1)

A registered user (Author or Admin) signs in with either their email or their username, plus their password, to reach the parts of the application that require authentication.

**Why this priority**: Registration alone provides no value without the ability to subsequently authenticate; login is the core recurring interaction.

**Independent Test**: Can be fully tested by signing in with a known valid account's email+password, separately with that same account's username+password, and confirming the user lands in an authenticated state both ways; and by attempting sign-in with invalid credentials and confirming access is denied.

**Acceptance Scenarios**:

1. **Given** a registered account with known-correct credentials, **When** the user submits their email (or their username) and password on the login page, **Then** they are authenticated and granted access to authenticated areas of the application appropriate to their role.
2. **Given** a login attempt with a correct email or username but incorrect password, **When** submitted, **Then** the system denies access and shows a generic invalid-credentials message that does not reveal which field was wrong.
3. **Given** a login attempt with an email or username that has no matching account, **When** submitted, **Then** the system denies access and shows the same generic invalid-credentials message as scenario 2.
4. **Given** an authenticated user, **When** their session/token is no longer valid (expired or logged out), **Then** any subsequent request to an authenticated area is denied and the user is prompted to log in again.

---

### User Story 3 - Admin Access via Pre-Seeded Account (Priority: P2)

An Administrator signs in using an Admin account that was created ahead of time as part of deployment, without ever needing — or being able — to create that Admin account through the public-facing registration page.

**Why this priority**: Administrative capability must exist from day one of deployment, but must not be exposed as a public self-service signup path, since that would let anyone escalate to Admin.

**Independent Test**: Can be fully tested by deploying the application, confirming an Admin account already exists and can log in, and confirming the public registration page has no way to create or select an Admin account.

**Acceptance Scenarios**:

1. **Given** a freshly deployed environment, **When** the deployment/seeding process has run, **Then** at least one Admin account exists and can successfully log in using its seeded credentials.
2. **Given** the public registration page, **When** any visitor uses it, **Then** there is no option, field, or hidden mechanism that results in an account with the Admin role.
3. **Given** an authenticated Admin, **When** they log in, **Then** they are recognized as Admin and can access Admin-only areas that an "Author" account cannot access.

---

### User Story 4 - Logout (Priority: P3)

An authenticated user (Author or Admin) ends their session on demand so that the account cannot continue to be used from that browser/session afterward.

**Why this priority**: Important for account safety on shared devices, but the application is still usable end-to-end (for a single session) without it, so it is lower priority than registration/login.

**Independent Test**: Can be fully tested by logging in, triggering logout, and then confirming that authenticated areas are no longer reachable without logging in again.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they choose to log out, **Then** their current session/token is invalidated and they are returned to an unauthenticated state.
2. **Given** a user has logged out, **When** they attempt to reuse the previous session/token to reach an authenticated area, **Then** access is denied.

---

### Edge Cases

- What happens when a registration or login request is missing required fields (empty username, email, or password)? System MUST reject with a clear validation message.
- What happens when two registration requests for the same username arrive at nearly the same time? System MUST ensure only one account is created for that username (no duplicate accounts), mirroring the existing duplicate-email handling.
- What happens when a client attempts to register or otherwise create an account with the Admin role directly through the public API/form? System MUST NOT create an Admin account through that path.
- What happens when someone attempts many failed logins in a row against the same account? System MUST NOT reveal whether the email exists; repeated failures continue to receive the same generic invalid-credentials response.
- What happens if the pre-seeded Admin account's credentials are lost, given that "forgot password" is explicitly out of scope? This is a known limitation for this feature; recovery is a manual/operational task outside this feature's scope (e.g., re-running the seed process or a direct data fix), not a self-service flow.
- What happens when an already-authenticated user visits the public registration or login page again? System MUST handle this gracefully (e.g., treat them as already signed in) rather than erroring.
- What happens when two registration requests for the same email arrive at nearly the same time? System MUST ensure only one account is created for that email (no duplicate accounts).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a visitor to self-register a new account using a username, an email address, and a password through a public registration page.
- **FR-001a**: System MUST require a username at registration; registration MUST be rejected if the username is missing.
- **FR-002**: System MUST reject registration when the submitted email is already associated with an existing account.
- **FR-002a**: System MUST reject registration when the submitted username is already associated with an existing account.
- **FR-003**: System MUST enforce a minimum password policy (at minimum: a minimum length) on registration and communicate policy violations clearly to the user.
- **FR-004**: System MUST assign every account created through the public registration page the "Author" role; the public registration path MUST NOT be able to create or select an "Admin" role account, regardless of input supplied.
- **FR-005**: System MUST allow a registered user to log in using either their email or their username, plus their password, and, on success, place them in an authenticated state scoped to their assigned role (Author or Admin).
- **FR-006**: System MUST deny login when credentials are invalid (unknown email/username or wrong password) and MUST return a single generic invalid-credentials message that does not indicate which part was incorrect or whether the identifier existed.
- **FR-007**: System MUST allow an authenticated user to log out, which ends their authenticated state so it can no longer be used to reach authenticated areas.
- **FR-008**: System MUST distinguish between exactly two roles — "Admin" and "Author" — and MUST restrict Admin-only areas/actions to accounts with the Admin role.
- **FR-009**: System MUST NOT provide a "forgot password" or self-service password-reset capability in this feature; this is explicitly out of scope.
- **FR-010**: System MUST provide a repeatable pre-seeding mechanism that creates at least one Admin account with known credentials before or during deployment, independent of and inaccessible from the public registration page.
- **FR-011**: The pre-seeding mechanism MUST be safe to run multiple times without creating duplicate Admin accounts (e.g., re-running deployment does not create a second seeded Admin).
- **FR-012**: System MUST persist account credentials so that passwords are never stored or transmitted in plain, human-readable form.
- **FR-013**: System MUST keep an authenticated user's signed-in state recognized across subsequent requests until they log out or that state naturally expires.

### Key Entities

- **Account**: Represents a person who can authenticate into the system. Key attributes: unique username, unique email address, credential (password, stored securely), assigned role (Author or Admin), creation timestamp. Every Account has exactly one role. Both username and email independently and uniquely identify an Account, and either may be used to log in.
- **Role**: Represents the level of access an Account has. Two values in scope: "Author" (self-registerable through the public registration page) and "Admin" (pre-seeded only, never created through public registration).
- **Authenticated Session**: Represents a period during which an Account is recognized as signed in. Tied to exactly one Account; can be ended explicitly (logout) or expire.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can register an account and reach an authenticated area in under 2 minutes without assistance.
- **SC-002**: 100% of accounts created through the public registration page carry the "Author" role; 0% carry the "Admin" role, verified by attempting role-tampered registration submissions.
- **SC-002a**: 100% of registered accounts can successfully log in using either their email or their username (paired with their correct password), verified across a sample of accounts.
- **SC-003**: Every deployment of the application results in exactly one seeded Admin account being available for login, verified across at least 3 consecutive redeployments without duplicate Admin accounts appearing.
- **SC-004**: Users attempting to log in with invalid credentials receive a rejection response indistinguishable in wording between "unknown email" and "wrong password" cases, in 100% of tested attempts.
- **SC-005**: A logged-out session can no longer reach authenticated areas in 100% of tested attempts.

## Assumptions

- Authentication is username/email + password based; no third-party/social login (OAuth/SSO) is in scope for this feature.
- Username format follows a common convention (e.g., 3–30 characters, letters/numbers/underscore/hyphen, compared case-insensitively for uniqueness); the exact bounds are an implementation decision for the planning phase, not a behavior visible to users beyond "must be unique and non-empty."
- No email-verification step is required before a newly self-registered "Author" account can log in; registration is effective immediately.
- Only two roles exist for this feature: "Admin" and "Author." Finer-grained roles/permissions are out of scope.
- There is no account-lockout mechanism (e.g., temporary ban after N failed attempts) in this feature; repeated invalid attempts simply keep failing with a generic message. This may be revisited in a future security-hardening feature.
- "Forgot password" / password reset is explicitly excluded from this feature per the request; recovering a lost password (including the seeded Admin's) is an operational/manual task outside this feature's scope.
- The pre-seeded Admin account's initial credentials are provided via deployment configuration/environment rather than hardcoded in source, so they can differ per environment; the exact configuration mechanism is an implementation decision for the planning phase.
- This feature covers the authentication mechanism itself (register, login, logout, role distinction, admin seeding) — it does not cover profile management, multi-factor authentication, or broader authorization/permission rules beyond the Author/Admin distinction.
