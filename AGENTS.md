# Chronoflow — AGENTS.md

## 1. Purpose

This file defines the shared engineering instructions for AI coding agents working in the Chronoflow repository.

It applies across implementation, investigation, review, testing, security, documentation, and architecture work.

Specialized OpenCode agents may define additional task-specific behavior, but they must respect the rules in this file.

Do not duplicate specialized agent prompts here.

This file exists to keep agent-assisted work aligned with:

* the current Chronoflow milestone;
* the actual repository;
* the project's architecture;
* security boundaries;
* testing and verification requirements;
* scope control;
* professional engineering evidence.

---

# 2. Product Context

Chronoflow is a web application for creating, managing, personalizing, and presenting visual countdowns and count-up timers.

Users can create timers and select which ones appear in a presentation mode that automatically rotates through selected cards.

Chronoflow is being evolved from a browser-local application into a production-oriented multi-user product.

The project should demonstrate professional software engineering, not merely feature quantity.

Primary engineering goals include:

* understandable architecture;
* secure authentication;
* explicit authorization;
* reliable PostgreSQL persistence;
* database-enforced ownership;
* maintainable tests;
* production-quality failure handling;
* CI/CD;
* secure configuration;
* useful documentation;
* controlled AI integration when it provides actual product value;
* inspectable professional evidence.

---

# 3. Current Technology Direction

## Frontend

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* shadcn/ui
* Temporal API
* `temporal-polyfill`

Use Zustand only where global/shared state clearly benefits from it.

Do not introduce global state merely for convenience.

## Testing

Current test tooling includes:

* Vitest

Future/appropriate E2E verification may include:

* Playwright test suite

Playwright MCP is separately available for interactive browser verification.

## Backend / Data

Current direction:

* Supabase
* PostgreSQL
* Supabase Auth
* PostgreSQL Row Level Security

## Deployment

Current deployment target:

* Vercel

Do not migrate Chronoflow to another platform without a concrete technical reason.

## Future AI Integration

The first controlled AI capability is expected to be natural-language timer creation.

Target flow:

```text
User text
    ↓
LLM
    ↓
Structured candidate
    ↓
Application validation
    ↓
User confirmation
    ↓
Persistence
```

The model must not receive unrestricted database access.

AI functionality is not part of the current Week 1 implementation scope.

---

# 4. Current Milestone

Current phase:

**Chronoflow Week 1 — Architecture + Supabase Auth + Persistence + RLS**

Target shipped capability:

> Authenticated Chronoflow users can persist their own timer data securely, with ownership enforced at the database layer.

Current implementation priorities:

1. Define the persistent data model.
2. Define ownership rules.
3. Define anonymous vs authenticated behavior.
4. Configure Supabase safely.
5. Implement authentication and session handling.
6. Persist timer data in PostgreSQL.
7. Make LocalStorage migration/fallback behavior explicit.
8. Enforce ownership through RLS.
9. Verify cross-user isolation.
10. Add appropriate automated verification.
11. Update architecture/documentation where behavior changes.

Expected integrated behavior:

```text
sign up
→ sign in
→ create timer
→ reload
→ timer persists
→ sign out
→ authenticate as another user
→ first user's protected data is inaccessible
```

The milestone is not complete merely because the normal UI happy path works.

---

# 5. Scope Protection

Protect the active milestone.

Do not introduce unrelated work unless explicitly requested.

During the current milestone, avoid implementation work on:

* billing;
* subscriptions;
* SaaS plan limits;
* custom domains;
* major visual redesigns;
* speculative backend services;
* analytics;
* advanced personalization;
* MCP-based product architecture;
* agents inside Chronoflow;
* AI countdown creation;
* unnecessary infrastructure;
* premature optimization.

Future requirements may influence a current decision when the additional cost is small.

Do not build future systems prematurely.

When requested work falls outside the active milestone, identify that clearly before expanding scope.

Prefer:

```text
current milestone value
>
interesting future capability
```

---

# 6. Source of Truth

Use the following authority order when information conflicts:

```text
1. Actual repository / observed deployed behavior
2. Current official documentation
3. Current canonical project decisions / roadmap
4. Current execution guide
5. Curated trusted secondary sources
6. AI-generated material
7. Community anecdotes
```

Do not assume roadmap descriptions accurately represent the current repository.

Before making meaningful changes:

1. inspect the relevant repository code;
2. inspect existing tests;
3. inspect configuration;
4. inspect `package.json` scripts before assuming commands;
5. inspect current architecture/docs when relevant.

The repository determines what Chronoflow currently does.

The roadmap determines intended direction.

Do not silently reconcile a conflict between them.

Surface the conflict.

---

# 7. External Documentation and Context7 MCP

Context7 MCP is available for current library/framework documentation.

Use Context7 when implementation depends on APIs, behavior, configuration, or conventions that may have changed.

High-value examples include:

* Supabase Auth;
* Supabase JavaScript client;
* Supabase session APIs;
* Supabase RLS-related client behavior;
* React APIs;
* React Router;
* Vite configuration;
* Vitest;
* Playwright;
* Temporal/polyfill behavior;
* project dependencies whose current API matters.

Prefer current official documentation over remembered implementation patterns.

## Do not use Context7 unnecessarily

Do not use Context7 when the question can be answered reliably from:

* repository code;
* existing project configuration;
* project tests;
* existing project documentation.

Use the cheapest reliable source first.

Recommended sequence:

```text
repository
→ existing tests/config
→ Context7 / current official docs
→ implementation
```

When repository behavior differs from current documentation, surface the difference.

Do not silently rewrite working code merely because documentation shows a newer pattern.

---

# 8. Architecture Principles

Chronoflow should use the simplest architecture that satisfies the real requirements.

Prefer clear boundaries over architectural ceremony.

Conceptually preserve separation between:

```text
UI / React
    ↓
Application / domain behavior
    ↓
Persistence boundary
    ↓
Supabase / PostgreSQL
```

The repository's existing structure should normally be preserved.

Do not reorganize the project merely to match a generic architecture template.

## UI responsibilities

React components should primarily handle:

* rendering;
* user interaction;
* UI state;
* coordination of application behavior.

Avoid embedding persistence or authorization rules directly inside presentation components.

## Persistence responsibilities

Persistence behavior must be explicit.

Avoid:

* duplicated persistence logic;
* multiple implicit sources of truth;
* UI components directly knowing unnecessary database details;
* silent LocalStorage ↔ database conflicts.

## Abstraction rule

Do not create:

* repository patterns;
* factories;
* generic service layers;
* adapters;
* providers;
* wrappers;

merely because they may be useful later.

Create an abstraction when it provides concrete value such as:

* isolating an external dependency;
* establishing a meaningful responsibility boundary;
* improving testability;
* preventing meaningful duplication;
* reducing coupling;
* making architecture easier to reason about.

Readable direct code is preferable to speculative abstraction.

---

# 9. Authentication and Authorization

Always distinguish authentication from authorization.

Authentication answers:

> Who is the user?

Authorization answers:

> What is this user allowed to do?

A protected React route is useful for UX and application flow.

It is not the final authorization boundary for database data.

Frontend filtering must never be treated as security.

Example:

```text
UI hides another user's timer
```

does not imply:

```text
another user cannot query that timer
```

Authorization for user-owned data must be enforced at the appropriate backend/database boundary.

---

# 10. Data Ownership

Every persisted user-owned entity must have an explicit ownership model.

Before implementing a table or persistence operation, answer:

* Who owns this row?
* How is ownership represented?
* Who can create it?
* Who can read it?
* Who can update it?
* Who can delete it?
* Can ownership change?
* What happens if the client sends another user's ID?
* What happens for anonymous users?
* Which layer enforces each rule?

Prefer ownership derived from authenticated identity rather than trusting arbitrary client-supplied user IDs.

Prefer least privilege.

Do not design policies around assumptions that only hold in the normal frontend.

Assume the client can be manipulated.

---

# 11. Supabase and RLS Security

User-owned database data must be protected using PostgreSQL Row Level Security where applicable.

For every user-owned table, deliberately consider:

* SELECT;
* INSERT;
* UPDATE;
* DELETE.

Do not assume one working policy proves that authorization is correct.

## Critical invariant

User A must not be able to read, modify, or delete User B's protected data even if:

* the frontend is bypassed;
* network requests are modified;
* IDs are guessed;
* client-side filtering is removed.

Verify this boundary deliberately.

## Insert ownership

Do not allow users to create records owned by arbitrary other users.

Ownership validation for INSERT is part of authorization.

## Update ownership

Do not accidentally permit changing ownership through UPDATE unless there is an explicit product requirement.

## Secrets

Never expose privileged Supabase credentials in browser code.

Never commit:

* service-role credentials;
* privileged secret keys;
* database passwords;
* administrative credentials;
* private API keys.

Browser code may contain only credentials explicitly intended for public/client use.

Inspect environment handling before changing configuration.

---

# 12. LocalStorage → PostgreSQL Migration

Chronoflow currently has LocalStorage persistence.

Moving to PostgreSQL must not accidentally produce two authoritative state stores.

Before implementing persistence, make the behavior explicit.

Possible states include:

```text
anonymous user
→ browser-only state

authenticated user
→ server-persisted state
```

or another deliberately chosen model.

Do not invent the behavior implicitly while coding.

Determine:

* whether anonymous users keep LocalStorage;
* whether existing local timers migrate;
* when migration happens;
* what happens if migration fails;
* whether migrated local data is removed;
* how duplicates are avoided;
* what source becomes authoritative after authentication;
* how logout behaves.

Do not silently delete existing user data during development.

Do not create uncontrolled synchronization between LocalStorage and PostgreSQL.

One authoritative source of truth should exist for a given state.

---

# 13. Failure Handling

Do not implement only the successful path.

Important failure states should be deliberate.

Examples:

* Supabase unavailable;
* network failure;
* invalid credentials;
* missing session;
* expired session;
* unauthorized operation;
* failed database write;
* malformed persisted data;
* empty result;
* stale LocalStorage data;
* migration failure.

Do not silently swallow errors.

Do not expose raw sensitive backend/database errors directly to users.

Prefer:

```text
diagnostically useful developer information
+
safe actionable user-facing state
```

Loading, empty, error, and unauthorized states should be distinguishable where relevant.

---

# 14. Testing Strategy

Do not optimize for arbitrary coverage percentages.

Tests should protect behavior according to risk.

Choose test level deliberately:

```text
unit
→ isolated deterministic logic

integration
→ boundaries between important components/services

E2E
→ high-value browser-level user journeys
```

Avoid testing implementation details when observable behavior is more valuable.

## Current high-value verification

### Authentication

Verify appropriate cases such as:

* successful sign-up;
* successful sign-in;
* invalid credentials;
* session restoration;
* refresh behavior;
* logout;
* missing session;
* protected route behavior.

### Persistence

Verify:

* create;
* retrieve;
* update;
* delete;
* persistence after refresh;
* correct association with authenticated user;
* loading state;
* failure state;
* no accidental dual source of truth.

### Authorization

At minimum verify:

```text
User A can read User A data.
User A can modify User A data.
User A can delete User A data.

User B cannot read User A data.
User B cannot modify User A data.
User B cannot delete User A data.
```

Also verify unauthorized ownership manipulation where relevant.

A manually successful happy path is not sufficient for security-sensitive behavior.

---

# 15. Playwright MCP

Playwright MCP is available for interactive browser investigation and verification.

Use it when observing actual browser behavior provides useful evidence.

Appropriate uses include:

* verifying authentication flows;
* reproducing UI bugs;
* checking routing;
* verifying session restoration;
* verifying logout;
* testing protected-route behavior;
* exercising forms;
* inspecting loading/error states;
* checking responsive behavior;
* validating an implemented user flow;
* investigating runtime/browser differences.

Typical flow:

```text
implement
→ run application
→ inspect with Playwright MCP
→ reproduce / verify actual behavior
→ fix if necessary
→ rerun relevant automated checks
```

## Important distinction

Playwright MCP verification is not equivalent to repository-owned automated E2E coverage.

