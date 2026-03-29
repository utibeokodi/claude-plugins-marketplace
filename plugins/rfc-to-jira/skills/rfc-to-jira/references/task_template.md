Each task MUST be detailed enough for Claude to implement it autonomously. Use this structure:

````markdown
## Objective

[1-2 sentences: what this task delivers and why it matters]

## User Story

As a [persona], I want [action] so that [benefit].

## Context

**RFC:** [path to the RFC file]
**PRD:** [path to the companion PRD file]
**Module:** [e.g., `packages/shared/src/saas/multi-tenancy/`]
**Reference docs to read before starting:**
- `CLAUDE.md` (root) — project conventions, dev commands, technology stack
- `.specs/CONSTITUTION.md` — inviolable rules, forbidden patterns
- `.specs/stack.md` — engineering standards, error handling patterns, testing strategy
- `.specs/structure.md` — where files go, naming conventions
- [RFC file path] — full service specification

**Pattern to follow:** [Link to an existing file in the codebase that demonstrates the pattern this task should follow, e.g., "Follow the pattern in `web/src/features/public-api/server/RateLimitService.ts`" or "Follow the tRPC router pattern in `web/src/server/api/routers/traces.ts`"]

**Langfuse Baseline (DO NOT re-implement):**
- [List specific Langfuse functionality this task must use, not rebuild]
- [e.g., "Use Langfuse's existing `protectedOrganizationProcedure` — do not create a new auth middleware"]

**Key Invariants (from RFC — non-negotiable):**
- [List the specific invariants from the RFC that apply to this task]
- [e.g., "ALL PostgreSQL queries MUST include WHERE org_id in the where clause"]
- [e.g., "Never accept org_id from user input — derive from JWT or API key"]
- [Preserve verbatim any code snippets, Lua scripts, or SQL from the RFC invariants]

**Out of scope (do NOT implement in this task):**
- [Explicit list of adjacent work handled by other tickets]
- [e.g., "tRPC endpoint for this method is in task OBS-15, not here"]

**Dependencies:**
- Blocked by: [ticket key(s) or "none"]
- Blocks: [ticket key(s) or "none"]

## Implementation Steps

### 1. Create feature branch

```bash
git checkout -b feat/[ticket-key]-[short-description] main
```

### 2. Write failing tests first (TDD — mandatory per CONSTITUTION)

**Test file location:** [exact path, e.g., `web/src/__tests__/multi-tenancy.test.ts`]
**Test runner:** [Jest for web/ tests, Vitest for worker/ tests]

Write tests that cover:
- [Specific test case 1 — happy path, in Given/When/Then format]
- [Specific test case 2 — error case from RFC § Error Handling, in Given/When/Then format]
- [Specific test case 3 — tenant isolation / security, in Given/When/Then format]
- [Any service-specific tests from RFC § Service-Specific Testing]
- [PRD EARS criteria mapped to this task, converted to Given/When/Then]

**Example test cases (Given/When/Then):**
```
Given an authenticated user with orgId "org-1"
When they call createOrg("My Org", "user-1")
Then a new organization is created with status "active" and the user is set as OWNER

Given an authenticated user with orgId "org-1"
When they call getOrg("org-2") (a different org)
Then an OrgNotFoundError is returned (tenant isolation enforced)
```

```bash
# Run tests to confirm they fail
pnpm test --testPathPatterns="[test-file-pattern]"
```

### 3. Implement the solution

**Files to create/modify:**
- [Exact file path 1] — [what to add/change]
- [Exact file path 2] — [what to add/change]

**CAUTION — Existing Langfuse file modification:**
[If this task modifies one of the ~6 permitted existing Langfuse files, flag it explicitly:]
- This task modifies `[file path]`, which is an existing Langfuse file
- Record this modification in the rebase checklist for future upstream merges
- Make the smallest possible change to minimize rebase conflicts

**Implementation details:**
[Specific instructions derived from the RFC sections: Data Model for schema, Public Interface for function signatures, Key Data Flows for logic, Error Handling for error cases]

**Code patterns to follow:**
- [e.g., "Use Prisma typed client methods, not $queryRaw"]
- [e.g., "Import Zod from 'zod/v4' for input validation"]
- [e.g., "Follow error format from stack.md: { error, error_description, statusCode }"]
- [e.g., "Add JSDoc/TSDoc comments to all public functions"]

### 4. Run tests and fix until green

```bash
# Run the specific tests
pnpm test --testPathPatterns="[test-file-pattern]"

# Run full typecheck
pnpm tc

# Run linter/formatter
pnpm run format
```

If tests fail, analyze the error output, fix the implementation, and re-run. Repeat until all tests pass.

### 5. Manual validation

Start the application locally and verify the implementation works end-to-end:

```bash
# Start infrastructure (if not already running)
pnpm run infra:dev:up

# Start the web application
pnpm run dev:web
```

**Manual validation steps:**
- [ ] [Step 1: e.g., "Log in at localhost:3000 with demo@langfuse.com / password"]
- [ ] [Step 2: e.g., "Navigate to the project and verify the new setting appears"]
- [ ] [Step 3: e.g., "Use curl/httpie to hit the endpoint and verify the response"]
- [ ] [Step 4: e.g., "Check the database to confirm the data was written correctly"]

[For internal-only modules with no HTTP/tRPC endpoints, replace browser steps with programmatic validation:]
- [ ] [e.g., "Run a test script that calls the service method directly"]
- [ ] [e.g., "Check CloudWatch metrics via `aws cloudwatch get-metric-data`"]
- [ ] [e.g., "Verify Redis state via `redis-cli GET plan:{orgId}`"]

```bash
# Example validation commands
# Check database state
psql $DATABASE_URL -c "SELECT * FROM organizations WHERE id = '...' LIMIT 5;"

# Hit an API endpoint
curl -s http://localhost:3000/api/... | jq .
```

### 6. Final checks before PR

```bash
# Full typecheck
pnpm tc

# Format code
pnpm run format

# Run ALL tests (not just the ones you wrote)
pnpm test

# Verify the build succeeds
pnpm build:check
```

## Acceptance Criteria

**Functional (from RFC + PRD):**
- [ ] [Given/When/Then criterion 1 from PRD EARS mapping]
- [ ] [Given/When/Then criterion 2 from PRD EARS mapping]
- [ ] [Given/When/Then criterion 3 — at least one negative/error path]
- [ ] [Any task-specific acceptance criteria from the RFC]

**Cross-cutting checklist (every code task):**
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests passing
- [ ] Typecheck passes (`pnpm tc`)
- [ ] Lint/format passes (`pnpm run format`)
- [ ] Manual validation steps completed successfully
- [ ] No `any` types used
- [ ] No imports from `web/src/ee/` or `worker/src/ee/`
- [ ] All queries include tenant-scoping (org_id or project_id in WHERE clause)
- [ ] No secrets hardcoded
- [ ] JSDoc/TSDoc on all public functions
- [ ] Error responses follow stack.md format: `{ error, error_description, statusCode }`
- [ ] Structured logging used (no `console.log`)

## Definition of Done

This task is complete when:
1. All acceptance criteria are checked off
2. A PR is created with the changes
3. PR follows the template in `.github/PULL_REQUEST_TEMPLATE.md`
````
