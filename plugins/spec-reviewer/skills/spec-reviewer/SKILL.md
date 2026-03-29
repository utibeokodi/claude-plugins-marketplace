---
name: spec-reviewer
description: This skill should be used when reviewing PRD or RFC specification documents for security vulnerabilities, cross-spec security regression, completeness gaps, cross-spec consistency, redundancy against existing specs and codebase, functional regression risks, operational readiness, clarity, and feasibility issues. Triggers on requests like "review this spec", "audit the billing RFC", "check the notification PRD for security issues", "review .specs/billing-service/02-RFC-billing-service.md", "/spec-reviewer .specs/billing-service/", "/spec-reviewer --security-only .specs/auth/01-RFC-auth.md", "is this spec ready for implementation?", "threat model the payment service spec", "what's missing from this RFC?", "does this spec duplicate anything?", "will this break existing services?", "check for redundancy", or when users want to validate specs before implementation. Supports --security-only, --dimension, --severity-threshold, --no-gates, and --output flags.
argument-hint: "[spec-path] [--dimension NAME] [--security-only] [--no-gates] [--output PATH]"
---

# Spec Reviewer: Security, Completeness, Consistency, and Regression Audit

Reviews PRD and RFC specification documents across eight dimensions: Security (including cross-spec security regression), Completeness, Consistency, Redundancy, Functional Regression, Operational Readiness, Clarity, and Feasibility. Produces a structured review report with severity-rated findings and actionable fix recommendations.

## Overview

This skill operates in three modes:

1. **Interactive Review** (default): Audit across all eight dimensions, pausing after each dimension for discussion before proceeding
2. **Full Review** (`--no-gates`): Audit across all eight dimensions without pausing, outputting the complete report with summary in one shot
3. **Focused Review** (`--dimension NAME`): Audit against a single dimension (e.g., security only)

The review is grounded in the project's constitution, global invariants, all other specs in the directory, and the existing codebase. Every finding is rated by severity (Critical, High, Medium, Low, Info) and includes a concrete recommendation for how to fix it.

The core principle is **defense in depth**: a new spec must not only be secure in isolation, it must not weaken the security, consistency, or functional correctness of the existing system when deployed alongside it.

## When to Use

Invoke this skill when:
- User requests: "review this spec" or "audit the billing RFC"
- User says: "check the notification PRD for security issues"
- User says: "is this spec ready for implementation?"
- User says: "threat model the payment service spec"
- User says: "what's missing from this RFC?"
- User says: "does this spec duplicate anything?" or "check for redundancy"
- User says: "will this break existing services?" or "check for regressions"
- User says: "does this introduce any security risks with the existing system?"
- User provides: "/spec-reviewer .specs/billing-service/"
- User provides: "/spec-reviewer --security-only .specs/auth/01-RFC-auth.md"
- User provides: "/spec-reviewer --dimension completeness .specs/billing-service/"
- User provides: "/spec-reviewer --dimension redundancy .specs/billing-service/"
- User provides: "/spec-reviewer --dimension regression .specs/billing-service/"
- User needs: validation that a spec is implementation-ready
- User needs: a security audit before committing to a design
- User needs: cross-spec consistency verification after updates
- User needs: confirmation that a new spec won't break existing functionality
- User needs: verification that a new spec doesn't duplicate existing capabilities

## Prerequisites

- At least one spec file (PRD or RFC) to review
- For cross-spec consistency checks: access to the `.specs/` directory
- For constitution compliance checks: access to constitution and invariants documents

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Dimensions | all | `--dimension NAME` | Review a single dimension only (security, completeness, consistency, redundancy, regression, operational, clarity, feasibility) |
| Dimensions | all | `--security-only` | Shorthand for `--dimension security` |
| Severity threshold | all | `--severity-threshold LEVEL` | Only report findings at or above this severity (critical, high, medium, low, info) |
| Review gates | enabled | `--no-gates` | Skip per-dimension review gates and output the complete report in one shot |
| Output | chat | `--output PATH` | Write the review report to a file instead of displaying in chat |

