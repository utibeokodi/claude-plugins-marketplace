# SWE Dev

Autonomous development from JIRA tickets. Takes one ticket, multiple tickets, or a full epic and implements them end-to-end with TDD, local validation, and one PR per ticket.

## Core Principle

**Plan everything, execute nothing without approval.** Every action that changes code is preceded by a detailed plan that the user reviews and approves. Clarifying questions are always asked, never assumed.

## Features

- **Single ticket**: Implement one ticket in the current working tree
- **Multiple tickets**: Parallelize independent tickets across git worktrees
- **Full epic**: Fetch all tickets, build dependency graph, execute in waves
- **Two-phase execution**: Plan first (parallel, fast), then implement after approval
- **Clarifying questions**: Never assumes; asks when anything is unclear
- **Detailed plans**: Full plan template for every ticket (single or batch), not abbreviated
- **TDD loop**: Write failing tests first, implement, run tests, fix, repeat
- **Local validation**: Delegates to the `manual-verify` plugin for all manual verification
- **Terraform delegation**: Delegates infrastructure tasks to the `infra-dev` plugin
- **One PR per ticket**: Each ticket gets its own reviewable PR into main
- **JIRA integration**: Transitions tickets to "In Review" after PR creation
- **User-controlled merging**: Merge conflicts are resolved by the user, not auto-resolved

## Usage

```bash
# Single ticket
/swe-dev OBS-3

# Multiple tickets
/swe-dev OBS-3, OBS-4, OBS-5

# Full epic
/swe-dev OBS-1
```

## How It Works

```
Step 1: Fetch tickets from JIRA
Step 2: Build dependency graph, sort into waves
Step 3: Plan each ticket (parallel), ask clarifying questions, present for approval
Step 4: Execute approved plans (parallel via worktrees), create PRs
Step 5: Choose branching strategy for next wave (merge first, branch from feat, or hybrid)
Step 6: Plan next wave (based on actual implemented code), approve, execute
Step 7: Report results, note potential merge conflicts
```

## How Parallel Execution Works

```
Wave 1:  Plan → Approve → Execute → PRs created
                                         |
         Choose branching strategy ←─────┘
                  |
Wave 2:  Plan → Approve → Execute → PRs created
                                         |
         Choose branching strategy ←─────┘
                  |
Wave 3:  Plan → Approve → Execute → PRs created
```

Between waves, you choose how the next wave branches:
- **Option A**: Merge blocking PRs into main first (cleanest)
- **Option B**: Branch from blocker's completed feature branch (fastest)
- **Option C**: Hybrid (pick per ticket)

## Companion Plugins

| Plugin | Role | When Called |
|--------|------|------------|
| **rfc-to-jira** | Creates the tickets this skill implements | Before swe-dev |
| **manual-verify** | Local validation (UI, API, DB, Redis, worker) | Called by swe-dev after tests pass |
| **infra-dev** | Terraform/infrastructure tasks | Called by swe-dev for infrastructure tickets |
| **pr-review** | Reviews PRs against RFC and coding standards | After swe-dev creates PRs |

## Prerequisites

- Atlassian MCP server connected
- Git repository with `main` branch
- Development environment configured (`pnpm i`, `.env`, infrastructure running)

## Installation

```
/install swe-dev@claude-plugins-marketplace
```
