<!--
Sync Impact Report
- Version change: 1.0.0 → 1.0.1
- Modified principles: none (I. Code Quality, II. Testing Standards, III. User Experience
  Consistency, IV. Performance Requirements all retained unchanged)
- Added sections: none
- Removed sections: none
- Content updated:
  - Technology Stack Constraints — docs/techstack.md is now populated (ASP.NET Core 9.0,
    EntityFramework 9.0, SQL Server LocalDb, React + Vite) and is now cited as the single
    source of truth; the prior TODO deferring this is resolved.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check section already generic; no changes required)
  - ✅ .specify/templates/spec-template.md (no constitution-specific references; no changes required)
  - ✅ .specify/templates/tasks-template.md (task categories already cover setup/tests/core/integration/polish; no changes required)
  - ✅ .claude/skills/speckit-constitution (this file; generic guidance, no agent-specific references found)
- Follow-up TODOs: none
-->

# CS221-Finals Constitution

## Core Principles

### I. Code Quality
Code MUST be structured so that any contributor can trace a feature end-to-end without
reverse-engineering hidden coupling.

- Backend (ASP.NET Core): controllers MUST stay thin and delegate business logic to
  services injected via constructors; request models, domain logic, and persistence
  concerns MUST remain separated; async/await MUST be used for all I/O-bound work, and
  sync/async access MUST NOT be mixed within the same flow.
- Frontend (React): components MUST be function components with a single responsibility;
  state and effect hooks MUST be used deliberately, not by default; repeated or stateful
  logic MUST be extracted into focused hooks or helper functions instead of duplicated.
- Abstractions MUST be justified by present need. Over-abstracting small features with
  extra interfaces, layers, or generic helpers that obscure a simple transformation is
  prohibited (YAGNI).
- Every change MUST be explainable step by step; if a reviewer cannot trace the change
  from entry point to effect, the change is not done.
- Input MUST be validated at the request boundary (API layer) before it reaches domain
  logic.

Rationale: This is a small student-team project where clarity and traceability directly
determine how fast defects are found and how easily new contributors onboard. Strict
layering and deliberate abstraction keep the codebase learnable, not just functional.

### II. Testing Standards
Automated tests are the primary evidence that a feature works and keeps working.

- Every new service method or component with conditional logic MUST have at least one
  corresponding automated test (unit or integration) before the associated task is
  marked complete.
- Tests MUST run against the narrowest scope available before a broader validation pass
  (e.g., a single service/component test before a full suite run) so failures are
  localized quickly.
- Bug fixes MUST include a regression test that fails before the fix and passes after,
  unless the defect is purely cosmetic/UI copy with no logic branch.
- Tests MUST NOT depend on execution order or shared mutable state across test cases.
- A pull request MUST NOT be merged with a known-failing or skipped test unless the
  skip is documented with a linked follow-up task.

Rationale: The team is learning production practices; enforcing test-first discipline on
logic-bearing code prevents silent regressions and builds a verifiable safety net as the
codebase grows across a semester-length project.

### III. User Experience Consistency
The application MUST present one coherent experience regardless of which contributor
built a given screen or endpoint.

- Loading, empty, and error states MUST be handled explicitly in every data-driven
  component (mirroring the isLoading/errorMessage pattern already established in this
  repo) — a screen MUST NOT flash blank or throw an unhandled exception while data is
  in flight or absent.
- API responses MUST return HTTP status codes that match the actual outcome (e.g., 400
  for validation failure, 201 for creation, 404 for missing resource), and error
  payloads MUST be structured consistently so the frontend can render them uniformly.
- Shared UI patterns (lists, forms, validation messages) MUST reuse existing components
  or hooks rather than re-implementing equivalent markup or logic with different
  behavior.
- User-facing validation messages MUST be written in plain language tied to the field
  that failed, not generic or raw exception text.

Rationale: Consistency across screens and endpoints is what makes the app feel like a
single product instead of a collection of disconnected student exercises, and it reduces
the surface area users must relearn between features.

### IV. Performance Requirements
Performance MUST be treated as a design constraint, not an afterthought fixed after
release.

- All I/O-bound backend operations (database access, external calls) MUST use
  async/await; synchronous blocking calls on the request path are prohibited.
- Endpoints MUST accept and honor `CancellationToken` so abandoned requests do not
  continue consuming server resources.
- Data-fetching React components MUST avoid redundant re-fetching on re-render (e.g.,
  effects MUST declare correct dependency arrays) and MUST NOT fetch more data than the
  current view renders.
- Any endpoint or query returning a collection MUST support pagination or an explicit,
  documented bound once the underlying data can exceed a screen's worth of results.
- Performance-sensitive changes (new queries, new list views) SHOULD be checked against
  representative data volume before merge, not only against empty/seed data.

Rationale: Performance defects compound silently in student projects because they are
invisible on small seed datasets; setting the bar at async-by-default and bounded
queries prevents the class of issues that only surface under realistic load.

## Technology Stack Constraints

`docs/techstack.md` is the single source of truth for stack versions and dependencies.
As of this amendment it specifies:

- Backend: ASP.NET Core 9.0 (C#), following the controller → service → repository
  layering described in `.opencode/skills/dotnet-logic/SKILL.md`.
- ORM: Entity Framework 9.0. Data access MUST go through EF Core; raw ad hoc SQL is
  prohibited outside of documented, reviewed exceptions (e.g., a migration or a
  performance-justified query noted in the PR description).
- Database: SQL Server LocalDb for local development; EF Core migrations are the only
  sanctioned mechanism for schema changes.
- Frontend: React + Vite (TypeScript, separate project), following the function-component
  and hooks conventions described in `.opencode/skills/react-logic/SKILL.md`.
- Application source lives under `apps/`; project documentation and AI-context material
  lives under `docs/`.
- Any change to the stack (new package, version bump, new persistence technology) MUST
  update `docs/techstack.md` in the same change set so it remains authoritative.

## Development Workflow & Quality Gates

- Every feature starts with the smallest slice that can be explained, implemented, and
  validated end to end (per `AGENTS.md`).
- The matching skill (`dotnet-logic` or `react-logic`) MUST be consulted before writing
  code in that area so patterns stay consistent across contributors.
- Before a task is considered done: the narrowest available test/validation has been run
  and passed, the change is traceable step by step, and any new documentation need in
  `docs/` has been addressed alongside the code change.
- Code review (self- or peer-review) MUST check compliance with the four Core Principles
  above; complexity that violates Principle I (Code Quality) MUST be justified in the PR
  description or simplified before merge.

## Governance

This constitution supersedes ad hoc conventions and prior informal practice for this
repository. Where `AGENTS.md` or files under `.opencode/skills/` conflict with this
document, this constitution governs; those files should be updated to match rather than
treated as an alternate authority.

Amendment procedure:
1. Propose the change (principle addition, removal, or rewording) with rationale.
2. Update this file, following the versioning policy below.
3. Propagate the change to dependent artifacts (`.specify/templates/*.md`, `AGENTS.md`,
   `.opencode/skills/*`) in the same change set where the amendment affects them.
4. Record the amendment via the Sync Impact Report comment at the top of this file.

Versioning policy (semantic versioning applied to governance):
- MAJOR: backward-incompatible principle removal or redefinition.
- MINOR: a new principle or materially expanded section is added.
- PATCH: clarifications, wording, or non-semantic fixes.

Compliance review: every plan or task-generation pass under Spec Kit MUST include a
Constitution Check against the four Core Principles before implementation begins.
Violations MUST be either resolved or explicitly justified in the plan's Complexity
Tracking section.

**Version**: 1.0.1 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20