Examples:
- `/spec-reviewer .specs/billing-service/` (interactive review with gates between each dimension)
- `/spec-reviewer --no-gates .specs/billing-service/` (full report in one shot, no pauses)
- `/spec-reviewer --security-only .specs/auth/01-RFC-auth.md` (security audit only)
- `/spec-reviewer --dimension completeness --severity-threshold high .specs/notification-service/` (only high+ completeness findings)
- `/spec-reviewer --output .specs/billing-service/REVIEW.md .specs/billing-service/` (write report to file)
- `/spec-reviewer --no-gates --output .specs/billing-service/REVIEW.md .specs/billing-service/` (full report written to file)

---

## Workflow

### Step 1: Parse Request and Load Context

#### 1a. Identify Target Specs

Determine which spec files to review:

1. If a directory path is provided (e.g., `.specs/billing-service/`), review ALL spec files in that directory (both PRD and RFC)
2. If a single file path is provided, review that file. Also find and load its companion (PRD if reviewing RFC, RFC if reviewing PRD) for cross-reference
3. If no path is provided, ask: "Which spec would you like me to review?" and list available specs from `.specs/`

Parse flags:
- `--dimension NAME`: Restrict review to one dimension
- `--security-only`: Shorthand for `--dimension security`
- `--severity-threshold LEVEL`: Filter output to findings at or above this level
- `--no-gates`: Skip per-dimension review gates; run all dimensions without pausing and output the complete report at the end
- `--output PATH`: Write report to file instead of chat

#### 1b. Load Target Specs

Read every target spec file in full. For each spec, note:
- Whether it is a PRD or RFC
- The service name and spec number
- The status (Draft, In Review, Approved)
- The last updated date

#### 1c. Load Project Context

Load the broader project context for cross-referencing:

1. **Constitution and global invariants**: Search for and read `CONSTITUTION.md`, `stack.md`, `architecture-overview.md`, `engineering-standards.md`, or equivalent documents. These are the rules the spec must comply with.

2. **All other specs**: Read every other spec in the `.specs/` directory (excluding the target specs). Build a cross-spec map:
   - Data ownership: which tables/collections does each service own?
   - Public interfaces: what functions/endpoints does each service export?
   - Dependencies: who calls whom?
   - Responsibilities: what does each service do?
   - Key invariants: rules that cross service boundaries
   - Error formats, ID conventions, auth patterns

3. **Codebase exploration** (if a git repository exists):

   a. **Tech stack and conventions**: Read `package.json`, `go.mod`, `CLAUDE.md`, `README.md` for tech stack and conventions that specs should align with.

   b. **Existing implementations**: Search the codebase for modules, services, functions, and classes that relate to the new spec's domain. Build an implementation map:
      - Which capabilities described in the new spec already exist as working code?
      - Which data models (tables, schemas, ORM models) described in the new spec already exist in migration files or schema definitions?
      - Which external service integrations (Stripe, SendGrid, Auth0, etc.) described in the new spec are already wrapped by existing code?
      - Which shared utilities (validation, auth middleware, error handling, logging) described in the new spec already exist as reusable code?
      - Which API endpoints or routes described in the new spec are already served by existing handlers?

   c. **Existing data flows**: Trace how data currently flows through the system for operations the new spec touches. Identify call chains, event flows, and data pipelines that the new service would interact with or replace.

   d. **Existing environment variables**: Scan `.env.example`, `.env.template`, deployment configs, and existing code for environment variables that overlap with those listed in the new spec.

   This codebase map is used in later steps to detect redundancy (the spec duplicates what already exists) and functional regression (the spec would break what already works).

#### 1d. Load Review Criteria

Read `references/review_dimensions.md` to load the full checklist for each dimension.

**Output at end of Step 1:**
"I've loaded [N] spec files for review, [M] other specs for cross-reference, [P] codebase modules for redundancy/regression checks, and the project's constitution/engineering standards. Starting the review across [all eight dimensions / {specified dimension}]."

