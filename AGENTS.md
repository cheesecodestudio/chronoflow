# Chronoflow — Engineering Harness

## Purpose

This file contains stable repository-wide instructions for OpenCode and other coding agents.
Keep it small. Task-specific procedures belong in Skills; temporary feature decisions belong in Issues, PRs, specs, or ADRs.

Chronoflow is a React + TypeScript + Vite application for creating, managing, personalizing, and presenting countdown/count-up timers. It is evolving from browser-local persistence toward a production-oriented multi-user product.

The harness optimizes for: bounded changes, clear architecture, secure ownership, proportional verification, low context noise, and inspectable GitHub evidence.

## Source of truth

When sources conflict, use this order:

1. actual repository and observed deployed behavior;
2. current official documentation;
3. approved feature spec / current canonical project decision;
4. current GitHub Issue / milestone intent;
5. curated secondary sources;
6. AI-generated material and community anecdotes.

An approved spec is the implementation contract for a change, but it does not rewrite reality. If an approved spec conflicts with existing repository behavior or current official documentation, stop and surface the conflict before implementation.

## Current technology direction

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- Temporal API + `temporal-polyfill`
- Vitest
- Supabase / PostgreSQL / Supabase Auth / PostgreSQL RLS
- Vercel
- Playwright when browser automation provides durable regression value

Do not introduce a framework, state library, service layer, agent, MCP, or abstraction without a concrete requirement.

## Architecture invariants

Prefer the simplest structure that preserves clear responsibility boundaries:

```text
UI / React
    ↓
Application / domain behavior
    ↓
Persistence boundary
    ↓
Supabase / PostgreSQL
```

Preserve the repository's existing structure unless a requirement justifies change.

React components should primarily render UI, handle interaction/UI state, and coordinate application behavior. Do not hide authorization or persistence rules inside presentation components.

Persistence must have an explicit source of truth. Avoid duplicated persistence logic and accidental LocalStorage/database dual truth.

Create abstractions only when they isolate a real dependency/responsibility, improve testability, prevent meaningful duplication, or reduce coupling. Do not add speculative repositories/factories/providers/wrappers.

## Security invariants

Authentication identifies a user. Authorization decides what that identity may do. Frontend route protection and filtering are UX boundaries, not final authorization boundaries.

For user-owned database data, PostgreSQL RLS is the final data authorization boundary where applicable.

For every user-owned table, deliberately consider SELECT, INSERT, UPDATE, and DELETE.

Critical invariant:

> User A must not be able to read, create as, modify, transfer ownership of, or delete User B's protected data even when the normal UI is bypassed.

Never expose privileged Supabase/service-role credentials, database passwords, private API keys, or admin credentials in browser code, tracked files, logs, or documentation.

## Verification invariants

Verification is risk-based. More checks are not automatically better.

- LOW: docs, comments, isolated non-runtime metadata.
- NORMAL: bounded application behavior/refactor.
- HIGH: persistence, migrations, auth/session behavior, deployment/configuration, important data behavior.
- SECURITY: authorization, RLS, secrets, privilege, trust boundaries, cross-user access.

Use the `quality-gates` Skill for the exact gate.

A manual browser check is evidence of observed behavior, not committed E2E coverage.

Do not claim a test, CI result, deployment, security property, or browser behavior that was not actually verified.

## Spec Gate

Do not force full SDD onto trivial work.

A full feature spec is REQUIRED before implementation when one or more of these are true:

- schema/data migration or destructive data behavior;
- authentication, authorization, RLS, secrets, privilege, or trust-boundary change;
- new external service/integration with meaningful failure modes;
- public API/data contract change;
- cross-cutting architecture change;
- feature has multiple plausible designs with material trade-offs;
- acceptance behavior is ambiguous enough that implementation could drift;
- the change spans several subsystems and traceability materially reduces risk.

A full spec consists of:

```text
docs/specs/<issue-or-slug>/requirements.md
docs/specs/<issue-or-slug>/design.md
docs/specs/<issue-or-slug>/tasks.md
```

