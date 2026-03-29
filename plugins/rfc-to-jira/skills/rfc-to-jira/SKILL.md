---
name: rfc-to-jira
description: This skill should be used when converting RFC specification documents into JIRA tickets. Triggers on requests like "create JIRA tickets from this RFC", "break down this spec into tickets", "/rfc-to-jira [path-to-rfc]", or when users want to decompose an RFC into implementable work items that Claude can pick up and implement end-to-end.
argument-hint: "[path-to-rfc]"
disable-model-invocation: true
---

# RFC to JIRA Ticket Generator

Convert RFC specification documents into structured, implementation-ready JIRA tickets. Each ticket contains enough context and detail for Claude Code to implement it end-to-end, including a built-in validation loop (write tests first, implement, run tests, validate locally).

## Overview

This skill reads an RFC document following the standard 16-section RFC template (plus any non-standard sections), analyzes its structure, reads the companion PRD for EARS requirements, and produces a hierarchy of JIRA tickets:

- **1 Epic** per RFC (the full service/module)
- **Stories** per Implementation Phase defined in the RFC
- **Tasks** (subtasks) per discrete unit of work within each phase

Each task includes everything Claude needs to implement it without additional context-gathering.

## When to Use

Invoke this skill when:
- User requests: "create JIRA tickets from this RFC"
- User says: "break down [service-name] spec into tickets"
- User provides: "/rfc-to-jira [path-to-rfc]"
- User wants to: "turn this RFC into implementable work items"
- User needs: JIRA tickets that Claude can pick up and implement autonomously

## Prerequisites

Before running this skill, confirm:
1. The user has a Jira project set up (get the `cloudId` and `projectKey`)
2. The RFC file exists and follows the standard RFC template structure
3. The user has the Atlassian MCP server connected

## Workflow

### Step 1: Gather JIRA Project Info

Ask the user for:
- **Jira Cloud ID or site URL** (e.g., `your-site.atlassian.net`)
- **Project key** (e.g., `OBS`, `PLAT`)
- **Path to the RFC file** (e.g., `.specs/multi-tenancy-core/01-RFC-multi-tenancy-core.md`)

If the user has already provided any of these in their message, skip asking for those.

If the user hasn't provided a Jira Cloud ID, try to discover it:

```
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
```

### Step 2: Read and Analyze the RFC + PRD

Read the RFC file and extract ALL sections (both standard and non-standard). Also read the companion files that provide implementation context:

```
Read(file_path="<path-to-rfc>")
```

Also read these supporting documents for cross-cutting context:
- The project's `CLAUDE.md` (root of repo) for conventions, dev commands, and guidelines
- `.specs/CONSTITUTION.md` for inviolable rules and forbidden patterns
- `.specs/stack.md` for technology stack and engineering standards
- `.specs/structure.md` for repository layout and file conventions
- `.specs/architecture-overview.md` for system architecture and module interactions
- The companion PRD file (same directory as the RFC, named `*-PRD-*.md`) for EARS requirements

#### 2a. Parse Standard RFC Sections

| RFC Section | Used For |
|-------------|----------|
| **Purpose** | Epic description |
| **Responsibilities** | Scope boundaries for the epic |
| **Public Interface** | Story/task acceptance criteria (what functions to implement) |
| **tRPC / API Endpoints** | Dedicated tasks for each endpoint |
| **Data Model** | Phase 0 tasks (migrations, schema, inline decision tables preserved verbatim) |
| **Key Data Flows** | Implementation guidance in task descriptions; complex flows (e.g., each webhook event type) become separate tasks |
| **Error Handling** | Task acceptance criteria (error cases to handle) |
| **Environment Variables** | Setup/config tasks + external prerequisite tasks |
| **Key Invariants** | Non-negotiable rules included in every task description (Lua scripts, code snippets preserved verbatim) |
| **Dependencies** | Task ordering, blocked-by relationships, cross-epic sequencing |
| **Implementation Phases** | Story breakdown (1 story per phase; further decompose under-specified phases) |
| **Service-Specific Testing** | Test requirements per task |
| **Deferred to Post-MVP** | Explicitly excluded from tickets (mentioned in epic as out-of-scope) |

#### 2b. Parse Non-Standard RFC Sections

RFCs frequently include sections beyond the 16-section template. These MUST be parsed and mapped to tickets. Common non-standard sections:

| Non-Standard Section | How to Handle |
|----------------------|---------------|
| **Langfuse Baseline** | Extract as "DO NOT implement" guardrails. Include in Epic and every task to prevent duplicating existing functionality |
| **PostgreSQL Tenant Isolation Strategy** | Include as implementation guidance in every task that writes Prisma queries |
| **ClickHouse Tenant Isolation** | Generate tasks for row-policy setup, CVE version checks, CI pipeline checks |
| **Dunning Policy** | Generate external setup task (Stripe Smart Retries config) + dedicated implementation task for dunning state machine |
| **Late Payment / `past_due` Behavior** | Generate dedicated task with timeline-based test cases |
| **Alert Rules (Critical/Warning/Info)** | Generate one task per alert tier with specific alarm definitions |
| **MVP Implementation Approach** | Use as an alternative/supplement to Implementation Phases for story breakdown |
| **Runbook Stubs** | Generate a documentation task for creating runbook stubs |

#### 2c. Map PRD EARS Requirements to Acceptance Criteria

The companion PRD contains requirements in EARS notation: `WHEN [trigger] THE SYSTEM SHALL [behaviour]`. These are directly usable as acceptance criteria.

For each PRD requirement (REQ-N):
1. Identify which task implements that requirement
2. Convert the EARS criterion to a Given/When/Then acceptance criterion on that task
3. Pay special attention to:
   - **Security constraints** (e.g., "welcome email MUST NOT include API keys")
   - **Performance SLAs** (e.g., "enqueue and return within 50ms")
   - **Negative path behavior** (e.g., "return 401 if context cannot be derived")
   - **PRD Constraints section** (often stricter than RFC, e.g., "`$queryRaw` forbidden" vs. RFC's "SHOULD use Prisma")

### Step 3: Generate the Ticket Hierarchy

Create tickets in this order (parent must exist before children):

#### 3a. Create the Epic

```
mcp__claude_ai_Atlassian__createJiraIssue(
  cloudId: "<cloud-id>",
  projectKey: "<project-key>",
  issueTypeName: "Epic",
  summary: "[Service Name]: [Purpose summary]",
  description: <see references/epic_template.md>,
  contentFormat: "markdown"
)
```

Load `references/epic_template.md` for the full Epic ticket structure.

#### 3b. Create Stories (one per Implementation Phase)

For each phase in the RFC's "Implementation Phases" table, create a Story. If a phase is under-decomposed (contains 4+ distinct deliverables), split it into multiple stories:

```
mcp__claude_ai_Atlassian__createJiraIssue(
  cloudId: "<cloud-id>",
  projectKey: "<project-key>",
  issueTypeName: "Story",
  summary: "[Service Name] Phase [N]: [Phase Description]",
  description: <see references/story_template.md>,
  parent: "<epic-key>",
  contentFormat: "markdown"
)
```

Load `references/story_template.md` for the full Story ticket structure.

#### 3c. Create Tasks (subtasks under each Story)

Break each phase into discrete, implementable tasks. Each task should be completable in a single Claude session.

```
mcp__claude_ai_Atlassian__createJiraIssue(
  cloudId: "<cloud-id>",
  projectKey: "<project-key>",
  issueTypeName: "Task",
  summary: "[Action verb]: [specific deliverable]",
  description: <see references/task_template.md>,
  parent: "<story-key>",
  contentFormat: "markdown"
)
```

Load `references/task_template.md` for the full Task ticket structure (most important).

For BullMQ repeatable/cron job tasks, load `references/bullmq_task_template.md` instead.

For Terraform/infrastructure tasks, load `references/terraform_task_template.md` instead.

For external service setup tasks (Stripe, SendGrid, AWS, etc.), load `references/external_setup_task_template.md` instead.

#### 3d. Link Cross-Epic Dependencies

After all tickets are created, add blocking links between epics when one module depends on another being completed first. Use `mcp__claude_ai_Atlassian__createIssueLink` with link type "Blocks".

Common cross-epic dependencies:
- Multi-Tenancy Core blocks ALL other epics (it provides org_id infrastructure)
- Billing blocks Entitlement & Quota (pushes plan limits)
- Entitlement & Quota and Billing have a bidirectional dependency (document the fallback path in both epics)
- Notification is consumed by Billing and Entitlement (but can be stubbed)

### Step 4: Report Results

After all tickets are created, output a summary table:

```markdown
## Tickets Created

| Key | Type | Summary | Parent | Blocked By |
|-----|------|---------|--------|------------|
| OBS-1 | Epic | Multi-Tenancy Core: Tenant isolation and lifecycle management | — | — |
| OBS-2 | Story | Multi-Tenancy Core Phase 0: Schema and migrations | OBS-1 | — |
| OBS-3 | Task | Add SaaS columns to organizations table via Prisma migration | OBS-2 | — |
| ... | ... | ... | ... | ... |

## Cross-Epic Dependencies

| Source Epic | Blocks | Reason |
|-------------|--------|--------|
| OBS-1 (Multi-Tenancy) | OBS-10 (Billing), OBS-20 (Entitlement) | Provides org_id infrastructure |
| ... | ... | ... |
```

---

## Task Decomposition Guidelines

When breaking phases into tasks, follow these rules:

### What makes a good task (INVEST criteria)

- **Independent**: Can be implemented and merged without waiting for other in-progress tasks (except explicit blockers)
- **Negotiable**: Describes the outcome, not every implementation detail
- **Valuable**: Delivers a testable, demonstrable increment
- **Estimable**: Scope is clear enough to estimate (1-4 hours for Claude)
- **Small**: One concern per task; if it needs 7+ acceptance criteria, split it
- **Testable**: Has explicit Given/When/Then acceptance criteria including at least one negative path

### Standard task patterns per RFC section

| RFC Content | Task Type | Example |
|-------------|-----------|---------|
| Data Model (PostgreSQL) | Schema migration | "Add SaaS columns to organizations table via Prisma migration" |
| Data Model (ClickHouse) | Schema migration | "Add org_id column and bloom filter indexes to ClickHouse tables" |
| Data Model (Redis) | Config/setup | "Define Redis key patterns for usage counters" |
| Public Interface (each method) | Implementation | "Implement createOrg() service method with tests" |
| tRPC Endpoints (each endpoint) | Implementation | "Add saas.billing.getSubscription tRPC procedure" |
| API Routes (webhooks, per event type) | Implementation | "Handle invoice.payment_failed webhook event with dunning logic" |
| NextAuth event hooks | Implementation | "Add events.createUser callback for tenant provisioning trigger" |
| BullMQ repeatable/cron jobs | BullMQ job | "Implement hourly usage-sync BullMQ repeatable job" |
| BullMQ queue registration | Langfuse file mod | "Register SaasEmailQueue in queue definitions and worker entrypoint" |
| Error Handling (each error type) | Included in the function task | Folded into the service method task, not a separate task |
| Environment Variables | Config/setup | "Add environment variable validation for [service] config" |
| Environment Variables > External prerequisites | External setup | "Configure Stripe products, prices, and webhook endpoint" |
| Key Data Flows (complex multi-step) | Implementation | "Implement Redis-mediated API key reveal flow with GETDEL" |
| Terraform infrastructure (alarms, dashboards) | Terraform | "Provision CloudWatch alarms for Critical-tier alerts via Terraform" |
| Alert Rules (per tier) | Terraform | "Define Warning-tier CloudWatch alarms with configurable thresholds" |
| Runbook stubs | Documentation | "Create runbook stubs for all Critical and Warning alert categories" |
| CI/CD pipeline changes | Config | "Add Sentry release tracking to GitHub Actions deploy workflow" |
| Non-standard sections (Dunning, Late Payment) | Implementation | "Implement dunning state machine for past_due subscriptions" |

### Task ordering rules

1. **External setup tasks come first** in Phase 0 (configure Stripe, SendGrid, AWS, PagerDuty, etc. before any code depends on them)
2. **Schema/migration tasks follow external setup** within a phase
3. **Environment variable/config tasks** go in Phase 0 (after external setup, since env vars often contain credentials from external services)
4. **BullMQ queue registration** before job processor tasks (queue must exist before processor)
5. **Service method tasks follow schema tasks** (they depend on the schema)
6. **tRPC/API route tasks come after service methods** (they call service methods)
7. **Webhook handlers: one task per event type** (not one monolithic handler task)
8. **Integration test tasks come last** (they test the full flow)
9. **Terraform/infrastructure tasks** can run in parallel with code tasks if independent

### Phase decomposition rules

If an RFC phase is under-decomposed (contains 4+ distinct deliverables of different types), split it into multiple stories:
- **Example**: Notification Phase 1 has 5 send methods + BullMQ worker. Split into: Story A (BullMQ worker + queue registration), Story B (send methods 1-3), Story C (send methods 4-5 + integration tests)

If a phase contains only external setup tasks and env var config (no code), omit TDD acceptance criteria from the Story.

### Handling modules with no endpoints

Some modules (Multi-Tenancy Core, Entitlement & Quota, Monitoring & Alerting) have no tRPC or REST endpoints. For these:
- Skip the "tRPC Endpoints" task pattern
- Manual validation uses programmatic checks (Redis CLI, psql, AWS CLI) instead of browser/curl
- Note in the Epic that this module is consumed by other modules via exported service functions, not via HTTP

### Handling modifications to existing Langfuse files

When a task requires modifying one of the ~6 permitted existing Langfuse files, flag it explicitly:
- Mark the task title with a prefix: "[Langfuse mod]"
- Include in the task description: "This task modifies an existing Langfuse file — record in rebase checklist"
- List the specific file and the minimal change required
- The affected files across all RFCs: `auth.ts` (NextAuth config), `web/src/server/api/root.ts` (tRPC router), `packages/shared/src/server/queues.ts` (queue definitions), `worker/src/app.ts` (worker entrypoint), `packages/shared/prisma/schema.prisma` (Prisma schema)

### Sizing guidance

- **Too small**: "Add an import statement" (merge into the task that needs it)
- **Just right**: "Implement createOrg() service method with unit tests" (clear scope, testable)
- **Too large**: "Implement the entire billing service" (break into per-method tasks)
- **Too large**: "Implement Stripe webhook handler" (break into per-event-type tasks)
- **Just right**: "Handle invoice.payment_failed webhook event with dunning notification" (one event, one flow)

---

## Example: Multi-Tenancy Core RFC Decomposition

Given the Multi-Tenancy Core RFC with 3 implementation phases:

### Epic
- **Summary**: Multi-Tenancy Core: Tenant isolation and lifecycle management
- **Type**: Epic
- **Includes**: Glossary, Langfuse Baseline guardrails, cross-epic dependency note ("blocks all other epics")

### Phase 0 Story + Tasks
- **Story**: Multi-Tenancy Core Phase 0: Schema, migrations, and external setup
  - **Task 1**: Verify ClickHouse version meets security requirements (>=25.1.5.5) and disable library_bridge
  - **Task 2**: Add SaaS columns (slug, status, settings) to organizations table via Prisma migration
  - **Task 3**: Add org_id column and bloom filter indexes to ClickHouse tables (traces, observations, scores)
  - **Task 4**: Add environment variable validation for ClickHouse connection config

### Phase 1 Story + Tasks
- **Story**: Multi-Tenancy Core Phase 1: Core service methods
  - **Task 1**: Implement createOrg() service method with unit tests
  - **Task 2**: Implement getOrg() and getOrgSettings() service methods with unit tests
  - **Task 3**: Implement updateOrgSettings() with Zod validation and unit tests
  - **Task 4**: Implement deleteOrg() soft-delete with unit tests
  - **Task 5**: [Langfuse mod] Add deleted-org filtering to NextAuth session callback

### Phase 2 Story + Tasks
- **Story**: Multi-Tenancy Core Phase 2: Integration and end-to-end validation
  - **Task 1**: Implement tenant context injection into request scope
  - **Task 2**: Implement background job tenant context validation (BullMQ orgId enforcement)
  - **Task 3**: Add cross-tenant isolation integration tests (PostgreSQL)
  - **Task 4**: Add cross-tenant isolation integration tests (ClickHouse)
  - **Task 5**: End-to-end validation of all exported service methods

---

## Example: Billing Service RFC Decomposition (Webhook Per-Event Pattern)

### Phase 2 Story: Webhook Event Handlers (broken into per-event tasks)
- **Story**: Billing Phase 2: Stripe webhook event processing
  - **Task 1**: [Langfuse mod] Implement webhook route at `/api/webhooks/stripe` with signature verification and `bodyParser: false`
  - **Task 2**: Create `processed_webhook_events` idempotency table via Prisma migration
  - **Task 3**: Handle `invoice.payment_succeeded` webhook event
  - **Task 4**: Handle `invoice.payment_failed` webhook event with dunning notification
  - **Task 5**: Handle `customer.subscription.updated` webhook event (plan changes)
  - **Task 6**: Handle `customer.subscription.deleted` webhook event (cancellation)
  - **Task 7**: Implement `subscription-downgrade-check` daily BullMQ cron job

---

## Edge Cases

If the RFC is missing required sections:
- Warn the user about which sections are missing
- Generate tickets for the sections that ARE present
- Add a "Resolve open questions" task if the RFC has unresolved open questions

If JIRA API calls fail:
- Report the error clearly
- Continue creating remaining tickets
- Provide a summary of what was created vs. what failed

If the RFC references dependencies on other services that don't have RFCs yet:
- Note the dependency in the task description
- Add a blocker note: "Blocked by: [Service Name] RFC must be finalized"

If the RFC has non-standard sections not listed above:
- Read them carefully for implementable content
- Generate tasks for any deliverables found
- Include the section content as context in relevant task descriptions

---

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
