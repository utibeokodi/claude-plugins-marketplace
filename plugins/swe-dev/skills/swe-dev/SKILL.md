---
name: swe-dev
description: This skill should be used when implementing JIRA tickets autonomously. Triggers on requests like "implement this ticket", "implement this epic", "/swe-dev OBS-3", "/swe-dev OBS-1 (epic)", or when users want to take JIRA tickets and turn them into implemented code with tests, validation, and PRs. Supports single tickets, multiple tickets, or full epics with parallel execution via git worktrees.
---

# SWE Dev: Autonomous Implementation from JIRA Tickets

Takes JIRA tickets and implements them end-to-end: fetches ticket details, writes tests first (TDD), implements the solution, runs tests, validates locally, and creates a PR. Supports single tickets, multiple tickets, or full epics with parallel execution via git worktrees.

## Overview

This skill operates in three modes:

1. **Single ticket**: Implement one JIRA ticket in the current working tree
2. **Multiple tickets**: Implement several tickets, parallelizing independent ones via git worktrees
3. **Full epic**: Fetch all tickets from an epic, build a dependency graph, and implement them in waves

Each ticket produces one PR into `main`. Parallel execution uses git worktrees so each agent has an isolated copy of the repo.

## When to Use

Invoke this skill when:
- User requests: "implement OBS-3"
- User says: "implement all tickets in the multi-tenancy epic"
- User provides: "/swe-dev OBS-3" or "/swe-dev OBS-1" (an epic key)
- User wants to: "pick up these JIRA tickets and implement them"
- User needs: autonomous, end-to-end implementation from JIRA ticket to PR

## Prerequisites

- Atlassian MCP server connected (to fetch ticket details)
- Git repository with `main` branch
- Development environment set up (`pnpm i`, `.env` configured, infrastructure running)
- For parallel mode: git worktree support (standard git feature)

## Core Principle: Plan Everything, Execute Nothing Without Approval

Every action that changes code, creates a branch, or makes a PR must be preceded by a plan that the user approves. This applies to:
- Implementation plans (Step 3)
- Feature branch creation
- PR creation

The only actions that happen without explicit approval are read-only operations (fetching tickets, reading files, exploring the codebase). This "plan first, execute second" principle ensures the user always knows what will happen before it happens.

## Workflow

### Step 1: Fetch and Analyze Tickets

#### Single Ticket Mode

```
/swe-dev OBS-3
```

Fetch the ticket:

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "OBS-3",
  contentFormat: "markdown"
)
```

Proceed directly to Step 3 (Planning) in the current working tree.

#### Multiple Tickets Mode

```
/swe-dev OBS-3, OBS-4, OBS-5, OBS-6, OBS-7
```

Fetch all tickets and their blocking links, then proceed to Step 2 (Dependency Analysis).

#### Epic Mode

```
/swe-dev OBS-1 (epic)
```

Fetch the epic and all its child tickets:

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "OBS-1",
  contentFormat: "markdown"
)

mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql(
  cloudId: "<cloud-id>",
  jql: "\"Epic Link\" = OBS-1 ORDER BY rank ASC",
  contentFormat: "markdown"
)
```

