---
name: spec-creator
description: This skill should be used when creating or updating PRD (Product Requirements Document) or RFC (Request for Comments) specification documents through a conversational process. Triggers on requests like "I need a billing service", "spec out a notification system", "write a PRD for", "create an RFC for", "design the [X] module", "/spec-creator [description]", or when users want to capture requirements before implementation. Also triggers on update requests like "update the billing RFC to add webhook retries", "add a caching layer to the notification service spec", "/spec-creator --update .specs/billing-service/02-RFC-billing-service.md add retry logic", or when users want to modify an existing spec. Also triggers in Q&A mode on questions like "what is EARS notation?", "how should I structure an RFC?", "what sections does a PRD need?", or "explain RFC best practices". Supports --prd-only, --rfc-only, --update, --skip-research, and --output-dir flags.
argument-hint: "[description] [--prd-only] [--rfc-only] [--update PATH] [--skip-research]"
disable-model-invocation: true
---

# Spec Creator: Conversational PRD and RFC Generation

Creates and updates PRD and RFC specification documents through an iterative, research-backed, conversational process. The user describes what they want to build or change; the skill researches the domain, asks targeted clarifying questions, and drafts specs incrementally with user review at each stage.

## Overview

This skill operates in three modes:

1. **Spec Creation**: Full iterative process: research, clarify, PRD, RFC, write files
2. **Spec Update**: Modify an existing spec while ensuring consistency with the constitution, global invariants, and all other specs in the directory
3. **Q&A**: Answer questions about spec writing methodology, EARS notation, RFC structure, etc.

The core principle is **PRD first, RFC second**: the PRD defines the "what" (requirements, personas, acceptance criteria in EARS notation); the RFC defines the "how" (architecture, data model, interfaces). Neither is written until the user's intent is fully clarified through iterative questioning.

## When to Use

Invoke this skill when:
- User requests: "I need a billing service" or "spec out a notification system"
- User says: "write a PRD for [feature]" or "create an RFC for [service]"
- User says: "design the [X] module" or "I want to build [feature]"
- User provides: "/spec-creator [description]"
- User provides: "/spec-creator --prd-only [description]"
- User says: "update the billing RFC to add webhook retries"
- User says: "add a caching layer to the notification service spec"
- User provides: "/spec-creator --update .specs/billing-service/02-RFC-billing-service.md add retry logic"
- User says: "modify the entitlement spec to support per-project quotas"
- User asks: "what is EARS notation?" or "how should I structure an RFC?"
- User asks: "what sections does a PRD need?" or "explain RFC best practices"
- User needs: structured requirements capture before implementation
- User needs: to modify an existing spec without breaking consistency with other specs

## Prerequisites

- For research phase: WebSearch tool available (optional, can skip with `--skip-research`)
- For codebase exploration: a git repository in the working directory (optional)
- For writing files: write access to the output directory

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Output directory | `.specs/` | `--output-dir PATH` | Directory to write spec files |
| Research | enabled | `--skip-research` | Skip WebSearch domain research |
| Output scope | both | `--prd-only` | Generate PRD only, skip RFC |
| Output scope | both | `--rfc-only` | Generate RFC only (requires existing PRD path) |
| Mode | create | `--update PATH` | Update an existing spec file instead of creating a new one |

Examples:
- `/spec-creator --output-dir docs/specs --skip-research I need a payments module`
- `/spec-creator --update .specs/billing-service/02-RFC-billing-service.md add webhook retry logic`

---

## Workflow

### Step 1: Parse Request and Determine Mode

Analyze the user's input to determine which mode to use.

#### Q&A Mode Detection

If the request is a question about spec writing methodology rather than a request to build something, enter Q&A mode:
- Questions about EARS notation, RFC structure, PRD sections, requirements writing
- "What is...", "How should I...", "Explain...", "What's the difference between..."

In Q&A mode:
1. Load `references/prd_template.md` or `references/rfc_template.md` as needed to illustrate answers
2. Answer directly with examples from the templates
3. After answering, ask: "Would you like to start creating a spec now?"
4. If yes, restart from Step 1 in spec creation mode

#### Spec Update Detection