---

### Step 2: Security Review

Skip if `--dimension` is set to something other than `security`.

Load the Security section from `references/review_dimensions.md` and evaluate the spec against every applicable checklist item. This covers: authentication and authorization for every endpoint, data protection and encryption for sensitive fields, input validation and injection prevention, secrets management, API security controls (rate limiting, CORS, idempotency), multi-tenancy isolation, STRIDE threat modeling, and cross-spec security regression (the most critical sub-step, checking for trust boundary erosion, privilege escalation paths, data exposure amplification, and tenant isolation regression across service boundaries). A finding in the cross-spec security regression section is always High or Critical severity.

**Output:** Present all security findings in a table (see Step 9 for format). Ask the user if they want to proceed to the next dimension or discuss any findings.

**If `--no-gates` is set, skip the pause and proceed directly to the next dimension. Otherwise WAIT for user response.**

---

### Step 3: Completeness Review

Skip if `--dimension` is set to something other than `completeness`.

Load the Completeness section from `references/review_dimensions.md`. Check PRD completeness (measurable goals, specific non-goals, EARS criteria covering happy path, error paths, and edge cases, quantified NFRs, and open questions that could block implementation) and RFC completeness (traceability to PRD requirements, fully typed public interface, data model coverage, index justification, complete data flows, error table coverage, environment variables, invariants, dependency lists, independently deployable phases, and service-specific testing requirements). Also check for missing scenarios such as deployment behavior, partial failure handling, external dependency unavailability, and concurrent request handling.

**Output:** Present completeness findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 4: Consistency Review

Skip if `--dimension` is set to something other than `consistency`.

