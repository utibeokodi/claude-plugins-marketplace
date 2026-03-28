---
name: spec-reviewer
description: This skill should be used when reviewing PRD or RFC specification documents for security vulnerabilities, cross-spec security regression, completeness gaps, cross-spec consistency, redundancy against existing specs and codebase, functional regression risks, operational readiness, clarity, and feasibility issues. Triggers on requests like "review this spec", "audit the billing RFC", "check the notification PRD for security issues", "review .specs/billing-service/02-RFC-billing-service.md", "/spec-reviewer .specs/billing-service/", "/spec-reviewer --security-only .specs/auth/01-RFC-auth.md", "is this spec ready for implementation?", "threat model the payment service spec", "what's missing from this RFC?", "does this spec duplicate anything?", "will this break existing services?", "check for redundancy", or when users want to validate specs before implementation. Supports --security-only, --dimension, --severity-threshold, --no-gates, and --output flags.
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

Load the Security section from `references/review_dimensions.md` and evaluate the spec against every applicable checklist item.

#### 2a. Authentication and Authorization Audit

For every endpoint, function, or event handler in the spec:
- Is authentication required? If not, is the omission justified?
- Is authorization checked? (role, permission, ownership)
- Can a user access resources belonging to another user or tenant?

Flag any endpoint without explicit auth specification as a finding.

#### 2b. Data Protection Audit

For every data field in the data model:
- Classify sensitivity (PII, PHI, financial, credential, public)
- Check if encryption at rest is specified for sensitive fields
- Check if the field appears in any log output or error response
- Check if the field is exposed in API responses that it should not be

#### 2c. Input Validation and Injection Audit

For every input surface (API params, webhook payloads, file uploads, event payloads):
- Is validation specified? (type, format, length, range)
- Are parameterized queries or ORM used for database access?
- Is user-supplied content sanitized before output?

#### 2d. Secrets Management Audit

Scan the entire spec for:
- Hardcoded values that look like credentials or keys
- Environment variables that should be marked as secret but are not
- Missing secret rotation strategy

#### 2e. API Security Audit

For every external-facing endpoint:
- Rate limiting specified?
- Request size limits?
- CORS policy?
- Webhook signature validation?
- Idempotency for mutating operations?

#### 2f. Multi-Tenancy Audit

If the service is multi-tenant:
- Do all queries filter by tenant ID?
- Are there any data flows where tenant isolation could be bypassed?
- Are admin/cross-tenant operations explicitly flagged?

#### 2g. Threat Model (STRIDE)

Apply the STRIDE framework to the spec's architecture:
- **Spoofing**: Evaluate authentication mechanisms
- **Tampering**: Evaluate data integrity controls
- **Repudiation**: Evaluate audit logging
- **Information Disclosure**: Evaluate data exposure paths
- **Denial of Service**: Evaluate resource bounds and timeouts
- **Elevation of Privilege**: Evaluate authorization boundaries

For each STRIDE category, produce findings or note "No issues identified."

#### 2h. Cross-Spec Security Regression

This is the most critical security sub-step. Evaluate how the new spec interacts with existing specs and the existing codebase to identify security vulnerabilities that only emerge from the combination.

Load the "Cross-Spec Security Regression" section from `references/review_dimensions.md` and check every item:

1. **Trust boundary erosion**: Does the new service accept pre-validated data from another service and use it unsafely? Does it expose an internal service's data through a weaker interface?
2. **Privilege escalation paths**: Does the new service create a chain where low-privilege calls escalate to high-privilege operations? Does it grant broader permissions than existing services for the same resources?
3. **Data exposure amplification**: Does the new service aggregate, cache, or replicate sensitive data from multiple existing services, creating a higher-value target? Does it log or emit data that existing services protect?
4. **Attack surface expansion**: Does the new service expose new endpoints that proxy to internal services? Does it add weaker auth methods?
5. **Tenant isolation regression**: Does the new service maintain tenant isolation when interacting with existing services? Does it create cross-tenant data flows that did not exist before?