If the request mentions updating, modifying, or changing an existing spec, or uses the `--update` flag, enter update mode. Indicators:
- Explicit flag: `--update PATH`
- Language: "update the billing RFC", "add X to the notification spec", "modify the entitlement PRD", "change the data model in..."
- References a specific existing spec file path

If update mode is detected, proceed to **Step U1** (Spec Update workflow, below).

#### Spec Creation Parse

For spec creation requests:
1. Extract the **service/feature name** from the description (e.g., "billing service", "notification system")
2. Parse flags:
   - `--prd-only`: Generate PRD only, skip RFC
   - `--rfc-only`: Generate RFC only. Ask user for the path to the existing PRD.
   - `--skip-research`: Skip WebSearch domain research (Step 2a)
   - `--output-dir PATH`: Override default `.specs/` output directory
3. Set `service_slug` by kebab-casing the service name (e.g., `billing-service`)
4. Determine `spec_number` by scanning `output_dir` for existing spec files and incrementing the highest number found. If no specs exist yet, start at `01`.

Output confirmation: "I'll help you create a PRD and RFC for **[service name]**. Let me start by researching the domain."

---

### Step 2: Research Phase

Skip this step entirely if `--skip-research` is set.

#### 2a. Domain Research via WebSearch

Run 2-3 targeted web searches to understand the domain before asking questions. Adapt the search queries based on the service type:

- `"[service type] architecture patterns"` (e.g., "billing service architecture patterns")
- `"[service type] best practices"` (e.g., "notification service best practices")
- `"[service type] data model design"` (for data-heavy services)
- If integrating with known external services: `"[external service] integration patterns"`

Synthesize findings into a mental model of the domain. Do NOT present raw search results to the user. Use the knowledge to inform better clarifying questions in Step 3.

#### 2b. Codebase Exploration (if a git repository exists)

Check for a git repository:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

If a codebase exists, explore it to understand:

1. **Tech stack**: Read `package.json`, `go.mod`, `requirements.txt`, `Gemfile`, `pom.xml`, `Cargo.toml`, or similar dependency files
2. **Project conventions**: Read `CLAUDE.md`, `README.md`, any docs directory
3. **Constitution and global invariants**: Search for and read ALL project-wide rules documents. These come in two layers:
   - **Constitution** (`CONSTITUTION.md`, `.specs/CONSTITUTION.md`, `docs/CONSTITUTION.md`): Inviolable guardrails (e.g., forbidden patterns, tenant isolation mandates, security non-negotiables, module boundary rules, human-approval-required actions).
   - **Global invariants** (`stack.md`, `architecture-overview.md`, `engineering-standards.md`, or similar): Project-wide engineering standards that every service must follow (e.g., Redis TLS requirements, webhook body parsing rules, error response format, logging rules, tenant-scoping patterns for all queries, secret storage/rotation policies, IAM least-privilege, rate limit header conventions, testing requirements).

   Read both layers thoroughly. Store the full set of rules for use in Steps 4 and 5. The distinction matters: constitution rules are absolute (never violate without an explicit amendment), while global invariants are engineering standards that the new service must adopt unless there is a strong technical reason to deviate.
4. **Existing specs**: Look for `.specs/`, `docs/specs/`, `docs/adr/` directories. If found, read ALL existing RFCs and PRDs (not just 1-2). Build a map of the existing system by extracting from each spec:
   - **Data ownership**: Which tables/collections does each service own?
   - **Public interfaces**: What functions/endpoints does each service export?
   - **Dependencies**: Who calls whom? Which external services are wrapped by which module?
   - **Responsibilities**: What does each service do? (to detect overlapping scope)
   - **Key invariants**: Rules that cross service boundaries
   This map is used in Steps 4 and 5 to ensure the new spec does not introduce inconsistencies with existing specs.
5. **Service architecture**: Explore `src/`, `packages/`, `services/` for existing service patterns
6. **Data models**: Look for schema files (Prisma schema, SQL migrations, ORM models, etc.)
7. **Existing similar services**: If the user is building a "billing service" and there's already a "subscription service", read its spec for conventions