Load the Consistency section from `references/review_dimensions.md`. Check internal consistency between PRD and RFC (requirement traceability, response shapes matching data model, error codes matching data flows, naming conventions), cross-spec dangling references in both directions (references the new spec makes to other services that don't resolve, and references existing specs make to the new service that it doesn't fulfill), cross-spec consistency (data ownership conflicts, interface duplication, external service wrapping, dependency direction conflicts, and convention mismatches), and constitution/invariants compliance (every design decision against the project's rules and engineering standards).

**Output:** Present consistency findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 5: Redundancy Review

Skip if `--dimension` is set to something other than `redundancy`.

Load the Redundancy section from `references/review_dimensions.md`. Check responsibility redundancy against other specs (full overlap, partial overlap, or intentional duplication with justification), data redundancy (tables that already exist in other specs, data that could be read from an existing service's interface), interface redundancy (endpoints that duplicate existing service exports), and codebase redundancy (capabilities, data models, integrations, and utilities that already exist as working code, including file path and function/class name). For each codebase redundancy finding, recommend one of: Reuse, Extend, Replace, or Justify.

**Output:** Present redundancy findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 6: Functional Regression Review

Skip if `--dimension` is set to something other than `regression`.

Load the Functional Regression section from `references/review_dimensions.md`.

This step evaluates whether implementing the new spec would break or degrade existing functionality. Check behavioral contract violations (modified API contracts, changed semantics, altered defaults/nullability), data flow disruption (new service inserting into existing call chains, changed ordering guarantees, conflicts on shared resources), migration and cutover risks (rolling-deploy safety, coexistence strategy, deprecation timelines), performance regression (latency added to hot paths, increased load on shared infrastructure, fan-out patterns, SLA feasibility given dependency latency), and backward compatibility (additive-only API changes, versioning strategy for breaking changes, feature flags for risky changes).

**Output:** Present functional regression findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 7: Operational Readiness Review

Skip if `--dimension` is set to something other than `operational`.

Load the Operational Readiness section from `references/review_dimensions.md`. Check observability (structured logging, health checks, metrics, alert thresholds, distributed tracing), deployment (deployment strategy, migration handling, rollback plan, feature flags), incident response (graceful degradation, circuit breakers, retry policies with backoff, timeout values, escalation path), and data operations (backup and recovery, schema migration safety, archival, connection pooling).

**Output:** Present operational readiness findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 8: Clarity and Feasibility Review

Skip dimensions not selected by `--dimension`.

Load the Clarity and Feasibility sections from `references/review_dimensions.md`. For clarity, flag vague terms (fast, secure, scalable, robust), unquantified values (timeouts, limits, thresholds without numbers), ambiguous conditionals, untestable EARS criteria, and contradictions between sections. For feasibility, check for circular dependencies, single points of failure, whether performance targets are achievable given the design, potential race conditions, realistic MVP scope, and whether implementation phases are ordered by dependency and risk.

**Output:** Present clarity and feasibility findings. Ask if the user wants to proceed to the final report.

**If `--no-gates` is set, skip the pause and proceed directly to compiling the report. Otherwise WAIT for user response.**

---

### Step 9: Compile and Present Review Report

Compile all findings into a structured report. Apply the `--severity-threshold` filter if set.

Load `references/report_template.md` for the full report format and compile the report following that structure.

#### Present the Report

Present the full report in chat. If `--output PATH` was specified, also write it to the file.

After presenting:
"Review complete. Would you like to:
1. Discuss any specific findings in detail?
2. Get fix suggestions for the critical/high findings?
3. Re-review after making changes?"

**WAIT for user response.**

---

### Step 10: Fix Suggestions (Optional, On Request)

If the user asks to discuss findings or get fix suggestions:

For each finding the user asks about, provide:

1. **Context**: Why this matters (e.g., "Without tenant isolation on this table, a single SQL injection or authorization bypass would expose every tenant's data")
2. **Fix**: The specific change to make in the spec, shown as a before/after diff:

```
### [Section Name] (fix for finding #N)

**Current:**
[Current spec text]

**Proposed:**
[Updated spec text with the fix applied]

**Why:** [Brief rationale]
```

3. **Verification**: How to confirm the fix is correct (e.g., "After adding `org_id` to the table, verify that every query in Key Data Flows includes `WHERE org_id = ?`")

If the user approves the fixes, offer to apply them: "Shall I update the spec files with these fixes? I'll show the full list of changes before writing."

**WAIT for explicit approval before writing any files.**

After writing, suggest re-running the review: "Files updated. Run `/spec-reviewer {path}` again to verify all findings are resolved."

---

## Edge Cases

### No Companion Spec
If reviewing an RFC with no companion PRD (or vice versa), skip the internal consistency checks between PRD and RFC. Note in the report: "Companion PRD/RFC not found. Internal consistency checks between PRD and RFC were skipped."

### No Other Specs Exist
If the target spec is the only spec in the directory, skip cross-spec consistency checks. Note: "No other specs found for cross-reference. Cross-spec consistency checks were skipped."

### No Constitution or Invariants
If no constitution or global invariants documents exist, skip compliance checks. Note: "No project constitution or engineering standards found. Compliance checks were skipped."

### Very Large Spec Directory
If the `.specs/` directory contains more than 20 spec files, prioritize loading specs that are most likely to interact with the target service:
1. Specs referenced in the target spec's Dependencies section
2. Specs that own data the target spec references
3. Specs in adjacent domains
Summarize which specs were loaded and which were skipped.

### Spec is a Draft vs Approved
If the spec status is "Draft", be more lenient on Low/Info findings (they're expected in drafts). If "Approved", flag every finding since the spec was presumably reviewed already.

### User Wants Only Critical/High Findings
If `--severity-threshold high` is set, only include Critical and High findings in the report. Still compute counts for all severities in the summary table.

### Review After Fixes
If the user re-runs the review after making changes, compare with the previous review if possible and note which findings were resolved: "3 of 5 high findings from the previous review have been resolved. 2 remain."

### Spec Has No Security Surface
If the spec describes a pure internal computation service with no external API, no user input, and no data storage, note: "This service has minimal security surface. Security review focused on dependency trust and data flow integrity."

### Multiple Services in One Review
If the user provides a path containing specs for multiple services, review each service independently and add a cross-service consistency section to the report.

---

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