Use:

```text
Playwright MCP
→ exploratory testing
→ debugging
→ interactive verification
→ runtime inspection
```

Use a Playwright test suite when appropriate for:

```text
repeatable regression protection
→ committed test
→ local execution
→ future CI execution
```

Never claim:

> "This flow has E2E coverage."

merely because the flow succeeded once through Playwright MCP.

State instead:

> "The flow was interactively verified with Playwright MCP."

when that is the actual evidence.

---

# 16. Tool Selection

Tools should be selected because they solve the current problem.

Do not call tools merely because they are available.

Preferred decision model:

```text
Need to understand existing behavior?
→ inspect repository

Need to understand existing verification?
→ inspect tests/configuration

Need current library documentation?
→ Context7 MCP

Need actual browser behavior?
→ Playwright MCP

Need repeatable regression evidence?
→ automated tests

Need architecture/security challenge?
→ specialized review agent

Need implementation?
→ implementation/build agent
```

Prefer the cheapest reliable source.

Do not use MCP as architectural decoration.

Do not introduce MCP into Chronoflow's product architecture because MCP exists in the development environment.

Context7 and Playwright are development tools here.

They are not Chronoflow product requirements.

---

# 17. AI-Assisted Engineering Modes

Agent-assisted work should match the nature of the task.

## Learning-sensitive work

For concepts currently being deliberately learned, preserve active reasoning.

Examples:

* architecture;
* authentication;
* authorization;
* RLS;
* testing strategy;
* trust boundaries;
* security decisions.

When the developer has not yet made an important design decision:

1. surface the decision;
2. inspect or ask for the current reasoning when appropriate;
3. challenge incorrect assumptions;
4. explain the relevant concept;
5. then proceed once the design is understood.

Do not silently make every architecture decision when doing so removes the learning objective.

## Building work

Once the relevant concept and design are sufficiently understood:

* implement efficiently;
* automate repetitive work;
* modify multiple related files when needed;
* generate tests;
* refactor when justified.

Do not create artificial educational friction for routine implementation.

## Review work

Review should actively search for:

* bugs;
* regressions;
* missing cases;
* security weaknesses;
* bad assumptions;
* unnecessary complexity;
* unclear ownership;
* weak failure handling;
* maintainability issues;
* missing tests;
* discrepancies between documentation and behavior.

Review is not successful merely because it confirms the implementation.

---

# 18. AI-Generated Code

AI-generated code is a proposal.

It is not trusted because:

* it compiles;
* the agent says it works;
* the UI appears correct;
* one manual test passed.

The developer remains responsible for:

* architecture;
* correctness;
* authorization;
* security;
* business rules;
* test strategy;
* maintainability;
* final acceptance.

For important work, agent output should be reviewed and verified before it is considered complete.

---

# 19. Specialized OpenCode Agents

`AGENTS.md` defines common repository constraints.

Specialized agent files should define specialized behavior.

Do not reproduce their full prompts here.

Conceptual responsibilities may include:

```text
planning / architecture
→ scope
→ dependencies
→ design
→ risks
→ trade-offs

build / implementation
→ scoped repository changes
→ implementation
→ local verification

review
→ correctness
→ maintainability
→ regressions
→ architecture assumptions

security
→ authentication
→ authorization
→ RLS
→ secrets
→ trust boundaries
→ data exposure

testing
→ risk-based verification
→ test gaps
→ failure scenarios

documentation
→ durable documentation
→ architecture changes
→ setup
→ developer-facing instructions
```

Use specialized agents deliberately.

Do not invoke several agents simply because they exist.

An independent reviewer is especially valuable for:

* security-sensitive changes;
* authentication;
* authorization;
* RLS;
* migrations;
* significant refactors;
* important milestone completion.

Implementation and review should preferably be separate passes for high-risk work.

---

# 20. Change Discipline

Before modifying code:

1. understand the requested outcome;
2. inspect the relevant implementation;
3. inspect related tests;
4. identify constraints;
5. identify security implications;
6. determine the smallest coherent change;
7. determine what evidence will prove it works.