For each child ticket, also fetch its issue links to build the dependency graph:

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "<child-key>",
  contentFormat: "markdown"
)
```

Then proceed to Step 2 (Dependency Analysis).

### Step 2: Build Dependency Graph and Plan Waves

#### 2a. Build the graph

From the fetched tickets, extract:
- **Blocking links**: "blocks" / "is blocked by" relationships
- **Ticket type**: Skip External Setup tasks (require human action). Delegate Terraform/infrastructure tasks to the `infra-dev` plugin.
- **Status**: Skip tickets already in "Done" status

Build a directed acyclic graph (DAG) where edges represent "blocked by" relationships.

#### 2b. Topological sort into waves

Group tickets into waves using topological sort:

```
Wave 1: All tickets with no blockers (in-degree = 0)
Wave 2: Tickets whose blockers are all in Wave 1
Wave 3: Tickets whose blockers are all in Wave 1 or 2
... and so on
```

Example:
```
Wave 1 (parallel):  [OBS-3 schema] [OBS-6 ClickHouse] [OBS-7 env vars]
Wave 2 (parallel):  [OBS-4 createOrg] [OBS-5 getOrg]
Wave 3 (parallel):  [OBS-8 integration tests]
```

#### Branching Strategy for Dependent Waves

Wave N+1 tickets MUST wait for their blocker tickets in Wave N to finish implementation. Once the blocker's implementation is complete (PR created, tests passing), Wave N+1 agents branch directly from the blocker's feature branch:

```
main
  └── feat/OBS-3-schema-migration  (Wave 1, implementation complete, PR created)
        └── feat/OBS-4-create-org  (Wave 2, branches from OBS-3's completed branch)
              └── feat/OBS-8-integration-tests  (Wave 3, branches from OBS-4's completed branch)
```

This means:
- Wave N+1 does NOT wait for Wave N PRs to be merged into `main`
- Wave N+1 branches from the blocker's feature branch as soon as it's complete
- The PR for Wave N+1 targets `main` (not the blocker branch)
- When all PRs are merged in order, the chain resolves cleanly

**Key rules**:
- Implementation must be complete before dependents branch
- Planning for Wave N+1 happens AFTER Wave N implementation completes, not in parallel. This ensures plans are based on the actual implemented code, not assumptions about how it will look. If a Wave N implementation deviates from its plan (e.g., different file structure, different function signatures), Wave N+1 plans need to account for the real code.

#### 2c. Present the wave structure to the user

Show the wave breakdown before proceeding to planning:

```markdown
## Wave Structure

### Wave 1 (parallel - 3 tickets)
| Ticket | Summary | Blocked By |
|--------|---------|------------|
| OBS-3 | Add SaaS columns via Prisma migration | — |
| OBS-6 | Add org_id to ClickHouse tables | — |
| OBS-7 | Add env var validation | — |

### Wave 2 (parallel - 2 tickets, after Wave 1)
| Ticket | Summary | Blocked By |
|--------|---------|------------|
| OBS-4 | Implement createOrg() | OBS-3 |
| OBS-5 | Implement getOrg() | OBS-3 |

### Skipped
| Ticket | Reason |
|--------|--------|
| OBS-2 | External Setup task (requires human action) |

### Delegated to infra-dev
| Ticket | Summary |
|--------|---------|
| OBS-9 | Provision CloudWatch alarms via Terraform |
```

Proceed to Step 3 (Planning).

### Step 3: Plan Before Implementing (Two-Phase Execution)

Every ticket goes through a **Plan phase** before implementation. The user reviews and approves plans before any code is written. This applies to both single-ticket and multi-ticket modes.

The two phases are:
1. **Plan phase**: Read the ticket, read the RFC/PRD, analyze the codebase, produce a detailed implementation plan
2. **Execute phase**: Implement the approved plan (TDD loop, validation, PR)

This separation exists because:
- Plans are fast to produce and review (minutes, not hours)
- Catching a wrong approach in a plan is cheap; catching it after implementation is expensive
- In parallel mode, all plans for a wave can be reviewed as a batch before any agent starts coding

#### 3a. Single Ticket Planning

For a single ticket, produce the plan directly in the conversation:

```
1. Read the ticket description thoroughly
2. Read the referenced docs (RFC, CLAUDE.md, CONSTITUTION.md, stack.md, structure.md)
3. Read the pattern-to-follow file referenced in the ticket
4. Explore the relevant parts of the codebase (existing files, adjacent modules, Prisma schema)
5. Identify any ambiguities, unknowns, or assumptions
6. If ANYTHING is unclear, ask the user clarifying questions BEFORE producing the plan.
   Never assume. Examples of things to ask about:
   - "The ticket says to follow the pattern in RateLimitService.ts, but that file uses
     a different error format than stack.md specifies. Which should I follow?"
   - "The RFC says 'use Prisma typed client' but this query requires a window function.
     Should I use $queryRaw with a justification comment, or restructure the query?"
   - "The ticket references a Redis key pattern but doesn't specify the TTL. Should I
     use the same TTL as the billing period, or a fixed duration?"
7. After clarifications are resolved, produce an implementation plan (see Plan Template below)
8. Present the plan and wait for user approval
9. On approval, proceed to Step 4 (Execute)
10. On rejection, revise the plan based on user feedback and re-present
```

#### 3b. Multi-Ticket / Epic Planning (Parallel)

For multiple tickets, plan all tickets in the current wave simultaneously. Planning agents use `isolation: "worktree"` so any accidental writes are safely discarded:

```
FOR each wave:
  FOR each ticket in wave (parallel):
    Agent(
      prompt: <planning prompt — see Planning Agent Prompt below>,
      isolation: "worktree",
      run_in_background: true
    )
  WAIT for all planning agents to complete
  COLLECT all plans and all clarifying questions
  IF any planning agent has clarifying questions:
    PRESENT all questions grouped by ticket
    WAIT for user answers
    RE-RUN planning for those tickets with the answers included in the prompt
  PRESENT plans as a batch for user review (see Batch Plan Review below)
  WAIT for user approval (approve all, approve some, reject with feedback)
  FOR each rejected plan:
    Revise based on user feedback
    Re-present for approval
  PROCEED to Step 4 with approved plans only
```

#### Plan Template

Each plan should include:

```markdown
## Plan: <TICKET-KEY> — <ticket summary>

### Approach
[2-3 sentences: the high-level strategy for implementing this ticket]

### Files to Create
| File | Purpose |
|------|---------|
| [exact path] | [what it contains] |

### Files to Modify
| File | Change | Langfuse File? |
|------|--------|----------------|
| [exact path] | [what changes] | Yes/No |

### Test Strategy
| Test Case | Type | Given/When/Then |
|-----------|------|-----------------|
| [name] | Unit | Given X, When Y, Then Z |
| [name] | Integration | Given X, When Y, Then Z |
| [name] | Negative path | Given X, When Y, Then error Z |

### Key Decisions
- [Decision 1: e.g., "Using Prisma typed client for all queries, no $queryRaw"]
- [Decision 2: e.g., "Reusing Langfuse's existing protectedOrganizationProcedure, not creating new middleware"]

### Clarifying Questions (if any)
[Questions that MUST be answered by the user before implementation. Never assume.]
- [e.g., "The RFC specifies a 300-second TTL for the Redis key, but the PRD says 'short-lived'. Should I use 300 seconds or a different value?"]
- [e.g., "The ticket says to modify auth.ts, but there are two files matching that pattern. Which one: web/src/server/auth.ts or packages/shared/src/server/auth.ts?"]

If there are no clarifying questions, write: "None — ticket and RFC are unambiguous."

### Risks / Open Questions
- [Risks that don't block implementation but should be noted]
- [Any deviation from the ticket's suggested approach, with rationale]

### Estimated Complexity
[S / M / L — based on number of files, test cases, and integration points]
```

#### Batch Plan Review (Multi-Ticket Mode)

Each plan in the batch uses the **same full Plan Template** as single-ticket mode. Multi-ticket plans are NOT abbreviated. The user needs the same level of detail to make informed approval decisions regardless of how many tickets are being planned.

Present all plans for a wave together, separated by horizontal rules for readability:

```markdown
## Wave 1 Plans (3 tickets)

Use the navigation below to jump to each plan, or review sequentially.

| # | Ticket | Summary | Complexity |
|---|--------|---------|------------|
| 1 | OBS-3 | Add SaaS columns via Prisma migration | S |
| 2 | OBS-6 | Add org_id to ClickHouse tables | S |
| 3 | OBS-7 | Add env var validation | S |

---

## Plan 1/3: OBS-3 — Add SaaS columns via Prisma migration

### Approach
Create a Prisma migration adding slug (TEXT UNIQUE), status (TEXT DEFAULT 'active'),
and settings (JSONB DEFAULT '{}') to the organizations table. Update schema.prisma,
run db:generate to regenerate the Prisma client.

### Files to Create
| File | Purpose |
|------|---------|
| packages/shared/prisma/migrations/YYYYMMDD_add_saas_columns/migration.sql | Prisma migration |

### Files to Modify
| File | Change | Langfuse File? |
|------|--------|----------------|
| packages/shared/prisma/schema.prisma | Add slug, status, settings fields to Organization model | Yes |

### Test Strategy
| Test Case | Type | Given/When/Then |
|-----------|------|-----------------|
| Columns exist | Unit | Given a fresh migration, When I query the organizations table, Then slug/status/settings columns exist |
| Defaults correct | Unit | Given a new organization, When created without explicit values, Then status='active' and settings='{}' |
| Slug unique | Unit | Given org with slug 'acme', When creating another org with slug 'acme', Then P2002 unique constraint error |

### Key Decisions
- Using Prisma migration (not raw SQL) since this is a PostgreSQL schema change
- Adding slug now even though subdomain routing is post-MVP (avoids a future migration)

### Risks / Open Questions
- None identified

### Estimated Complexity
S

---

## Plan 2/3: OBS-6 — Add org_id to ClickHouse tables
[Full Plan Template...]

---

## Plan 3/3: OBS-7 — Add env var validation
[Full Plan Template...]

---

## Approval

Review each plan above. You can:
- **Approve all**: "looks good, proceed"
- **Approve some**: "OBS-3 and OBS-7 look good. For OBS-6, use a different migration approach..."
- **Reject all**: "rethink the approach for all of these because..."
- **Ask questions**: "For OBS-3, why are we adding slug now if subdomain routing is post-MVP?"
```

Only approved plans proceed to Step 4.

#### Planning Agent Prompt

When spawning a planning agent for parallel plan generation, use `isolation: "worktree"` so any accidental writes are safely discarded:

```
Agent(
  prompt: <planning prompt below>,
  isolation: "worktree",
  run_in_background: true
)
```

Planning prompt:

```
You are creating an implementation plan for JIRA ticket <TICKET-KEY>.
DO NOT write any code, create files, or modify anything. Only produce a plan.

## Ticket Details
<paste full ticket description from JIRA>

## Instructions

1. Read the reference docs listed in the ticket's Context section:
   - The RFC file
   - CLAUDE.md for project conventions
   - .specs/CONSTITUTION.md for inviolable rules
   - .specs/stack.md for engineering standards
   - The pattern-to-follow file referenced in the ticket
2. Explore the relevant parts of the codebase:
   - Look at adjacent modules for patterns to follow
   - Check the Prisma schema for existing models
   - Read any files the ticket says to modify
3. Identify any ambiguities, unknowns, or assumptions. If ANYTHING is
   unclear, include it in a "Clarifying Questions" section. Never assume.
   The user will answer these questions before the plan is finalized.
4. Produce a DETAILED plan following this structure:
   - Approach (2-3 sentences)
   - Files to create (exact paths, with purpose for each)
   - Files to modify (exact paths, what changes, whether it's a Langfuse file)
   - Test strategy (specific test cases in Given/When/Then format)
   - Key decisions (patterns chosen, what's reused vs. new, with rationale)
   - Clarifying questions (anything unclear — NEVER assume)
   - Risks / open questions (ambiguities, deviations from ticket)
   - Estimated complexity (S/M/L)
5. DO NOT abbreviate the plan. Include the same level of detail regardless
   of whether this is for a single ticket or part of a batch.
6. Return the plan as markdown
```

### Step 4: Execute Approved Plans

After plans are approved, proceed with implementation.

#### Single Ticket Execution (current working tree)

1. **Create feature branch**:
   ```bash
   git checkout -b feat/<ticket-key>-<short-description> main
   ```

2. **Execute the TDD loop** using the approved plan (see Implementation Loop below)

3. **Create PR** (see PR Creation below)

#### Multiple Tickets / Epic Execution (parallel via worktrees)

Execute waves sequentially, tickets within each wave in parallel. Merge conflict resolution within a wave is the user's responsibility during PR review and merging.

```
FOR each wave:
  # Plans for this wave were already approved in Step 3
  FOR each approved ticket in wave (parallel):
    Agent(
      prompt: <full implementation prompt with approved plan — see Agent Prompt Template>,
      isolation: "worktree",
      run_in_background: true
    )
  WAIT for all agents in wave to complete
  FOR each completed agent:
    IF agent created a PR successfully:
      Record PR URL
      Transition JIRA ticket to "In Review"
    ELSE:
      Record failure, report to user
  REPORT wave results to user
  # Merge conflicts between PRs in the same wave are resolved by the user
  # during PR review and merging — swe-dev does NOT auto-resolve conflicts
  # Before starting next wave:
  IF next wave has tickets blocked by this wave:
    PRESENT branching strategy options for next wave:
      Option A: Merge blocking PRs into main first, then Wave N+1 branches from main
                (cleanest history, PRs target main with no rebase needed later)
      Option B: Wave N+1 branches from blocker's completed feature branch
                (faster, no waiting for merge, but PRs may need rebase after blockers merge)
      Option C: Merge some blocking PRs, branch from others
                (hybrid — user picks per-ticket)
    FOR each ticket in next wave, show:
      - Which blocker it depends on
      - The blocker's branch name and PR number
      - Recommended branching option (A or B) with rationale
    WAIT for user to choose branching strategy
    PRESENT full branching plan based on user's choice
    WAIT for user approval of branching plan
  # Plan next wave AFTER this wave's implementation is complete
  # so plans are based on real code, not assumptions
  RUN Step 3b for next wave's tickets (planning agents read from completed branches)
  WAIT for plan approval
  CONTINUE to next wave execution
```

**Important**: Wave N+1 follows this sequence:
1. Wave N's blocking tickets must finish implementation (PR created, tests passing)
2. Present a **branching plan** for Wave N+1 (which branch each ticket will branch from) and wait for user approval
3. Plan Wave N+1's tickets (planning agents read from the actual completed code, not assumptions)
4. User approves Wave N+1 implementation plans
5. Execute Wave N+1

```
Wave 1 complete. 3 PRs created:
- PR #12: OBS-3 (schema migration) — feat/OBS-3-schema-migration
- PR #13: OBS-6 (ClickHouse migration) — feat/OBS-6-clickhouse-migration
- PR #14: OBS-7 (env validation) — feat/OBS-7-env-validation

## Branching Strategy for Wave 2

Wave 2 tickets (OBS-4, OBS-5) are blocked by OBS-3.
OBS-3 implementation is complete (PR #12, all tests passing).

### Option A: Merge first, branch from main
Merge PR #12 into main, then both Wave 2 tickets branch from main.
- Pro: Clean history, PRs target main directly, no rebase needed
- Con: Requires merging now (you may want to review PR #12 first)
- Recommended when: you've already reviewed the blocking PR

| Ticket | Blocked By | Branch From | PR Target |
|--------|-----------|-------------|-----------|
| OBS-4 | OBS-3 | main (after PR #12 merged) | main |
| OBS-5 | OBS-3 | main (after PR #12 merged) | main |

### Option B: Branch from feature branch
Wave 2 branches from feat/OBS-3-schema-migration without waiting for merge.
- Pro: Faster, no waiting for merge/review
- Con: Wave 2 PRs may need rebase after PR #12 is eventually merged
- Recommended when: dependency chain is deep and you want speed

| Ticket | Blocked By | Branch From | PR Target |
|--------|-----------|-------------|-----------|
| OBS-4 | OBS-3 | feat/OBS-3-schema-migration | main |
| OBS-5 | OBS-3 | feat/OBS-3-schema-migration | main |

### Option C: Hybrid (pick per ticket)
Choose Option A or B individually for each ticket.

Which option do you prefer? (A / B / C)

[After user chooses]

Planning Wave 2 tickets...
[Shows full detailed Wave 2 plans for approval]
```

### Implementation Loop (Core of Each Agent)

This is the TDD loop that each agent (or the single-ticket path) follows. The ticket description contains all the details; this loop is the execution pattern:

#### Phase 1: Write Failing Tests

```
1. Read ticket's "Write failing tests first" section
2. Create test file at the specified location
3. Write test cases covering:
   - Happy path (from Given/When/Then acceptance criteria)
   - Error/negative path (at least one per ticket)
   - Tenant isolation (if ticket involves data access)
   - PRD EARS criteria mapped in the ticket
4. Run tests to confirm they FAIL:
   - Web tests: pnpm test --testPathPatterns="<pattern>"
   - Worker tests: pnpm run test --filter=worker -- <file> -t "<name>"
5. If tests pass (shouldn't), investigate — the feature shouldn't exist yet
```

#### Phase 2: Implement

```
1. Read ticket's "Implement the solution" section
2. Create/modify files listed in the ticket
3. Follow the code patterns specified:
   - Prisma typed client (not $queryRaw)
   - Zod v4 for validation (import from 'zod/v4')
   - Error format from stack.md
   - JSDoc/TSDoc on public functions
   - No any types, no console.log, no EE imports
4. If ticket flags a Langfuse file modification:
   - Make the smallest possible change
   - Note it for the PR description
```

#### Phase 3: Run Tests and Fix

```
LOOP:
  1. Run the specific test suite
  2. Run typecheck: pnpm tc
  3. Run formatter: pnpm run format
  4. IF all pass → proceed to Phase 4
  5. IF failures:
     a. Analyze error output
     b. Fix the implementation (not the tests, unless the test itself has a bug)
     c. CONTINUE loop
  6. IF stuck after 3 iterations on the same error:
     a. Re-read the RFC section referenced in the ticket
     b. Check if a Key Invariant or Langfuse Baseline item was missed
     c. If still stuck, report the error to the user and pause
```

#### Phase 4: Local Validation

**Delegate all manual verification to the `manual-verify` plugin.**

The `swe-dev` skill does NOT perform manual validation itself. After tests pass, it invokes the `manual-verify` plugin with the ticket's validation steps:

```
1. Read ticket's "Manual validation" section
2. Invoke the manual-verify plugin, passing:
   - The ticket key
   - The list of manual validation steps from the ticket description
   - The task type (UI-facing, internal service, BullMQ job)
   - The relevant dev commands (pnpm run dev:web, pnpm run dev:worker, etc.)
3. Wait for manual-verify to complete and return results
4. If manual-verify reports failures:
   a. Analyze the failure
   b. Fix the implementation
   c. Re-run tests (Phase 3)
   d. Re-invoke manual-verify
5. Record validation results
```

If the `manual-verify` plugin is not installed, skip manual validation and note it in the PR description: "Manual verification skipped — manual-verify plugin not available."

#### Phase 5: Final Checks

```bash
# Full typecheck across all packages
pnpm tc

# Format entire project
pnpm run format

# Run ALL tests (not just the ones for this ticket)
pnpm test

# Verify the build succeeds
pnpm build:check
```

If any step fails, fix and re-run before proceeding to PR creation.

### PR Creation

After all checks pass, create a PR:

1. **Read the PR template**:
   ```
   Read(file_path=".github/PULL_REQUEST_TEMPLATE.md")
   ```

2. **Push the branch**:
   ```bash
   git push -u origin feat/<ticket-key>-<short-description>
   ```

3. **Create the PR**:
   ```bash
   gh pr create --title "<ticket-key>: <ticket summary>" --body "$(cat <<'EOF'
   <PR body following the template, including:>
   - Summary (from ticket objective)
   - Type of change
   - EE license check (no imports from /ee/)
   - Checklist (tests, typecheck, lint, manual validation)
   - Test plan (from ticket acceptance criteria)
   - JIRA ticket link
   EOF
   )"
   ```

4. **Transition the JIRA ticket** to "In Review":
   ```
   mcp__claude_ai_Atlassian__getTransitionsForJiraIssue(
     cloudId: "<cloud-id>",
     issueIdOrKey: "<ticket-key>"
   )
   mcp__claude_ai_Atlassian__transitionJiraIssue(
     cloudId: "<cloud-id>",
     issueIdOrKey: "<ticket-key>",
     transition: { id: "<in-review-transition-id>" }
   )
   ```

### Step 5: Report Results

After all waves complete, output a summary:

```markdown
## Implementation Summary

### Completed
| Ticket | Summary | PR | Tests | Validation |
|--------|---------|-----|-------|------------|
| OBS-3 | Add SaaS columns via Prisma migration | #12 | 4/4 passing | DB verified |
| OBS-6 | Add org_id to ClickHouse tables | #13 | 3/3 passing | CH verified |
| OBS-7 | Add env var validation | #14 | 2/2 passing | Startup verified |
| OBS-4 | Implement createOrg() | #15 | 6/6 passing | API verified |
| OBS-5 | Implement getOrg() | #16 | 5/5 passing | API verified |

### Skipped
| Ticket | Reason |
|--------|--------|
| OBS-2 | External Setup task |

### Failed
| Ticket | Error | Action Needed |
|--------|-------|---------------|
| (none) | | |

### Potential Merge Conflicts
| PR | May Conflict With | Shared File |
|----|-------------------|-------------|
| #16 (OBS-5) | #15 (OBS-4) | packages/shared/src/saas/multi-tenancy/index.ts |

*Merge one PR first, then rebase the other. Conflict resolution is your call.*
```

---

## Agent Prompt Template

When spawning a worktree agent for parallel execution, use this prompt structure. The approved plan is included so the agent follows the agreed-upon approach:

```
You are implementing JIRA ticket <TICKET-KEY>.

## Ticket Details
<paste full ticket description from JIRA>

## Approved Implementation Plan
<paste the plan that was approved by the user in Step 3>

IMPORTANT: Follow this approved plan exactly. Do not deviate from the agreed-upon
approach, file paths, or test strategy unless you encounter a technical blocker.
If you must deviate, document the reason in the PR description.

## Instructions

1. Create a feature branch: feat/<ticket-key>-<short-description>
2. Read the reference docs listed in the ticket's Context section
3. Follow the TDD loop using the test cases from the approved plan:
   a. Write failing tests first (use the Given/When/Then cases from the plan)
   b. Implement the solution (create/modify the files listed in the plan)
   c. Run tests until green
   d. Run typecheck (pnpm tc) and formatter (pnpm run format)
4. Delegate manual validation to the manual-verify plugin (if available)
5. Run final checks (full test suite, build)
6. Create a PR following .github/PULL_REQUEST_TEMPLATE.md
7. Transition the JIRA ticket to "In Review"

## Key Rules
- Tests BEFORE implementation (TDD is mandatory)
- No any types, no console.log, no imports from /ee/
- All queries must include tenant-scoping (org_id or project_id)
- Follow the error format from stack.md
- If a Langfuse file modification is flagged, make the smallest possible change
- Follow the approved plan — do not add scope or change the approach

## JIRA Connection
- Cloud ID: <cloud-id>
- Ticket: <ticket-key>

## Git
- Branch from: <main OR blocker's feature branch, as approved in branching plan>
- PR target: main
```

---

## Handling Edge Cases

### Ticket has no implementation steps (External Setup)

Some tickets (External Setup) require human action, not code. The skill should:
- Detect the ticket type from its description or JIRA issue type
- Skip it with a clear message: "OBS-2 is an External Setup task — requires manual configuration, skipping"
- Do NOT attempt to implement it

### Ticket is a Terraform/infrastructure task

Terraform tasks (CloudWatch alarms, PagerDuty services, AWS provisioning) should be delegated to the `infra-dev` plugin:
- Detect Terraform tasks from ticket description (mentions Terraform, CloudWatch alarms, infrastructure provisioning, IaC)
- Report: "OBS-9 is a Terraform task — delegating to infra-dev plugin"
- Invoke the `infra-dev` plugin with the ticket details
- If `infra-dev` is not installed, skip and note: "OBS-9 requires infra-dev plugin (not installed)"

### Ticket references an unimplemented dependency

If a ticket says "Blocked by: OBS-3" and OBS-3 is not yet merged:
- In single-ticket mode: warn the user and ask if they want to proceed anyway
- In epic/multi-ticket mode: the wave system handles this automatically (OBS-3 runs in an earlier wave)

### Tests pass on first run (before implementation)

This means either:
- The feature already exists (check git log)
- The tests are wrong (not testing what they should)
- Investigate before proceeding. Report to user.

### Merge conflicts between PRs in the same wave

Merge conflicts between PRs in the same wave are the user's responsibility. The skill does NOT auto-resolve conflicts because:
- The user should review and approve all conflict resolutions
- Merging order is a user decision (which PR goes first affects the rebase)
- Auto-resolution can silently introduce bugs in non-trivial conflicts

When reporting wave results, note which PRs may conflict:
```
Note: PR #15 (OBS-4) and PR #16 (OBS-5) both modify
packages/shared/src/saas/multi-tenancy/index.ts.
Merge one first, then the other PR may need a rebase.
```

### Ticket description is missing key sections

If the ticket doesn't follow the expected template (no acceptance criteria, no file paths):
- Read the RFC and PRD referenced in the ticket to fill in gaps
- If no RFC is referenced, ask the user for guidance
- Do NOT guess at implementation details

### Agent fails mid-implementation

If a worktree agent encounters an unrecoverable error:
- The worktree is preserved (changes are not lost)
- Report the error, the worktree path, and what was completed
- The user can resume manually or re-run just that ticket

### Rate limiting on JIRA API

When fetching many tickets for a large epic:
- Batch API calls where possible (use JQL search instead of individual fetches)
- If rate limited, wait and retry with backoff
- Report progress: "Fetched 15/23 tickets..."

---

## Configuration

The skill respects these conventions from the project:

| Setting | Source | Default |
|---------|--------|---------|
| Branch naming | CONSTITUTION § Git | `feat/<ticket-key>-<short-description>` |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | Required |
| Test runner (web) | CLAUDE.md | Jest (`pnpm test`) |
| Test runner (worker) | CLAUDE.md | Vitest (`pnpm run test --filter=worker`) |
| Typecheck | CLAUDE.md | `pnpm tc` |
| Formatter | CLAUDE.md | `pnpm run format` |
| Build check | CLAUDE.md | `pnpm build:check` |
| Dev server | CLAUDE.md | `pnpm run dev:web` |
| Worker | CLAUDE.md | `pnpm run dev:worker` |
| Infrastructure | CLAUDE.md | `pnpm run infra:dev:up` |
