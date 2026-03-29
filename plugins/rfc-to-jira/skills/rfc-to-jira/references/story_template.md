```markdown
## Phase [N]: [Phase Description]

**Depends on:** [From RFC Implementation Phases "Depends On" column]

## User Story

As a [persona derived from the RFC context], I want [phase objective] so that [business value from RFC Purpose].

## Objective

[1-2 sentences describing what this phase delivers, derived from the RFC phase description and the relevant sections of the RFC]

## Deliverables

- [ ] [List each concrete deliverable: files created, functions implemented, migrations applied]

## Key Context from RFC

[Include relevant excerpts from Data Model, Key Data Flows, Error Handling sections that apply to this phase]

## Langfuse Baseline Guardrails

[If the RFC has a "Langfuse Baseline" section, list what this phase must NOT re-implement]

## PRD Requirements Covered

[List which PRD REQ-N items are delivered by this phase]

## Acceptance Criteria

- [ ] All deliverables implemented
- [ ] Unit tests written and passing (omit for external-setup-only phases)
- [ ] Integration tests written and passing (especially cross-tenant isolation tests if applicable)
- [ ] Code passes lint (`pnpm run format` + `pnpm tc`) (omit for external-setup-only phases)
- [ ] Application runs locally without errors (`pnpm run dev:web`) (omit for external-setup-only phases)
- [ ] Manual validation completed (see validation steps in tasks)
```
