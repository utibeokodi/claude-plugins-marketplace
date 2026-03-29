---
name: swe-dev
description: This skill should be used when implementing JIRA tickets autonomously. Triggers on requests like "implement this ticket", "implement this epic", "/swe-dev OBS-3", "/swe-dev OBS-1 (epic)", or when users want to take JIRA tickets and turn them into implemented code with tests, validation, and PRs. Supports single tickets, multiple tickets, or full epics with parallel execution via git worktrees.
argument-hint: "TICKET-KEY [, TICKET-KEY...] [--skip-verify]"
disable-model-invocation: true
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
7. After clarifications are resolved, produce an implementation plan
8. Load `references/plan_template.md` and use it to structure the implementation plan.
9. Present the plan and wait for user approval
10. On approval, proceed to Step 4 (Execute)
11. On rejection, revise the plan based on user feedback and re-present
```

#### 3b. Multi-Ticket / Epic Planning (Parallel)

For multiple tickets, plan all tickets in the current wave simultaneously. Planning agents use `isolation: "worktree"` so any accidental writes are safely discarded:

```
FOR each wave:
  FOR each ticket in wave (parallel):
    Agent(
      prompt: <planning prompt — load references/planning_agent_prompt.md>,
      isolation: "worktree",
      run_in_background: true
    )
  WAIT for all planning agents to complete
  COLLECT all plans and all clarifying questions
  IF any planning agent has clarifying questions:
    PRESENT all questions grouped by ticket
    WAIT for user answers
    RE-RUN planning for those tickets with the answers included in the prompt
  Load `references/batch_plan_review.md` for the batch plan review format and present plans using that structure.
  WAIT for user approval (approve all, approve some, reject with feedback)
  FOR each rejected plan:
    Revise based on user feedback
    Re-present for approval
  PROCEED to Step 4 with approved plans only
```

Load `references/planning_agent_prompt.md` as the planning agent prompt template.

### Step 4: Execute Approved Plans

After plans are approved, proceed with implementation.

#### Single Ticket Execution (current working tree)

1. **Create feature branch**:
   ```bash
   git checkout -b feat/<ticket-key>-<short-description> main
   ```

2. **Execute the TDD loop**: Load `references/implementation_loop.md` and follow the 4-phase TDD implementation loop.

3. **Create PR** (see PR Creation below)

#### Multiple Tickets / Epic Execution (parallel via worktrees)

Execute waves sequentially, tickets within each wave in parallel. Merge conflict resolution within a wave is the user's responsibility during PR review and merging.

```
FOR each wave:
  # Plans for this wave were already approved in Step 3
  FOR each approved ticket in wave (parallel):
    Agent(
      prompt: <load references/agent_prompt_template.md as the worktree agent prompt for parallel execution>,
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

### Step 5: Manual Verification (Optional)

After the PR is created, invoke the `manual-verify` plugin to validate the implementation via black-box testing. This step is **skipped** when:

- The user passes `--skip-verify` (e.g., `/swe-dev OBS-3 --skip-verify`)
- The user explicitly declines verification when prompted
- The ticket is part of a multi-PR set that must be tested together (e.g., a feature that spans multiple tickets and only works once all PRs are merged)
- The `manual-verify` plugin is not installed

When skipped, note the reason in the PR description: "Manual verification skipped: [reason]."

Load `references/verification_protocol.md` for the full verification procedure and multi-ticket verification strategy options.

### Step 6: Report Results

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

---

## Handling Edge Cases

Load `references/edge_cases.md` and check applicable cases.

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

---

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
