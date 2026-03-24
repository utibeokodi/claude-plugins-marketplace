# PR Reviewer

Comprehensive PR code review with JIRA context awareness. Fetches the JIRA ticket and follows linked documents (PRDs, RFCs, Confluence pages) to understand the full context, then reviews tests, runs them locally, verifies implementation matches requirements, and reviews code across 8 quality dimensions.

## Core Principle: Context-Aware Review

Unlike generic code review tools, PR Reviewer starts by understanding WHY the code was written (the JIRA ticket, PRD, and linked design docs) before judging HOW it was written. This produces more relevant findings and catches requirement gaps that pure code analysis misses.

## Features

- **JIRA Integration**: Automatically extracts the ticket key from the PR and fetches full ticket details
- **Document Following**: Follows links from the JIRA ticket to PRDs, RFCs, Confluence pages, and other documents (configurable depth, default 3)
- **Context Summary**: Outputs a structured summary of the PR, ticket, and linked documents before any review findings
- **Test Review**: Checks test coverage, black-box testing philosophy, structure, and runnability
- **Local Test Execution**: Runs tests locally if CI has not passed (auto-detects test runner)
- **Requirements Verification**: Maps ticket/PRD acceptance criteria to the implementation
- **8-Dimension Code Review**: Security, Performance, API/Breaking Changes, Observability, Accessibility, Dependency Risk, Architecture Fit, Maintainability
- **Confidence Scoring**: Each finding is scored 0-100; only high-confidence issues are reported (configurable threshold)
- **GitHub Comment Mode**: Optionally post the review as a PR comment (with user approval before posting)

## Usage

```
/pr-reviewer #42
/pr-reviewer PROJ-123 #42
/pr-reviewer #42 --comment
/pr-reviewer #42 --depth 2 --model sonnet --threshold 85
```

## How It Works

1. **Resolve PR**: Fetch PR metadata, extract JIRA ticket key, check CI status
2. **Gather Context**: Fetch JIRA ticket, follow linked PRDs/RFCs/Confluence pages (up to configured depth)
3. **Context Summary**: Output what the PR changes and what the ticket requires
4. **Review Tests**: Analyze test coverage, black-box philosophy, structure, completeness
5. **Run Tests**: Execute tests locally if CI has not passed (skip otherwise)
6. **Requirements Check**: Map acceptance criteria to implementation, flag gaps
7. **8-Dimension Review**: Parallel subagents review Security, Performance, API, Observability, Accessibility, Dependencies, Architecture, Maintainability
8. **Report**: Output structured findings with severity, file references, and recommendations

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Link follow depth | 3 | `--depth N` | Max depth for following links from JIRA ticket |
| Model | inherit | `--model MODEL` | Model for review subagents (opus, sonnet, haiku) |
| Confidence threshold | 80 | `--threshold N` | Minimum score to include a finding |
| GitHub comment | off | `--comment` | Post report as PR comment (requires user approval) |

## Companion Plugins

| Plugin | Relationship |
|--------|-------------|
| swe-dev | Implements JIRA tickets; pr-reviewer reviews the resulting PRs |
| infra-dev | Implements infrastructure tickets; pr-reviewer reviews those PRs too |

## Prerequisites

- Atlassian MCP server connected (for JIRA/Confluence access)
- GitHub CLI authenticated (`gh auth status`)
- Project dependencies installed (for local test execution)

## Installation

```
/install pr-reviewer@claude-plugins-marketplace
```