Determine and note:
- The tech stack (language, framework, database, message queue, etc.)
- Whether a constitution exists (specs MUST conform to it)
- Whether global invariants/engineering standards exist (specs must adopt them)
- Whether existing spec documents exist (use their style as reference)
- The repository structure (monorepo, polyrepo, single service)
- Adjacent services that the new service will integrate with

If a constitution or global invariants were found, inform the user: "I found a project constitution at `{path}` and global engineering standards at `{path}`. All generated specs will conform to these rules. I'll flag any areas where the new service may require changes to either document."

**Output at end of Step 2:**
Briefly summarize what was learned: "I've researched [service type] patterns and explored your codebase. I can see you're using [tech stack] with a [structure]. Now I have some questions to nail down the requirements."

If the codebase exploration revealed the tech stack and conventions, acknowledge what was already discovered so the user doesn't need to repeat it.

---

### Step 3: Clarifying Questions (Iterative Loop)

Ask questions in batches of 5-7. Maximum 3 rounds. The loop continues until the spec can be written without assumptions. Track all questions and answers in a clarifications log for inclusion in the PRD.

#### 3a. First Batch: Structural Questions

Always ask these unless already answered by codebase exploration:

1. **Architecture**: "What's your overall system architecture? (monolith, microservices, monorepo with packages, serverless functions)"
2. **Scale**: "What's the expected load? (number of users, requests per day, data volume, even rough estimates help)"
3. **Tech stack** (if not discovered in Step 2): "What's your tech stack? (language, framework, database, message queue)"
4. **Existing system**: "Is this a new service or extending an existing one? If extending, which services does it integrate with?"
5. **Timeline/scope**: "Is this for MVP only, or should the spec cover future phases too?"
6. **Users/personas**: "Who will use or interact with this service? (end users, internal services, admin tools, third-party partners)"

If codebase exploration already answered some questions, skip those and acknowledge: "I can see from your codebase that you're using [tech stack]. I'll use that for the spec unless you tell me otherwise."

**WAIT for the user's response before proceeding.**

#### 3b. Second Batch: Domain-Specific Questions

After receiving first batch answers, ask domain-specific questions. Select from these categories based on the service type:

*For data-owning services:*
- "What data does this service own exclusively? What data does it read from other services?"
- "Are there compliance requirements (GDPR, SOC 2, PCI DSS) that affect data storage?"
- "What's the data retention policy?"

*For external-integration services (billing, notifications, auth):*
- "Which external provider(s) will this integrate with?" (e.g., Stripe, SendGrid, Auth0)
- "Will webhooks be involved? If so, which events need to be handled?"
- "What's the error/retry strategy for external service failures?"

*For API-facing services:*
- "Who are the consumers of this API? (internal services, frontend clients, third-party partners)"
- "What authentication mechanism? (JWT, API keys, OAuth, session)"
- "Are there rate limiting requirements?"

*For event-driven services:*
- "What events does this service publish? What events does it consume?"
- "What's the message broker? (Kafka, RabbitMQ, BullMQ, SQS, etc.)"
- "What are the delivery guarantees needed? (at-least-once, exactly-once)"

*For multi-tenant services:*
- "How is tenant isolation enforced? (row-level, schema-level, database-level)"
- "Are there per-tenant limits or quotas?"

Pick 4-6 questions from the relevant categories. Do not ask questions from categories that clearly do not apply.

**WAIT for the user's response before proceeding.**

#### 3c. Follow-Up Questions (If Needed)

After receiving second batch answers, assess whether any answers introduced new unknowns. If yes, ask a final batch of 3-4 targeted follow-up questions. If no new unknowns exist, skip this round.

**WAIT for the user's response if questions were asked.**

#### 3d. Confirm Readiness

After all rounds, confirm: "I have what I need to draft the spec. Let me start with the PRD. I'll present each major section for your review before moving on."

---

### Step 4: Generate PRD (Iterative with Review Gates)

Load `references/prd_template.md` to use as the structural guide.

PRD generation is section-by-section. After each group of sections, present what was drafted and WAIT for user feedback before proceeding.

#### 4a. Draft: Overview + Personas (Sections 1-2)