Avoid broad unrelated refactors during focused feature work.

Do not:

* rename unrelated files;
* reorganize unrelated directories;
* replace working libraries without justification;
* install dependencies without a concrete need;
* introduce abstraction layers speculatively;
* rewrite working code solely to match personal preference.

Prefer focused diffs.

---

# 21. Dependency Rule

Before installing a new dependency, determine:

* What concrete problem does it solve?
* Can the current stack already solve it?
* Is the package maintained?
* Does it introduce meaningful security or maintenance risk?
* Is the dependency justified by repeated complexity?

Do not install a package to avoid writing a trivial amount of straightforward code.

When library behavior or version compatibility matters, verify current documentation through Context7 or another official source.

---

# 22. TypeScript Quality

Preserve type safety.

Avoid unnecessary:

```ts
any
```

Prefer:

* explicit domain types when useful;
* narrow types;
* clear return types for important boundaries;
* deliberate nullable/optional handling.

Do not silence type errors merely to make the build pass.

Type assertions should have a defensible reason.

Avoid duplicating types representing the same domain concept without need.

---

# 23. React Quality

Prefer straightforward React patterns.

Avoid:

* unnecessary `useEffect`;
* duplicated derived state;
* hidden persistence side effects;
* unnecessary global state;
* large components containing unrelated responsibilities.

Preserve:

* accessibility;
* keyboard behavior;
* semantic controls;
* loading states;
* error states;
* responsive behavior.

When modifying a user-visible workflow, consider browser-level verification with Playwright MCP.

---

# 24. Time and Date Handling

Chronoflow is fundamentally a time-based product.

Treat date/time behavior as important domain logic.

Do not casually use string manipulation or browser-local assumptions where timezone behavior matters.

Preserve Temporal-based direction unless a concrete architectural reason requires otherwise.

When working on date/time logic, consider:

* timezone;
* locale;
* daylight-saving transitions;
* exact instant vs local wall-clock time;
* countdown target semantics;
* persisted representation;
* parsing;
* display.

Do not silently change time semantics while implementing unrelated features.

---

# 25. Git Workflow

For meaningful work, prefer:

```text
Issue / meaningful task
    ↓
feature/fix branch
    ↓
implementation
    ↓
tests
    ↓
self-review
    ↓
AI/specialized review where valuable
    ↓
Pull Request
    ↓
CI
    ↓
merge
```

Do not create Issues for trivial changes.

Good Issue scope generally represents:

* a user-visible capability;
* a meaningful engineering improvement;
* a security improvement;
* a quality improvement;
* roughly a coherent professional work unit.

## Agent Git safety

Respect the developer's existing Git state.

Do not automatically:

* create branches;
* commit;
* push;
* merge;
* rebase;
* amend;
* reset;
* delete branches;
* rewrite history;
* open/close Pull Requests;

unless explicitly requested or clearly required by the task.

Never discard unrelated local work.

Never use destructive Git operations casually.

---

# 26. Documentation

Documentation should describe actual behavior and meaningful decisions.

Do not document aspirational functionality as if it already exists.

Update documentation when changes affect:

* architecture;
* setup;
* environment variables;
* authentication;
* authorization;
* persistence;
* migration;
* security;
* testing;
* deployment;
* important workflows.

## ADR rule

Create an ADR only when a decision has meaningful alternatives or long-term consequences.

Examples that may justify an ADR:

* Supabase/PostgreSQL persistence;
* LocalStorage migration strategy;
* authenticated vs anonymous persistence behavior;
* server-controlled AI integration;
* major deployment strategy changes.

Do not create ADRs for routine implementation choices.

Public-facing technical documentation should use professional English.

---

# 27. Security Review Expectations

For security-sensitive changes, explicitly ask:

* What input is untrusted?
* What identity is being used?
* Who authorizes this operation?
* Can the client manipulate the relevant value?
* Is the rule enforced server/database-side?
* Could another user access this object?
* Are secrets exposed?
* Does an error leak sensitive data?
* Does failure leave data in an inconsistent state?
* Is least privilege being followed?

Do not equate authentication with authorization.

