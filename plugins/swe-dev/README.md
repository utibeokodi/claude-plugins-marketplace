# SWE Dev

Autonomous development from JIRA tickets. Takes one ticket, multiple tickets, or a full epic and implements them end-to-end with TDD, local validation, and one PR per ticket.

## Features

- **Single ticket**: Implement one ticket in the current working tree
- **Multiple tickets**: Parallelize independent tickets across git worktrees
- **Full epic**: Fetch all tickets, build dependency graph, execute in waves
- **TDD loop**: Write failing tests first, implement, run tests, fix, repeat
- **Local validation**: Run the app and verify manually (or via Playwright for UI tasks)
- **One PR per ticket**: Each ticket gets its own reviewable PR into main
- **JIRA integration**: Transitions tickets to "In Review" after PR creation
- **Conflict resolution**: Auto-rebases PRs when parallel branches conflict

## Usage

```bash
# Single ticket
/swe-dev OBS-3

# Multiple tickets
/swe-dev OBS-3, OBS-4, OBS-5

# Full epic
/swe-dev OBS-1
```

## How Parallel Execution Works

```
Wave 1 (parallel):  [OBS-3] [OBS-6] [OBS-7]  ← no blockers, run simultaneously
                        |
Wave 2 (parallel):  [OBS-4] [OBS-5]           ← blocked by OBS-3, wait for merge
                        |
Wave 3:             [OBS-8]                    ← blocked by OBS-4
```

Each agent runs in an isolated git worktree. Independent tickets within a wave execute simultaneously. Waves execute sequentially based on JIRA blocking links.

## Companion Plugins

| Plugin | Role | When Called |
|--------|------|------------|
| **rfc-to-jira** | Creates the tickets this skill implements | Before swe-dev |
| **manual-verify** | UI-level validation for browser-facing tasks | Called by swe-dev when task has UI validation steps |
| **pr-review** | Reviews PRs against RFC and coding standards | After swe-dev creates PRs |

## Prerequisites

- Atlassian MCP server connected
- Git repository with `main` branch
- Development environment configured (`pnpm i`, `.env`, infrastructure running)

## Installation

```
/install swe-dev@claude-plugins-marketplace
```