Draft Section 1 (Overview):
- 2-4 sentence description of what's being built, why, and who it serves
- **Goals**: 3-5 concrete, measurable goals distilled from the clarifying question answers
- **Non-Goals**: What is explicitly NOT being built (use the scope/timeline answers and deferred features)

Draft Section 2 (Personas) if relevant. Skip for pure internal services with no user-facing component.

Present both sections and ask:
"Here's the Overview and Personas sections. Does this accurately capture the scope? Are there any goals or non-goals I've missed?"

**WAIT for user response.**
- If approved: proceed to 4b
- If changes requested: revise and re-present before proceeding

#### 4b. Draft: Functional Requirements (Section 3)

This is the most critical PRD section. Use EARS notation for every acceptance criterion.

For each functional requirement:
- Derive it from the clarifying question answers and research findings
- Write a User Story: "As a [persona], I want [action], so that [benefit]"
- Write 2-4 EARS criteria per requirement using the patterns:
  - `WHEN [trigger] THE SYSTEM SHALL [behaviour]`
  - `IF [precondition] WHEN [trigger] THE SYSTEM SHALL [behaviour]`
  - `WHILE [state] THE SYSTEM SHALL [behaviour]`

Include happy paths, error paths, and edge cases as separate criteria. Aim for completeness.

Present all functional requirements and ask:
"Here are the functional requirements. Each uses EARS notation for acceptance criteria. Are there any requirements missing? Any criteria that don't match your intended behavior?"

**WAIT for user response.** Revise if needed.

#### 4c. Draft: NFRs + Integrations + Constraints + Assumptions + Open Questions (Sections 4-8)

Draft these based on clarifying question answers:
- **Non-Functional Requirements**: Populate Performance, Security, Reliability, Scalability, Observability, Compliance rows from scale and integration answers
- **External Integrations**: List specific external services identified
- **Constraints**: Hard technical, legal, or business constraints. If a constitution was found in Step 2, incorporate its relevant rules here as constraints. Cross-reference each constraint to the constitution rule it originates from (e.g., "Per CONSTITUTION.md Section 6: all queries MUST filter by org_id").
- **Assumptions**: Things assumed true that affect the spec if wrong
- **Open Questions**: Unresolved decisions that came up during clarification

**Constitution conformance check**: After drafting these sections, review every functional requirement from Section 3 and every constraint against the constitution rules. If any conflicts are found, load `references/conformance_examples.md` for the Constitution Conflicts table format. If no conflicts exist, note: "All requirements conform to the project constitution. No changes needed."

Present all five sections together and ask:
"Here are the non-functional requirements, integrations, constraints, assumptions, and open questions. Anything to adjust?"

**WAIT for user response.** Revise if needed.

#### 4d. Add Clarifications Log (Section 9)

Write Section 9 using the tracked log from Step 3. Every question asked and its answer becomes a row in the table. Use today's date for all entries.

#### 4e. Present Final PRD

Present the complete assembled PRD and ask:
"Here is your complete PRD. Review it as a whole. Does it capture everything accurately? Once you approve, I'll use it as the foundation for the RFC."

**WAIT for user response.**
- If approved: proceed to Step 5
- If changes requested: make targeted edits, re-present only the changed sections, re-confirm

If `--prd-only` flag was set, skip to Step 6 (file writing) after PRD approval.

---

### Step 5: Generate RFC (Iterative with Review Gates)

Load `references/rfc_template.md` to use as the structural guide.

The RFC defines HOW the system will be built. Every design decision should trace back to a PRD requirement. Adapt the template sections to the tech stack discovered in Step 2.

If `--rfc-only` was provided: read the existing PRD at the user-provided path and use it as context instead of running Step 4.