For each interaction between the new spec and an existing spec, document the trust boundary and check both directions. A finding in this section is always High or Critical severity.

**Output:** Present all security findings in a table (see Step 9 for format). Ask the user if they want to proceed to the next dimension or discuss any findings.

**If `--no-gates` is set, skip the pause and proceed directly to the next dimension. Otherwise WAIT for user response.**

---

### Step 3: Completeness Review

Skip if `--dimension` is set to something other than `completeness`.

Load the Completeness section from `references/review_dimensions.md`.

#### 3a. PRD Completeness

For each PRD being reviewed:

1. **Goals**: Are they measurable? Can you objectively determine if the goal was met?
2. **Non-Goals**: Are they specific enough to prevent scope creep?
3. **Functional Requirements**:
   - Does every requirement have EARS criteria?
   - Do criteria cover the happy path?
   - Do criteria cover error/failure paths?
   - Do criteria cover edge cases? (empty inputs, boundary values, concurrent access)
4. **NFRs**: Are they quantified? (e.g., "p95 < 300ms" not "fast")
5. **External Integrations**: Is there enough detail to implement each integration?
6. **Constraints**: Are they traceable to a source?
7. **Open Questions**: Are any critical enough to block implementation?

#### 3b. RFC Completeness

For each RFC being reviewed:

1. **Traceability**: Does every PRD requirement have a corresponding RFC section?
2. **Public Interface**: Are all params, return types, and error types defined?
3. **Data Model**: Does it cover all entities mentioned in the PRD?
4. **Indexes**: Are they justified by query patterns in the data flows?
5. **Data Flows**: Are all significant paths documented (not just happy path)?
6. **Error Handling**: Does the error table cover all failure modes from the data flows?
7. **Environment Variables**: Are all config values listed?
8. **Key Invariants**: Are they stated with MUST/MUST NOT language?
9. **Dependencies**: Are both upstream and downstream listed?
10. **Implementation Phases**: Are they independently deployable?
11. **Testing**: Are requirements specific to this service (not generic)?

#### 3c. Missing Scenarios

Check for common blind spots:
- Deployment and migration behavior
- Partial system failure handling
- External dependency unavailability
- Behavior at scale boundaries
- Concurrent request handling
- Data migration for schema changes

**Output:** Present completeness findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 4: Consistency Review

Skip if `--dimension` is set to something other than `consistency`.

Load the Consistency section from `references/review_dimensions.md`.

#### 4a. Internal Consistency (PRD to RFC)

If both a PRD and RFC exist for the service:

1. Map every PRD functional requirement to an RFC section. Flag any requirement without a corresponding implementation.
2. Verify API response shapes match data model fields.
3. Verify error codes referenced in data flows match the error handling table.
4. Check naming conventions throughout: field names, endpoint paths, event names.

#### 4b. Cross-Spec Dangling References

Using the cross-spec map built in Step 1c, check references in both directions:

**New spec references that don't resolve:**
1. For each function/endpoint the new spec calls on another service (in Dependencies, Data Flows, or Public Interface sections), verify that the target service's spec actually exports that function/endpoint with a matching signature
2. For each event the new spec consumes, verify that some existing spec publishes it
3. For each external entity reference (table owned by another service), verify the owning service's spec defines that table
4. For each downstream dependency listed, verify the target service exists (has a spec or codebase implementation)

**Existing specs that reference the new service but the new spec doesn't fulfill:**
1. Scan all existing specs' Dependencies sections for references to the new service's name or domain
2. For each function/endpoint existing specs expect from the new service, verify the new spec exports it in its Public Interface
3. For each event existing specs consume that the new service should publish (based on its responsibilities), verify the new spec defines that event
4. For each table existing specs reference as owned by the new service, verify the new spec's data model defines it

A dangling reference in a data flow step is Critical (implementation will fail at that step). An unresolved dependency is High. An unmatched event is Medium.

#### 4c. Cross-Spec Consistency

Using the cross-spec map built in Step 1c:

1. **Data ownership conflicts**: Does this spec define tables/collections that another service already owns?
2. **Interface duplication**: Does this spec export functions that overlap with another service's public interface?
3. **External service wrapping**: Does this spec directly call an external service that another module wraps exclusively?
4. **Dependency direction conflicts**: Does this spec declare dependencies that contradict what other specs say?
5. **Convention mismatches**: Do error formats, ID conventions, and auth patterns match the established project patterns?

#### 4d. Constitution and Invariants Compliance

If a constitution or global invariants document exists:

1. Check every design decision against the constitution rules
2. Check every technical choice against the global engineering standards
3. Flag any deviation, even if it seems reasonable (the author should explicitly acknowledge deviations)

**Output:** Present consistency findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 5: Redundancy Review

Skip if `--dimension` is set to something other than `redundancy`.

Load the Redundancy section from `references/review_dimensions.md`.

#### 5a. Responsibility Redundancy (Spec vs Spec)

For each responsibility listed in the new spec's RFC:

1. Check whether any existing spec already claims that responsibility
2. Check whether the new service's responsibilities could be added as features to an existing service instead of creating a new service
3. Flag any parallel path for an operation that already has a defined path through existing services

For each overlap, classify:
- **Full overlap**: The new service does exactly what an existing service does (Critical)
- **Partial overlap**: Some responsibilities overlap, some are new (High if core overlap, Medium if peripheral)
- **Intentional duplication**: The spec acknowledges the overlap and provides justification (Info)

#### 5b. Data Redundancy (Spec vs Spec)

For each table/collection in the new spec's data model:

1. Check whether an existing spec already owns a table with the same name or the same data
2. Check whether the new spec stores data that could be read from an existing service's public interface instead
3. If data duplication is intentional (caching, materialized views), verify that a sync/invalidation strategy is defined

#### 5c. Interface Redundancy (Spec vs Spec)

For each function/endpoint in the new spec's public interface:

1. Check whether an existing spec exports a function or endpoint that returns the same data or performs the same action
2. If the new interface is a convenience wrapper (BFF pattern, aggregation), verify it is documented as such and not as a new capability

#### 5d. Codebase Redundancy (Spec vs Existing Code)

Using the implementation map built in Step 1c:

1. **Existing implementations**: Flag every capability in the spec that already exists as working code. Include the file path and function/class name.
2. **Existing data models**: Flag every table or schema in the spec that already exists in migrations or ORM definitions. Include the file path.
3. **Existing integrations**: Flag every external service wrapper in the spec that already exists in the codebase. Include the file path.
4. **Existing utilities**: Flag every shared utility (validation, error handling, auth middleware) in the spec that already exists. Include the file path.

For each codebase redundancy finding, recommend one of:
- **Reuse**: Import the existing code instead of reimplementing
- **Extend**: Add the new capability to the existing module
- **Replace**: The spec intentionally supersedes the existing code (requires a migration plan)
- **Justify**: The duplication is intentional for a specific reason (e.g., isolation, different deployment target)

**Output:** Present redundancy findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 6: Functional Regression Review

Skip if `--dimension` is set to something other than `regression`.

Load the Functional Regression section from `references/review_dimensions.md`.

This step evaluates whether implementing the new spec would break or degrade existing functionality.

#### 6a. Behavioral Contract Violations

For each API endpoint, function signature, event schema, or data contract defined in the new spec:

1. Check if it modifies an existing contract (adds required fields, changes types, renames fields, removes fields)
2. Check if it changes the semantics of a status code, error response, or state value
3. Check if it changes default values or nullability of shared fields
4. For each violation, identify which existing consumers would break and how

#### 6b. Data Flow Disruption

For each data flow described in the new spec:

1. Check if the new service inserts itself into an existing call chain (A calls B becomes A calls New calls B)
2. Check if this introduces a new failure mode into a previously stable path
3. Check if the new service changes ordering guarantees for events or queues
4. Check if the new service writes to a shared resource (database, cache, queue) that existing services also write to, creating conflict potential

