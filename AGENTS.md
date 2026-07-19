# AGENTS.md

## Purpose

This repository uses `.opencode` as the local agent workflow surface.

- `agents/` defines role behavior.
- `skills/` defines domain rules and implementation preferences.
- `command/` defines repeatable prompts for common work.

## Repo Map

- `apps/`
  Workspace for application code. Keep feature work grouped by app.
- `docs/`
  Workspace for project documentation, architecture notes, and delivery checklists.
- `.opencode/agents/`
  Agent definitions used to shape how the assistant works in this repo.
- `.opencode/skills/`
  Reusable implementation rules for stack-specific work.
- `.opencode/command/`
  Repeatable command prompts for planning and delivery.

## Active Agent

- `dotnet-mentor`
  Default learning-oriented agent for this repo.
  Use it when the goal is to explain, implement, or refactor .NET and React work in a student-friendly way.

## Active Skills

- `dotnet-logic`
  Use for ASP.NET Core structure, service boundaries, controller design, validation, async flows, and testable backend code.
- `react-logic`
  Use for component design, state handling, conditional rendering, decomposition, and readable frontend logic.

## Working Rules

- Start with the smallest feature slice that can be explained, implemented, and validated end to end.
- Use the matching skill before writing code so patterns stay consistent.
- Prefer simple code over clever abstractions.
- When docs are missing, add or update material in `docs/` alongside code changes.
- When a new app is added under `apps/`, document its purpose here and add any app-specific skills or commands if the workflow changes.