**Cross-spec consistency principle**: If existing specs were found in Step 2, every section of the RFC must be checked against the existing spec map before presenting to the user. The new spec MUST NOT:
- Claim ownership of data that another service already owns
- Re-wrap an external service that another module already wraps exclusively
- Export a function or endpoint that duplicates an existing service's public interface
- Introduce responsibilities that overlap with an existing service's scope
- Define dependency directions that contradict existing specs (e.g., if Service A calls Service B, the new service shouldn't make Service B call Service A for the same purpose)
- Use different error formats, ID conventions, or auth patterns than established by existing specs

If any inconsistency is detected, flag it inline when presenting the relevant section and propose a resolution (e.g., "The billing service already wraps Stripe exclusively. This service should call billing.getSubscriptionStatus() rather than calling Stripe directly.").

#### 5a. Draft: Purpose + Responsibilities + Public Interface

- **Purpose**: 1-2 sentences on what the module does and why. Derived from PRD Section 1.
- **Responsibilities**: Bullet list of what this service owns and does. Each responsibility should map to PRD functional requirements.
- **Public Interface**: The exported functions, API endpoints, or message contracts. Adapt based on tech stack:
  - REST APIs: HTTP verbs, paths, auth scheme
  - RPC-style (gRPC, tRPC): function signatures with typed parameters and return types
  - Event-driven: event names and payload shapes
  - Internal library: exported function signatures with error unions

**Cross-spec check**: Verify the public interface does not duplicate functions exported by existing services. If the new service needs data owned by another service, it should call that service's exported function rather than accessing the data directly. If the new service wraps an external provider, verify no other service already wraps that provider.

Present and ask for review.

**WAIT for user response.**

#### 5b. Draft: API Endpoints + Request/Response Contracts

Only include if the service exposes external-facing endpoints. If internal-only, omit and note it.

For each endpoint:
- Type (REST, GraphQL, WebSocket, webhook, RPC)
- Path/method and auth mechanism
- Input/output shapes (simplified schema notation)
- Error responses

Present and ask for review.

**WAIT for user response.**

#### 5c. Draft: Data Model

Design the data model based on:
- The tech stack (SQL vs. NoSQL vs. document store)
- Data ownership established in clarifying questions
- NFRs (tenant isolation, compliance, performance)

Use the schema syntax appropriate for the project's database technology. Structure:
- Primary tables/collections with columns, types, constraints
- Indexes (which fields need indexes and why)
- Cache layer (if applicable: key patterns and TTLs)
- Time-series/analytics store (if applicable)
- External entity references table

**Cross-spec check**: Verify that every table/collection defined here is new. If a table name matches one owned by another service, the new service MUST NOT redefine it. Instead, reference it in the "External entity references" table and access it through the owning service's public interface. Also verify that ID generation, timestamp conventions, and tenant isolation patterns match what existing specs use.

Present and ask for review.

**WAIT for user response.**

#### 5d. Draft: Key Data Flows + Error Handling

**Key Data Flows:**
- Identify the 2-5 most important request/event flows through this service
- Each flow is a numbered sequence: actor, action, service response, downstream effects
- Derive flows from the EARS criteria in the approved PRD

**Error Handling:**
- Map each error type to an HTTP status (or error code), its trigger, and what the consumer should do
- Derive errors from the PRD's failure behavior criteria

Present both together and ask for review.

**WAIT for user response.**

#### 5e. Draft: Env Vars + Key Invariants + Dependencies + Risks + Scale Constraints

- **Environment Variables**: Every external config value. Flag required vs. optional. Include examples, never real values.
- **Key Invariants**: Non-negotiable rules using MUST/MUST NOT language. These become the rules every developer must follow. This section has three layers, presented in order:
  1. **Inherited from constitution** (if one exists): Include all constitution rules that apply to this service. Reference the source explicitly (e.g., "Per CONSTITUTION.md Section 6: every query MUST filter by org_id").
  2. **Inherited from global invariants** (if `stack.md` or equivalent exists): Include all project-wide engineering standards that apply (e.g., "Per stack.md: webhook routes MUST disable body parsing before signature verification", "Per stack.md: Redis connections MUST use rediss:// (TLS)", "Per stack.md: all API responses MUST follow the standardized error format"). These are standards the new service adopts by default.
  3. **Service-specific**: New invariants unique to this service that are not covered by the above two layers.

  Clearly label each invariant's source so developers know which document governs it.
- **Dependencies**: Upstream (who calls this service) and downstream (what it calls). Map back to PRD External Integrations. Verify dependency directions comply with the constitution's module boundary rules (if any).
- **Risks**: At least 2-3 concrete risks with mitigation strategies.
- **Scale Constraints**: Expected load numbers from clarifying question answers.

**Final conformance review**: Before presenting, do a full pass of the RFC against both the constitution and global invariants:

*Constitution check:*
- Verify the data model respects tenant isolation rules
- Verify the public interface follows module boundary rules (no cross-module direct data access)
- Verify error handling follows security non-negotiables
- Verify environment variables and secrets handling matches constitution requirements

*Global invariants check:*
- Verify the error response format matches the project standard (e.g., standardized error shape from `stack.md`)
- Verify webhook handling follows project conventions (e.g., body parsing disabled, signature verification, idempotency)
- Verify Redis usage follows security standards (e.g., TLS, AUTH, ACL restrictions)
- Verify logging rules are respected (e.g., no sensitive data in logs)
- Verify rate limiting and quota responses follow the project's header conventions
- Verify testing requirements are met (e.g., tenant isolation integration tests, input validation)
- Verify authentication and authorization patterns match existing standards

If any RFC design decision conflicts with the constitution or global invariants, load `references/conformance_examples.md` for the Change Proposal format and present it alongside the RFC sections. If no changes are needed, note: "All design decisions conform to the project constitution and global engineering standards."

Present all five sections (plus the constitution change proposal if applicable) and ask for review.

**WAIT for user response.**

#### 5f. Draft: Implementation Phases + Testing + Deferred + Open Questions

- **Implementation Phases**: Break into phases (0 = foundation/data model, 1 = core functionality, 2+ = secondary features). Each phase should be independently deployable where possible.
- **Testing**: Testing requirements specific to this service (e.g., mock external APIs, verify tenant isolation, load test at Nx scale).
- **Deferred to Post-MVP**: Features from clarifying questions that were explicitly out of scope, with rationale and trigger conditions.
- **Open Questions**: Unresolved technical decisions that must be answered before implementation.

Present and ask for review.

**WAIT for user response.**

#### 5g. Present Final RFC

Assemble and present the complete RFC:
"Here is your complete RFC. This defines the full technical design. Are the design decisions sound? Are there any open questions that need resolution before implementation?"

**WAIT for user response.**
- If approved: proceed to Step 6
- If changes requested: edit targeted sections, re-confirm

---

### Step 6: Write Files (Explicit Approval Gate)

**This step requires explicit user approval before any file is written.**

Determine file paths:

```
spec_number = next available 2-digit number in output_dir, zero-padded (01, 02, 03...)
service_slug = kebab-case name derived from service name

PRD path: {output_dir}/{service_slug}/{spec_number}-PRD-{service_slug}.md
RFC path: {output_dir}/{service_slug}/{spec_number}-RFC-{service_slug}.md
```

If `--prd-only`: only the PRD file.
If `--rfc-only`: only the RFC file.

Present the plan before writing:

```
I'm ready to write the spec files. Here's what I'll create:

  {output_dir}/{service_slug}/{spec_number}-PRD-{service_slug}.md
  {output_dir}/{service_slug}/{spec_number}-RFC-{service_slug}.md

The directory will be created if it doesn't exist.

Shall I write these files?
```

**WAIT for explicit confirmation.**

Only after the user confirms:
1. Create the output directory and service subdirectory if they don't exist
2. Write the PRD file
3. Write the RFC file
4. Confirm: "Files written successfully."

Output summary:

```
## Spec Files Written

  {PRD path}
  {RFC path}

## Next Steps

These specs are ready for:
  /rfc-to-jira {RFC path}    -- decompose the RFC into JIRA tickets
  /swe-dev [ticket-key]      -- implement individual tickets
  /pr-reviewer #[PR-number]  -- review PRs as they're created
```

If the user says "no" or requests changes: offer to make further edits in the conversation without writing files.

## Spec Update Workflow

When update mode is detected in Step 1, load `references/update_workflow.md` and follow the update workflow (Steps U1-U5) described there.

## Edge Cases

Load `references/edge_cases.md` and check applicable cases before and during execution.

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
