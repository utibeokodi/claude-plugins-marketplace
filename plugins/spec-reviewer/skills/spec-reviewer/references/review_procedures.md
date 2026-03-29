# Review Procedures: Step-by-Step Sub-Instructions

This file contains the detailed procedural text for each review dimension (Steps 2-8). Load this alongside `review_dimensions.md` (which has the checklists) when executing each step.

---

## Step 2: Security Review — Procedural Sub-Steps

### 2a. Authentication and Authorization Audit

For every endpoint, function, or event handler in the spec:
- Is authentication required? If not, is the omission justified?
- Is authorization checked? (role, permission, ownership)
- Can a user access resources belonging to another user or tenant?

Flag any endpoint without explicit auth specification as a finding.

### 2b. Data Protection Audit

For every data field in the data model:
- Classify sensitivity (PII, PHI, financial, credential, public)
- Check if encryption at rest is specified for sensitive fields
- Check if the field appears in any log output or error response
- Check if the field is exposed in API responses that it should not be

### 2c. Input Validation and Injection Audit

For every input surface (API params, webhook payloads, file uploads, event payloads):
- Is validation specified? (type, format, length, range)
- Are parameterized queries or ORM used for database access?
- Is user-supplied content sanitized before output?

### 2d. Secrets Management Audit

Scan the entire spec for:
- Hardcoded values that look like credentials or keys
- Environment variables that should be marked as secret but are not
- Missing secret rotation strategy

### 2e. API Security Audit

For every external-facing endpoint:
- Rate limiting specified?
- Request size limits?
- CORS policy?
- Webhook signature validation?
- Idempotency for mutating operations?

### 2f. Multi-Tenancy Audit

If the service is multi-tenant:
- Do all queries filter by tenant ID?
- Are there any data flows where tenant isolation could be bypassed?
- Are admin/cross-tenant operations explicitly flagged?

### 2g. Threat Model (STRIDE)

Apply the STRIDE framework to the spec's architecture:
- **Spoofing**: Evaluate authentication mechanisms
- **Tampering**: Evaluate data integrity controls
- **Repudiation**: Evaluate audit logging
- **Information Disclosure**: Evaluate data exposure paths
- **Denial of Service**: Evaluate resource bounds and timeouts
- **Elevation of Privilege**: Evaluate authorization boundaries

For each STRIDE category, produce findings or note "No issues identified."

### 2h. Cross-Spec Security Regression

This is the most critical security sub-step. Evaluate how the new spec interacts with existing specs and the existing codebase to identify security vulnerabilities that only emerge from the combination.

Load the "Cross-Spec Security Regression" section from `review_dimensions.md` and check every item:

1. **Trust boundary erosion**: Does the new service accept pre-validated data from another service and use it unsafely? Does it expose an internal service's data through a weaker interface?
2. **Privilege escalation paths**: Does the new service create a chain where low-privilege calls escalate to high-privilege operations? Does it grant broader permissions than existing services for the same resources?
3. **Data exposure amplification**: Does the new service aggregate, cache, or replicate sensitive data from multiple existing services, creating a higher-value target? Does it log or emit data that existing services protect?
4. **Attack surface expansion**: Does the new service expose new endpoints that proxy to internal services? Does it add weaker auth methods?
5. **Tenant isolation regression**: Does the new service maintain tenant isolation when interacting with existing services? Does it create cross-tenant data flows that did not exist before?

For each interaction between the new spec and an existing spec, document the trust boundary and check both directions. A finding in this section is always High or Critical severity.

---

## Step 3: Completeness Review — Procedural Sub-Steps

### 3a. PRD Completeness

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

### 3b. RFC Completeness

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

### 3c. Missing Scenarios

Check for common blind spots:
- Deployment and migration behavior
- Partial system failure handling
- External dependency unavailability
- Behavior at scale boundaries
- Concurrent request handling
- Data migration for schema changes

---

## Step 4: Consistency Review — Procedural Sub-Steps

### 4a. Internal Consistency (PRD to RFC)

If both a PRD and RFC exist for the service:

1. Map every PRD functional requirement to an RFC section. Flag any requirement without a corresponding implementation.
2. Verify API response shapes match data model fields.
3. Verify error codes referenced in data flows match the error handling table.
4. Check naming conventions throughout: field names, endpoint paths, event names.

### 4b. Cross-Spec Dangling References

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

### 4c. Cross-Spec Consistency

Using the cross-spec map built in Step 1c:

1. **Data ownership conflicts**: Does this spec define tables/collections that another service already owns?
2. **Interface duplication**: Does this spec export functions that overlap with another service's public interface?
3. **External service wrapping**: Does this spec directly call an external service that another module wraps exclusively?
4. **Dependency direction conflicts**: Does this spec declare dependencies that contradict what other specs say?
5. **Convention mismatches**: Do error formats, ID conventions, and auth patterns match the established project patterns?

### 4d. Constitution and Invariants Compliance

If a constitution or global invariants document exists:

1. Check every design decision against the constitution rules
2. Check every technical choice against the global engineering standards
3. Flag any deviation, even if it seems reasonable (the author should explicitly acknowledge deviations)

---

## Step 5: Redundancy Review — Procedural Sub-Steps

### 5a. Responsibility Redundancy (Spec vs Spec)

For each responsibility listed in the new spec's RFC:

1. Check whether any existing spec already claims that responsibility
2. Check whether the new service's responsibilities could be added as features to an existing service instead of creating a new service
3. Flag any parallel path for an operation that already has a defined path through existing services

For each overlap, classify:
- **Full overlap**: The new service does exactly what an existing service does (Critical)
- **Partial overlap**: Some responsibilities overlap, some are new (High if core overlap, Medium if peripheral)
- **Intentional duplication**: The spec acknowledges the overlap and provides justification (Info)

### 5b. Data Redundancy (Spec vs Spec)

For each table/collection in the new spec's data model:

1. Check whether an existing spec already owns a table with the same name or the same data
2. Check whether the new spec stores data that could be read from an existing service's public interface instead
3. If data duplication is intentional (caching, materialized views), verify that a sync/invalidation strategy is defined

### 5c. Interface Redundancy (Spec vs Spec)

For each function/endpoint in the new spec's public interface:

1. Check whether an existing spec exports a function or endpoint that returns the same data or performs the same action
2. If the new interface is a convenience wrapper (BFF pattern, aggregation), verify it is documented as such and not as a new capability

### 5d. Codebase Redundancy (Spec vs Existing Code)

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

---

## Step 6: Functional Regression Review — Procedural Sub-Steps

### 6a. Behavioral Contract Violations

For each API endpoint, function signature, event schema, or data contract defined in the new spec:

1. Check if it modifies an existing contract (adds required fields, changes types, renames fields, removes fields)
2. Check if it changes the semantics of a status code, error response, or state value
3. Check if it changes default values or nullability of shared fields
4. For each violation, identify which existing consumers would break and how

### 6b. Data Flow Disruption

For each data flow described in the new spec:

1. Check if the new service inserts itself into an existing call chain (A calls B becomes A calls New calls B)
2. Check if this introduces a new failure mode into a previously stable path
3. Check if the new service changes ordering guarantees for events or queues
4. Check if the new service writes to a shared resource (database, cache, queue) that existing services also write to, creating conflict potential

### 6c. Migration and Cutover Risks

1. Does the new spec require a data migration? If so, can existing services continue operating during the migration?
2. Does the new spec require simultaneous deployment of multiple services? (big-bang risk)
3. Is there a transition period where old and new behavior coexist? Is the coexistence strategy defined?
4. Does the new spec deprecate existing endpoints or functions? Is the deprecation timeline and migration path defined?

### 6d. Performance Regression

1. Does the new service add latency to an existing hot path? (extra hop, new middleware, new validation)
2. Does the new service increase load on shared infrastructure? (database, cache, queue, external APIs)
3. Does the new service introduce fan-out or N+1 patterns that affect shared resources?
4. Check the new spec's SLA guarantees against its dependencies: can it meet its stated targets given the latency of services it depends on?

### 6e. Backward Compatibility

1. Are all API changes additive? (new optional fields, new endpoints, new event types)
2. If breaking changes exist, is a versioning strategy defined? (v1/v2 coexistence, sunset timeline)
3. Are database schema changes compatible with currently deployed code? (rolling deploy safety)
4. Are feature flags defined for risky behavioral changes?

---

## Step 7: Operational Readiness Review — Procedural Sub-Steps

### 7a. Observability

- Is structured logging specified?
- Are health check endpoints defined?
- Are key metrics identified?
- Are alert thresholds defined for critical operations?
- Is distributed tracing addressed?

### 7b. Deployment

- Is the deployment strategy defined?
- Are database migrations addressed?
- Is backward compatibility considered for API changes?
- Is a rollback plan defined?
- Are feature flags considered for risky features?

### 7c. Incident Response

- Is graceful degradation defined for dependency failures?
- Are circuit breakers or fallbacks specified?
- Are retry policies defined with backoff?
- Are timeout values specified for external calls?
- Is there an escalation path?

### 7d. Data Operations

- Is backup and recovery addressed?
- Are data migrations addressed for schema changes?
- Is data archival specified?
- Are connection pooling and limits considered?

---

## Step 8: Clarity and Feasibility Review — Procedural Sub-Steps

### 8a. Clarity

- Flag vague terms: "fast", "secure", "scalable", "robust", "appropriate", "as needed"
- Flag unquantified values: timeouts, limits, thresholds, TTLs without numbers
- Flag ambiguous conditionals: "if applicable" without defining when it applies
- Check that every EARS criterion is testable as written
- Identify contradictions between sections

### 8b. Feasibility

- Are there circular dependencies in the design?
- Are there single points of failure?
- Can the system meet stated performance targets given the design?
- Are there potential race conditions in the data flows?
- Is the MVP scope realistic for the number of external integrations and data flows?
- Are implementation phases ordered by dependency and risk?