The `spec-author` subagent owns drafting these files. It must not edit application code.

Full-spec lifecycle:

```text
DRAFT
→ human review
→ APPROVED
→ implementation
→ verification
→ PR / merge
```

The agent must not mark a spec APPROVED without explicit human approval.

For LOW/NORMAL work with clear acceptance criteria, the GitHub Issue/task plus a short implementation plan is sufficient.

## Requirements style

For full specs, requirements must be observable and testable. Prefer EARS-style statements when they improve precision, for example:

- `WHEN <event>, the system SHALL <observable behavior>.`
- `WHILE <state>, the system SHALL <observable behavior>.`
- `IF <undesired condition>, the system SHALL <response>.`
- `The system SHALL <always-required behavior>.`

Assign requirement IDs (`REQ-001`, ...). Design decisions and tasks should reference the requirement IDs they satisfy. Verification should map important requirements to evidence.

## Human decision boundaries

Stop and ask before:

- approving a DRAFT spec;
- choosing between materially different architectures not settled by an approved spec;
- widening scope;
- destructive data changes;
- installing new dependencies without an explicit task requirement;
- committing, pushing, merging, rewriting Git history, or mutating remote resources when approval is configured.

Do not ask the human to answer facts the repository can establish mechanically.

## Fail-fast protocol

Before meaningful implementation:

1. inspect `git status` and current branch;
2. inspect relevant code/tests/config and `package.json` scripts;
3. identify unrelated local changes and do not overwrite them;
4. confirm acceptance criteria / approved spec;
5. for HIGH/SECURITY work, establish enough baseline evidence to distinguish pre-existing failures from regressions when practical.

If the baseline is red, do not blindly repair unrelated infrastructure. Determine whether the failure blocks the requested change. Surface it if it invalidates verification; otherwise record it as pre-existing and keep scope bounded.

No mandatory `init.sh` is required. Add a repository preflight script only when repeated real work proves it removes meaningful duplication.

## Context discipline

Use the repository as external memory. Prefer paths, diffs, tests, Issues, PRs, specs, and ADRs over repeating long conversation history.

When delegating to a subagent, pass only a compact task packet:

```text
Goal
Artifact/diff to inspect
Relevant spec/Issue paths
Constraints / non-goals
Risk
Expected output
```

Subagents should inspect repository evidence directly rather than trust a long parent summary.

Do not create `featurelist.json` or a custom `history.md` while GitHub Issues/PRs/Git already provide task state and audit history. Add another state store only if a proven workflow gap exists.

## Tool discipline

Prefer repository files and primitive tools first: read, glob/grep, Git diff/status/log, package scripts, compiler, test runner.

Use Context7/current official docs when behavior depends on fast-changing external APIs or configuration. Do not fetch documentation when repository code/tests already answer the question.

Use Playwright MCP for browser investigation, reproduction, and interactive verification. Use repository-owned Playwright tests for repeatable regression protection.

MCP servers consume context. Use only the server/tool needed for the current task.

## Git discipline

For meaningful work prefer:

```text
Issue / task
→ feature/fix branch
→ implementation
→ verification
→ review
→ Pull Request
→ CI
→ merge
```

Do not create Issues for trivial changes.

Never discard unrelated local work. Never force-push, hard-reset, clean untracked files, or delete branches destructively unless explicitly requested and independently justified.

After a final diff passes a gate, reuse that evidence while the relevant artifact remains unchanged. Invalidate only the checks affected by a new diff, dependency, migration, branch/base, remote PR, deployment, or assumption.

## Documentation

Document actual behavior and durable decisions, not aspiration.

Use an ADR only for a decision that will remain useful after the feature is merged. Do not create an ADR for routine implementation details.

## Completion standard

A coding agent may call work complete only when it can state:

- what changed;
- which requirement/acceptance criterion it satisfies;
- what evidence was executed and its result;
- what was not verified;
- security implications where relevant;
- deferred limitations;
- whether the artifact is ready for delivery.
