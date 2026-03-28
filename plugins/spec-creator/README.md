# Spec Creator

Creates PRD and RFC specification documents through a conversational, iterative process.

## Core Principle

**PRD First, RFC Second**: The PRD defines the "what" (requirements, personas, acceptance criteria in EARS notation). The RFC defines the "how" (architecture, data model, interfaces). Neither is written until the user's intent is fully clarified through iterative questioning.

## Features

- Domain research via WebSearch before asking questions
- Codebase exploration to align specs with existing patterns and conventions
- Iterative clarifying questions in batches (up to 3 rounds)
- Section-by-section generation with user review gates
- EARS notation for all functional requirements (`WHEN/IF...THE SYSTEM SHALL`)
- Generic templates adapted to the project's tech stack at generation time
- Explicit approval gate before writing any files
- Q&A mode for questions about spec writing, EARS notation, RFC best practices

## Usage

```
# Full spec creation (PRD + RFC)
/spec-creator I need a billing service
/spec-creator spec out a notification system
/spec-creator design the authentication module

# PRD only
/spec-creator --prd-only design the file upload service

# RFC only (requires existing PRD)
/spec-creator --rfc-only --prd-path .specs/billing-service/01-PRD-billing-service.md

# Custom output directory
/spec-creator --output-dir docs/specs build a user management service

# Skip domain research
/spec-creator --skip-research I already know the domain, build a caching layer

# Q&A mode
/spec-creator what is EARS notation?
/spec-creator how should I structure an RFC?
/spec-creator what sections does a PRD need?
```

## How It Works

1. Parse request and detect mode (spec creation or Q&A)
2. Research the domain via WebSearch and explore existing codebase
3. Ask clarifying questions in batches; iterate until requirements are clear
4. Generate PRD section by section with user review gates
5. Generate RFC section by section, grounded in the approved PRD
6. Present file paths, get explicit user approval, then write to `.specs/`

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Output directory | `.specs/` | `--output-dir PATH` | Where spec files are written |
| Research | enabled | `--skip-research` | Skip WebSearch domain research |
| Output scope | both | `--prd-only` | Generate PRD only, skip RFC |
| Output scope | both | `--rfc-only` | Generate RFC only (requires existing PRD) |

## Output

Spec files follow the naming convention:

```
.specs/{service-slug}/{NN}-PRD-{service-slug}.md
.specs/{service-slug}/{NN}-RFC-{service-slug}.md
```

Where `{NN}` is a zero-padded sequential number and `{service-slug}` is the kebab-cased service name.

## Companion Plugins

| Plugin | Relationship |
|--------|-------------|
| `rfc-to-jira` | Converts the RFC output into structured JIRA tickets |
| `swe-dev` | Implements the JIRA tickets produced from the RFC |
| `pr-reviewer` | Reviews PRs that implement the spec |

## Prerequisites

- WebSearch tool (for domain research; optional with `--skip-research`)
- Git repository in working directory (for codebase exploration; optional)
- Write access to the output directory

## Installation

```
/install spec-creator@utibes-plugins-marketplace
```