Do not equate hidden UI with protected data.

Do not equate TypeScript validation with security enforcement.

---

# 28. Verification Before Completion

A task is not complete merely because code was generated.

Before declaring meaningful work complete, determine what was actually verified.

Report:

## Changed

What behavior, architecture, or files changed?

## Verified

What checks were actually run?

Examples:

* type checking;
* linting;
* Vitest;
* build;
* integration tests;
* Playwright test suite;
* Playwright MCP interactive verification;
* direct authorization checks.

## Not Verified

What relevant behavior could not be checked?

## Security

Were any authorization/security boundaries affected?

How were they verified?

## Assumptions / Risks

What important assumptions remain?

## Documentation

Did the change require documentation updates?

## Follow-up

What remaining work is necessary for the active milestone?

Do not claim:

* a test passed when it was not executed;
* production was verified when only localhost was checked;
* browser compatibility was verified without checking it;
* RLS is secure because normal UI filtering worked;
* E2E coverage exists because Playwright MCP clicked through the flow.

Use precise evidence language.

---

# 29. Current Week 1 Acceptance Standard

Week 1 should eventually provide inspectable evidence for:

* GitHub Issue(s);
* meaningful commits / PR;
* Supabase configuration;
* authentication/session behavior;
* PostgreSQL persistence;
* explicit LocalStorage strategy;
* RLS enforcement;
* cross-user authorization verification;
* appropriate automated tests;
* architecture documentation;
* secure environment handling;
* observable integrated behavior;
* independent developer explanation.

A strong demonstration should show:

```text
signup
→ login
→ create timer
→ refresh
→ timer persists
→ logout
→ login as another user
→ original timer remains inaccessible
```

The desired conclusion is not:

> "The AI agent integrated Supabase."

The desired conclusion is:

> "Chronoflow has an explicit ownership model, authentication works, persistence is reliable, PostgreSQL enforces authorization, important failure cases were verified, and the implementation can be explained and defended."

---

# 30. Evidence Standard

Do not promote a capability because:

* a tutorial was followed;
* AI generated the implementation;
* the application worked once;
* a feature passed only its happy path;
* many hours were spent.

Evidence should be appropriate to the risk.

Strong evidence can include:

* observable acceptance criteria;
* relevant automated tests;
* authorization tests;
* failure-case verification;
* Pull Request;
* CI;
* architecture decision;
* deployed behavior;
* concise technical explanation;
* reproducible commands.

The objective is Shipped Capability:

```text
understood
+
implemented
+
verified
+
reviewed
+
explainable
+
inspectable
```

---

# 31. Scope Completion Rule

Before adding additional work, ask:

1. Does it improve the current milestone?
2. Does it fix a real defect or risk?
3. Is it necessary for security?
4. Is it necessary for verification?
5. Is it required to make the current implementation maintainable?
6. Does it produce meaningful professional evidence?

If not, defer it.

Do not use cleanup or tooling exploration to avoid shipping the primary capability.

---

# 32. Simplicity Rule

Before proposing:

* an agent;
* MCP integration;
* new service;
* state library;
* framework;
* abstraction;
* background worker;
* additional database;
* orchestration framework;

ask whether ordinary application code already solves the problem clearly.

Prefer:

```text
simple deterministic application logic
```

over:

```text
additional technology without a concrete requirement
```

Use sophisticated tools only when their added complexity solves an actual problem.

---

# 33. Final Engineering Principles

Optimize for:

```text
understand
→ design
→ implement
→ verify
→ review
→ explain
→ produce evidence
```

Prefer:

* repository truth over assumptions;
* current documentation over remembered APIs;
* Context7 when current library knowledge matters;
* Playwright MCP when real browser behavior must be observed;
* automated tests when repeatable regression protection is required;
* database authorization over frontend trust;
* focused changes over broad refactors;
* explicit state ownership over hidden synchronization;
* simple architecture over speculative abstraction;
* professional evidence over tool activity;
* shipped capability over feature count.

The agent's job is not merely to produce code.

The agent's job is to help produce Chronoflow changes that are correct, secure, maintainable, verifiable, and understandable.