#### 6c. Migration and Cutover Risks

1. Does the new spec require a data migration? If so, can existing services continue operating during the migration?
2. Does the new spec require simultaneous deployment of multiple services? (big-bang risk)
3. Is there a transition period where old and new behavior coexist? Is the coexistence strategy defined?
4. Does the new spec deprecate existing endpoints or functions? Is the deprecation timeline and migration path defined?

#### 6d. Performance Regression

1. Does the new service add latency to an existing hot path? (extra hop, new middleware, new validation)
2. Does the new service increase load on shared infrastructure? (database, cache, queue, external APIs)
3. Does the new service introduce fan-out or N+1 patterns that affect shared resources?
4. Check the new spec's SLA guarantees against its dependencies: can it meet its stated targets given the latency of services it depends on?

#### 6e. Backward Compatibility

1. Are all API changes additive? (new optional fields, new endpoints, new event types)
2. If breaking changes exist, is a versioning strategy defined? (v1/v2 coexistence, sunset timeline)
3. Are database schema changes compatible with currently deployed code? (rolling deploy safety)
4. Are feature flags defined for risky behavioral changes?

**Output:** Present functional regression findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 7: Operational Readiness Review

Skip if `--dimension` is set to something other than `operational`.

Load the Operational Readiness section from `references/review_dimensions.md`.

#### 5a. Observability

- Is structured logging specified?
- Are health check endpoints defined?
- Are key metrics identified?
- Are alert thresholds defined for critical operations?
- Is distributed tracing addressed?

#### 5b. Deployment

- Is the deployment strategy defined?
- Are database migrations addressed?
- Is backward compatibility considered for API changes?
- Is a rollback plan defined?
- Are feature flags considered for risky features?

#### 5c. Incident Response

- Is graceful degradation defined for dependency failures?
- Are circuit breakers or fallbacks specified?
- Are retry policies defined with backoff?
- Are timeout values specified for external calls?
- Is there an escalation path?

#### 5d. Data Operations

- Is backup and recovery addressed?
- Are data migrations addressed for schema changes?
- Is data archival specified?
- Are connection pooling and limits considered?

**Output:** Present operational readiness findings. Ask if the user wants to proceed.

**If `--no-gates` is set, skip the pause and proceed directly. Otherwise WAIT for user response.**

---

### Step 8: Clarity and Feasibility Review

Skip dimensions not selected by `--dimension`.

#### 6a. Clarity

- Flag vague terms: "fast", "secure", "scalable", "robust", "appropriate", "as needed"
- Flag unquantified values: timeouts, limits, thresholds, TTLs without numbers
- Flag ambiguous conditionals: "if applicable" without defining when it applies
- Check that every EARS criterion is testable as written
- Identify contradictions between sections

#### 6b. Feasibility

- Are there circular dependencies in the design?
- Are there single points of failure?
- Can the system meet stated performance targets given the design?
- Are there potential race conditions in the data flows?
- Is the MVP scope realistic for the number of external integrations and data flows?
- Are implementation phases ordered by dependency and risk?

**Output:** Present clarity and feasibility findings. Ask if the user wants to proceed to the final report.

**If `--no-gates` is set, skip the pause and proceed directly to compiling the report. Otherwise WAIT for user response.**

---

### Step 9: Compile and Present Review Report

Compile all findings into a structured report. Apply the `--severity-threshold` filter if set.

#### Report Format

