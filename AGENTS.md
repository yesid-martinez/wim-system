# AGENTS.md

## Project

Small watch inventory and pricing application.

The project is developed incrementally. Work must be completed in small, independently reviewable steps.

The repository is the source of truth for implementation. The GitHub Issue is the source of truth for the current task.

Do not implement future features unless explicitly required by the current Issue.

---

## Core Development Rules

### Small changes

Prefer the smallest possible change that satisfies the current Issue.

- Do not rewrite entire files when only a few lines need to change.
- Do not refactor unrelated code.
- Do not reorganize existing code without a concrete reason related to the Issue.
- Do not introduce abstractions before they are needed.
- Do not add dependencies unless the Issue requires them.
- Do not "clean up" surrounding code while implementing a focused change.
- Preserve existing behavior outside the requested change.

If the requested change appears larger than expected, stop and propose splitting it into smaller Issues rather than expanding the current implementation.

### One responsibility at a time

A task should normally represent one small behavior, function, database operation, UI interaction, or security rule.

Examples:

- Create the `watches` table.
- Add the repository method to insert a watch.
- Add validation for an empty reference.
- Add the service method for creating a watch.
- Add the UI form for creating a watch.
- Connect the form to the service.
- Add success feedback.
- Add duplicate-reference error handling.

Do not combine independent responsibilities into one large implementation unless the Issue explicitly requires it.

---

## Issue-First Workflow

Never start implementation without an Issue.

Required flow:

```text
Issue
  ↓
Branch
  ↓
Small implementation
  ↓
Validation
  ↓
Commit
  ↓
PR
  ↓
Human review
  ↓
Merge
```

The human defines the Issue and controls its scope.

The agent implements the approved Issue.

If asked to implement something without an Issue:

1. Propose a small Issue.
2. Do not implement it yet.
3. Wait for the Issue to be created or explicitly approved.

Do not create or start unrelated Issues automatically.

### Issue scope

Each Issue must have:

- One objective.
- A clearly defined scope.
- Explicit acceptance criteria.
- Explicit exclusions when necessary.

If an Issue contains multiple independent responsibilities, recommend splitting it before implementation.

---

## Planning Before Coding

Before modifying code:

1. Read the Issue completely.
2. Inspect only the relevant existing files and patterns.
3. Identify the smallest set of files that need modification.
4. Determine whether the requested behavior can be implemented with localized changes.
5. Check existing conventions before introducing a new pattern.

Do not inspect or modify the entire repository unless necessary.

Do not create a broad implementation plan for unrelated future work.

---

## Branches

Create a branch from the latest `main`.

Format:

```text
<type>/<issue-number>-<short-description>
```

Examples:

```text
feat/12-add-watch
feat/13-add-inventory-lot
feat/14-add-login
fix/15-duplicate-watch-reference
```

Never commit directly to `main`.

Never push directly to `main`.

---

## Implementation

Implement only what the Issue requires.

### File changes

Before editing a file, determine whether the requested behavior can be implemented with a localized change.

Prefer:

```text
small targeted edit
```

over:

```text
rewrite entire file
```

Do not replace an entire file unless the Issue explicitly requires a complete rewrite or the existing structure makes a localized change technically impossible.

If a file becomes difficult to modify safely, stop and propose a separate refactoring Issue.

### Existing code

Follow the project's existing conventions.

Do not introduce a new architectural pattern when an existing pattern already solves the problem.

Do not rename existing APIs, files, variables, tables, or components unless required by the current Issue.

Do not modify unrelated behavior.

---

## Commits

Commits should be small and atomic.

One commit should represent one logical change.

Good:

```text
feat: add watches table
feat: add watch repository
feat: validate watch reference
feat: add create watch service
feat: connect watch form
```

Bad:

```text
feat: implement complete watch inventory system
```

Do not combine:

- schema changes
- unrelated refactors
- UI redesign
- dependency updates
- formatting-only changes
- future features

into the same commit.

If the implementation naturally requires multiple independent steps, create multiple small commits.

Each commit should leave the project in a coherent state whenever practical.

---

## Pull Requests

A PR must correspond to exactly one Issue.

The PR must explicitly reference the Issue so GitHub closes it automatically after the PR is merged.

Use:

```text
Closes #<issue-number>
```

Prefer putting this in the PR body.

Example:

```md
## Issue

Closes #12
```

Do not use only a plain reference such as `#12` when automatic closure is intended.

PR title:

```text
<type>: <short description>
```

PR body:

```md
## Summary

What changed and why.

## Issue

Closes #<issue-number>

## Changes

- ...

## Validation

- ...

## Manual Steps

- None
```

The PR must contain only the changes required by the Issue.

Never include unrelated changes.

Never merge your own PR.

Human review is required.

---

## Scope Control

The current Issue always has priority over future project plans.

Do not implement:

- future features
- speculative abstractions
- improvements not required by the Issue
- additional database tables
- additional endpoints
- additional UI
- additional roles
- additional configuration

unless the current Issue explicitly requires them.

If something is discovered that should be done later, mention it in the PR or propose a separate Issue.

Do not implement it as part of the current task.

---

## Database

The database is the source of truth for persistent application data.

Schema changes must be represented in the repository's schema/migration system.

Do not make unrelated schema changes while implementing a focused Issue.

Preserve:

- foreign-key integrity
- unique constraints
- non-null constraints
- appropriate numeric types for monetary values
- existing security policies

Do not store derived values unless the Issue explicitly requires them.

Before changing an existing table, inspect its current definition and dependencies.

---

## Security

Security must be enforced server-side/database-side where applicable.

Never rely on:

- hidden UI fields
- client-side filtering
- client-side role checks
- email addresses as authorization
- user-editable metadata as authorization

Do not weaken existing security to make an implementation easier.

When an Issue modifies authorization, RLS, grants, views, or sensitive data access, validation must explicitly verify the affected roles.

Never expose acquisition costs to roles that are not authorized to access them.

Never commit secrets or service-role credentials.

---

## Validation

Run only the validation relevant to the current change.

At minimum:

- Run existing lint/typecheck/build commands when applicable.
- Verify the specific behavior introduced by the Issue.
- For database/security changes, verify the affected access paths.
- Report exactly what was executed and whether it passed.

Never claim a test, build, migration, or manual verification was performed if it was not.

If validation cannot be completed because of an external or manual dependency, report it clearly.

---

## Stop Conditions

Stop implementation and ask for clarification when:

- The Issue is ambiguous.
- The requested change conflicts with existing architecture.
- The change requires unrelated features.
- The change is becoming substantially larger than the Issue describes.
- A security decision is required but not specified.
- A database design decision affects future domain behavior and cannot be safely inferred.
- The correct implementation requires modifying many unrelated files.

Do not solve ambiguity by silently expanding scope.

If the task is too large, recommend splitting it instead of producing a large PR.

---

## Agent Behavior

The agent should optimize for:

1. Smallest correct change.
2. Clear separation of responsibilities.
3. Easy human review.
4. Minimal file modifications.
5. Explicit validation.
6. Reversible changes.
7. Consistency with existing repository patterns.

When two implementations are both valid, prefer the simpler implementation with fewer moving parts.

When a task can be completed with 20 changed lines instead of 200, prefer the smaller change.

When a task can be split into independent steps, recommend splitting it.

Do not optimize for completing the largest amount of functionality in one PR.

Optimize for completing one clearly defined piece of functionality correctly.