```markdown
# Spec Review: {Service Name}

**Reviewed:** {list of files reviewed}
**Date:** {today's date}
**Dimensions:** {all / specific dimension}
**Reviewer:** Claude (spec-reviewer)

## Summary

| Dimension | Critical | High | Medium | Low | Info |
|-----------|----------|------|--------|-----|------|
| Security | N | N | N | N | N |
| Completeness | N | N | N | N | N |
| Consistency | N | N | N | N | N |
| Redundancy | N | N | N | N | N |
| Functional Regression | N | N | N | N | N |
| Operational Readiness | N | N | N | N | N |
| Clarity | N | N | N | N | N |
| Feasibility | N | N | N | N | N |
| **Total** | **N** | **N** | **N** | **N** | **N** |

## Verdict

{One of:}
- **BLOCKED**: N critical findings must be resolved before implementation
- **CONDITIONAL**: No critical findings, but N high findings should be addressed first
- **APPROVED WITH NOTES**: No critical or high findings; medium/low items can be addressed during implementation
- **APPROVED**: No significant findings

## Findings

### Critical

| # | Dimension | Section | Finding | Recommendation |
|---|-----------|---------|---------|----------------|
| 1 | Security | Data Model | Tenant isolation not enforced: `invoices` table has no `org_id` column, allowing cross-tenant data access | Add `org_id TEXT NOT NULL` column with foreign key constraint and add to every query's WHERE clause |

### High

| # | Dimension | Section | Finding | Recommendation |
|---|-----------|---------|---------|----------------|
| 2 | Completeness | Error Handling | No error defined for external payment provider timeout; data flow step 3 references Stripe but error table has no `ExternalServiceError` | Add `ExternalServiceError (502)` to error table with retry guidance for consumers |

### Medium

| # | Dimension | Section | Finding | Recommendation |
|---|-----------|---------|---------|----------------|
| 3 | Clarity | NFRs | Performance requirement says "low latency" without specifying a target | Replace with measurable target: "p95 < 300ms for read operations, p95 < 500ms for writes" |

### Low

| # | Dimension | Section | Finding | Recommendation |
|---|-----------|---------|---------|----------------|
| 4 | Consistency | Naming | RFC uses `userId` but PRD uses `user_id` in EARS criteria | Standardize on one convention (recommend `user_id` to match database schema) |

### Info

| # | Dimension | Section | Finding | Recommendation |
|---|-----------|---------|---------|----------------|
| 5 | Feasibility | Implementation Phases | Phase 1 includes 4 external integrations which may be ambitious for a single phase | Consider splitting external integrations across Phase 1 (core provider) and Phase 2 (secondary providers) |

## Security Threat Summary

{Only included when security dimension is reviewed}

| STRIDE Category | Status | Notes |
|-----------------|--------|-------|
| Spoofing | {PASS / RISK} | {Brief note} |
| Tampering | {PASS / RISK} | {Brief note} |
| Repudiation | {PASS / RISK} | {Brief note} |
| Information Disclosure | {PASS / RISK} | {Brief note} |
| Denial of Service | {PASS / RISK} | {Brief note} |
| Elevation of Privilege | {PASS / RISK} | {Brief note} |

## Cross-Spec Impact

{Only included when consistency dimension is reviewed and other specs exist}

| Other Spec | Issue | Required Action |
|------------|-------|-----------------|
| {spec path} | {what is inconsistent} | {what needs to change} |

## Redundancy Map

{Only included when redundancy dimension is reviewed}

| New Spec Element | Existing Duplicate | Location | Recommendation |
|-----------------|-------------------|----------|----------------|
| {table/function/endpoint} | {what already exists} | {spec path or codebase file path} | Reuse / Extend / Replace / Justify |

## Regression Risk Assessment

{Only included when regression dimension is reviewed}

| Existing Component | Risk Type | Impact | Mitigation Required |
|-------------------|-----------|--------|---------------------|
| {service/endpoint/flow} | {contract violation / data flow disruption / performance / migration} | {what breaks and for whom} | {versioning plan / feature flag / migration strategy / rollback plan} |

## Next Steps

{Tailored based on verdict:}
- BLOCKED: "Resolve the N critical findings before proceeding. Run `/spec-reviewer` again after fixes."
- CONDITIONAL: "Address the high-severity findings, then proceed to implementation. Medium/low items can be tracked as tech debt."
- APPROVED WITH NOTES: "Proceed to implementation. Consider addressing medium findings during the relevant implementation phase."
- APPROVED: "Spec is ready for implementation. Proceed to `/rfc-to-jira {RFC path}` to create tickets."
```

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
