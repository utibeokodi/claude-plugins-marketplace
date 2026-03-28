# Review Dimensions

Each spec is reviewed across eight dimensions. Every finding is assigned a severity (Critical, High, Medium, Low, Info) and a category.

---

## 1. Security

Evaluate the spec against common security risks and best practices.

### Authentication and Authorization
- Is the auth mechanism specified? (JWT, API keys, OAuth, session)
- Are authorization checks defined for every endpoint/function?
- Is there role-based or attribute-based access control?
- Are admin/privileged operations separated from user operations?
- Is token validation (expiry, signature, audience) specified?

### Data Protection
- Is data classified by sensitivity? (PII, PHI, financial, credentials)
- Is encryption at rest specified for sensitive data?
- Is encryption in transit enforced? (TLS, mTLS)
- Are data retention and deletion policies defined?
- Is PII excluded from logs, error messages, and URLs?

### Input Validation and Injection
- Are all external inputs validated? (API params, webhook payloads, file uploads)
- Are SQL/NoSQL injection vectors addressed? (parameterized queries, ORM usage)
- Are XSS vectors addressed for any user-facing output?
- Are file upload restrictions specified? (type, size, content validation)
- Is deserialization of untrusted data avoided or controlled?

### Secrets Management
- Are all secrets sourced from environment variables?
- Are there any hardcoded credentials, keys, or tokens?
- Is secret rotation addressed?
- Are secrets excluded from logs and error responses?

### API Security
- Is rate limiting defined?
- Are CORS policies specified?
- Is request size limiting addressed?
- Are webhook signatures validated?
- Is idempotency specified for mutating operations?

### Multi-Tenancy
- Is tenant isolation enforced at the data layer? (row-level, schema-level)
- Do ALL queries filter by tenant ID?
- Can Tenant A access Tenant B's data through any path?
- Are tenant-scoped indexes defined?
- Are cross-tenant operations explicitly flagged and controlled?

### OWASP Top 10 Alignment
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable and Outdated Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Security Logging and Monitoring Failures
- A10: Server-Side Request Forgery (SSRF)

### Threat Modeling (STRIDE)
- **Spoofing**: Can an attacker impersonate a user or service?
- **Tampering**: Can data be modified in transit or at rest without detection?
- **Repudiation**: Are actions auditable? Can a user deny performing an action?
- **Information Disclosure**: Can sensitive data leak through errors, logs, or side channels?
- **Denial of Service**: Are there unbounded operations, missing timeouts, or resource exhaustion vectors?
- **Elevation of Privilege**: Can a user escalate from one role to another?

### Cross-Spec Security Regression

The new spec must not introduce security vulnerabilities when combined with existing specs and the running system. Evaluate the *interaction* between the new spec and every existing spec:

#### Trust Boundary Erosion
- Does the new service accept data from another service without re-validating it? (e.g., Service A validates input, passes it to the new service, but the new service trusts it blindly and uses it in a SQL query)
- Does the new service expose an internal-only service's data through a less-protected interface? (e.g., existing service has strict auth, new service reads its data and serves it through a public endpoint with weaker auth)
- Does the new service create a bypass route around an existing service's authorization checks? (e.g., existing service enforces RBAC, new service accesses the same data directly without RBAC)

#### Privilege Escalation Paths
- Does the new service grant broader permissions than any existing service that serves the same users? (e.g., existing service allows read-only, new service allows read-write to the same resource through a different path)
- Does the new service create a chain where low-privilege calls can escalate to high-privilege operations? (e.g., User calls New Service (no auth check) which calls Existing Service (service-to-service auth, bypasses user-level RBAC))
- Does the new service introduce service-to-service credentials that, if compromised, would expose more data than the existing attack surface?

#### Data Exposure Amplification
- Does the new service aggregate data from multiple existing services, creating a single point where a breach exposes more data than any individual service breach would?
- Does the new service cache or replicate sensitive data from existing services, increasing the number of places that data can be stolen from?
- Does the new service log, emit metrics, or return error messages that include sensitive data from existing services?
- Does the new service weaken data retention or deletion guarantees established by existing specs? (e.g., existing service deletes user data after 30 days, new service caches it indefinitely)

#### Attack Surface Expansion
- Does the new service expose new external endpoints that accept user input and forward it to existing internal services? (proxy/gateway pattern risk)
- Does the new service introduce a new webhook receiver that an attacker could target to trigger actions in existing services?
- Does the new service add a new authentication method that is weaker than what existing services require?
- Does the new service introduce file upload, URL fetching, or deserialization capabilities that could be exploited to attack existing services (SSRF, path traversal, RCE)?

#### Tenant Isolation Regression
- If existing services enforce tenant isolation, does the new service maintain the same isolation guarantees when it reads from or writes to those services?
- Does the new service create cross-tenant data flows that did not exist before? (e.g., analytics aggregation, shared caching, cross-tenant search)
- Does the new service use a shared resource (cache, queue, storage bucket) in a way that could leak data between tenants?

---

## 2. Completeness

Evaluate whether the spec covers all necessary aspects for implementation.

### PRD Completeness
- Are goals measurable and specific?
- Are non-goals explicitly stated?
- Are all functional requirements accompanied by EARS criteria?
- Do EARS criteria cover happy paths, error paths, AND edge cases?
- Are NFRs quantified (not vague like "fast" or "secure")?
- Are external integrations listed with enough detail to implement?
- Are constraints traceable to a source (constitution, legal, business)?
- Are open questions flagged as blockers or non-blockers?

### RFC Completeness
- Does every responsibility map to a PRD requirement?
- Is the public interface fully defined (params, return types, errors)?
- Does the data model cover all entities mentioned in the PRD?
- Are indexes justified by query patterns?
- Are all key data flows documented (not just the happy path)?
- Does the error handling table cover all failure modes?
- Are all environment variables listed?
- Are key invariants stated with MUST/MUST NOT language?
- Are dependencies listed in both directions (upstream and downstream)?
- Are implementation phases independently deployable?
- Are testing requirements specific (not generic "write tests")?

### Missing Scenarios
- What happens during deployment/migration?
- What happens during partial system failure?
- What happens when external dependencies are unavailable?
- What happens at scale boundaries?
- What happens with concurrent requests to the same resource?

---

## 3. Consistency

Evaluate internal consistency within the spec and external consistency with other specs.

### Internal Consistency
- Do RFC design decisions align with PRD requirements?
- Does every PRD requirement have a corresponding RFC implementation?
- Do data model fields match what the API endpoints return?
- Do error codes in the error table match what data flows reference?
- Are naming conventions consistent throughout? (camelCase vs snake_case, ID formats)

### Cross-Spec Consistency
- Does this spec claim ownership of data owned by another service?
- Does this spec duplicate a public interface from another service?
- Does this spec wrap an external service already wrapped by another module?
- Are dependency directions consistent with what other specs declare?
- Do error formats, ID conventions, and auth patterns match other specs?
- Does this spec define responsibilities that overlap with an existing service?
- Does this spec introduce a new dependency on a service that the existing spec says has no upstream callers?
- Does this spec contradict behavioral guarantees made by existing specs? (e.g., existing spec says "events are delivered at-least-once", new spec assumes exactly-once)
- Does this spec redefine constants, enums, or status values that are already defined in another spec?
- Does this spec change the meaning of a shared concept? (e.g., existing specs define "active" subscription as paid and current, new spec treats trial as "active")

### Cross-Spec Dangling Reference Detection

Check references in both directions between the new spec and all existing specs:

#### New spec references that don't exist in existing specs
- Does the new spec's Dependencies section list a downstream service that has no spec and no codebase implementation?
- Does the new spec's data flows call a function or endpoint on another service that the other service's spec does not export in its Public Interface?
- Does the new spec's External entity references table reference a table owned by a service whose spec does not define that table?
- Does the new spec consume an event that no existing spec publishes?
- Does the new spec assume an environment variable, config value, or shared resource that no existing spec or codebase provides?

#### Existing specs reference something the new spec should provide but doesn't
- Do any existing specs list the new service as an upstream or downstream dependency, but the new spec does not define the expected interface?
- Do any existing specs' data flows call a function on the new service that the new spec does not export in its Public Interface?
- Do any existing specs consume an event that the new spec is expected to publish (based on the new service's stated responsibilities) but does not define?
- Do any existing specs reference a table the new service should own, but the new spec's data model does not define that table?

For each dangling reference, classify severity:
- **Critical**: A data flow step calls a function/endpoint that does not exist (implementation will fail)
- **High**: A dependency is declared but the target interface is undefined (ambiguous contract)
- **Medium**: An event is consumed but not published, or vice versa (integration will silently fail)
- **Low**: A table or config reference is unresolved but could be inferred from context

### Cross-Spec Contradiction Detection

For each claim the new spec makes, check whether any existing spec makes a contradictory claim:

| Claim Type | What to Check |
|-----------|---------------|
| Data ownership | "This service owns table X" vs existing spec that also owns table X |
| External provider wrapping | "This service calls Stripe directly" vs existing spec that says "only Billing wraps Stripe" |
| Dependency direction | "This service calls Service B" vs Service B's spec that lists no upstream callers, or lists a different set |
| Event contracts | "This service publishes event X with schema Y" vs existing consumer that expects schema Z |
| Shared resource usage | "This service uses Redis cache key `user:{id}`" vs existing service that uses the same key pattern |
| Error codes | "This service returns 403 for rate limit exceeded" vs project standard of 429 |
| ID formats | "This service generates UUIDs" vs project convention of prefixed IDs (e.g., `usr_xxx`) |
| Auth requirements | "This endpoint is public" vs constitution rule that all endpoints require auth |
| SLA guarantees | "This service guarantees p99 < 100ms" but depends on a service with p99 < 500ms |

### Constitution and Invariants Compliance
- Does the spec conform to the project constitution?
- Does the spec adopt all applicable global engineering standards?
- Are any deviations explicitly flagged with justification?

---

## 3b. Redundancy

Evaluate whether the new spec duplicates capabilities, logic, data, or responsibilities that already exist in other specs or in the codebase.

### Responsibility Redundancy (Spec vs Spec)
- Does the new service perform a function that an existing service already performs? (e.g., both services validate email addresses, both services send notifications, both services compute pricing)
- Does the new service define a "utility" responsibility (logging, auth middleware, error formatting) that is already centralized in another service or shared library?
- Does the new service create a parallel path for an operation that already has a defined path? (e.g., existing spec routes payments through Billing Service, new spec routes some payments directly to Stripe)
- Could the new service's responsibilities be added as features to an existing service instead of creating a new service?

### Data Redundancy (Spec vs Spec)
- Does the new service store data that an existing service already stores? (e.g., both services maintain a `users` table or a `subscriptions` cache)
- Does the new service denormalize data from another service without a clear performance justification?
- Does the new service replicate reference data (plans, tiers, feature flags, config) that is already owned by another service?
- If data is intentionally duplicated (e.g., caching, materialized views), is the sync/invalidation strategy defined?

### Interface Redundancy (Spec vs Spec)
- Does the new service expose an endpoint that returns the same data as an existing endpoint on another service?
- Does the new service define a function signature that is semantically identical to one exported by another service?
- Does the new service define events that carry the same information as events from another service?

### Codebase Redundancy (Spec vs Existing Code)

If a codebase exists, check whether the capabilities described in the spec are already implemented:

- **Existing implementations**: Search the codebase for functions, modules, or services that already perform what the spec describes. Flag if the spec would result in reimplementing something that already works.
- **Existing data models**: Check if tables, collections, or schemas described in the spec already exist in migration files, ORM models, or schema definitions. Flag if the spec would create duplicate tables.
- **Existing integrations**: Check if external service integrations described in the spec (Stripe, SendGrid, Auth0, etc.) are already wrapped by existing code. Flag if the spec would create a second wrapper.
- **Shared utilities**: Check if validation logic, error handling patterns, auth middleware, or helper functions described in the spec already exist as shared code. Flag if the spec would duplicate them.
- **Configuration overlap**: Check if environment variables listed in the spec are already used by other services for the same purpose. Flag naming conflicts or semantic overlaps.

### Redundancy Severity Guide

| Situation | Severity | Rationale |
|-----------|----------|-----------|
| New service duplicates an entire existing service's core responsibility | Critical | Will cause confusion about which service is authoritative, split data, and double maintenance cost |
| New service stores the same data as an existing service with no sync strategy | High | Data will drift out of sync, leading to inconsistent behavior |
| New service re-wraps an external API already wrapped by another module | High | Bug fixes and config changes must be applied in two places; risk of divergent behavior |
| New service reimplements logic that already exists in shared codebase utilities | Medium | Wasted effort and maintenance burden; should import the existing code |
| New service exposes a convenience endpoint that proxies an existing service's endpoint | Low | May be intentional (BFF pattern), but should be documented as a proxy, not a new capability |
| New service caches data from another service with a clear invalidation strategy | Info | Intentional and acceptable if the strategy is sound |

---

## 4. Functional Regression

Evaluate whether the new spec would break or degrade existing functionality when implemented alongside the current system.

### Behavioral Contract Violations
- Does the new service change the behavior of an API that existing consumers depend on? (e.g., adding a required field to a request that existing callers do not send)
- Does the new service change the response shape of a shared endpoint? (e.g., renaming a field, changing a type, removing a field that existing consumers read)
- Does the new service change event schemas that existing subscribers parse?
- Does the new service change the semantics of a status code or error response that existing consumers handle?
- Does the new service change the default value or nullability of a shared data field?

### Data Flow Disruption
- Does the new service insert itself into an existing data flow in a way that could delay, drop, or corrupt messages? (e.g., new service becomes a required intermediary in a previously direct call chain)
- Does the new service change the ordering guarantees of an event stream or queue that existing consumers depend on?
- Does the new service introduce a new failure mode into an existing happy path? (e.g., existing flow: A calls B directly; new flow: A calls New Service calls B, so New Service's downtime breaks A-to-B communication)
- Does the new service introduce a write to a shared resource (database, cache, queue) that could conflict with existing writers? (e.g., two services writing to the same cache key with different TTLs)

### Migration and Cutover Risks
- Does the new service require a data migration that could break existing services during the migration window?
- Does the new service require existing services to be updated simultaneously? (big-bang deployment risk)
- Is there a transition period where both old and new behavior coexist? If so, is the coexistence strategy defined?
- Does the new service deprecate an existing endpoint or function? If so, is the deprecation timeline and consumer migration plan defined?

### Performance Regression
- Does the new service add latency to an existing hot path? (e.g., new auth middleware, new validation step, new logging call)
- Does the new service increase load on a shared resource that existing services depend on? (e.g., shared database, shared cache, shared queue)
- Does the new service introduce a new N+1 query pattern or fan-out that could degrade performance at scale?
- Does the new service change connection pooling, timeout, or retry behavior for shared infrastructure?

### Backward Compatibility
- Are all API changes backward-compatible? (additive changes only: new optional fields, new endpoints, new event types)
- If breaking changes are required, is a versioning strategy defined? (v1/v2 coexistence, sunset timeline)
- Are database schema changes backward-compatible with the currently deployed code? (can old code run against the new schema during rolling deploys?)
- Are feature flags defined for risky behavioral changes so they can be toggled off without a redeploy?

### Regression Severity Guide

| Situation | Severity | Rationale |
|-----------|----------|-----------|
| New spec changes a response schema that existing consumers parse without a versioning plan | Critical | Will break existing consumers immediately on deploy |
| New spec inserts a required intermediary into an existing call chain with no fallback | Critical | Intermediary downtime breaks the entire flow |
| New spec requires a big-bang migration with no rollback plan | High | Failed migration leaves the system in an inconsistent state |
| New spec adds latency to a hot path without acknowledging the performance impact | High | Existing SLAs may be violated |
| New spec deprecates an endpoint without a consumer migration timeline | Medium | Consumers need time to migrate; abrupt removal causes breakage |
| New spec adds an optional field to an existing API response | Info | Additive change; existing consumers can ignore it |

---

## 5. Operational Readiness


Evaluate whether the spec is ready for production operation.

### Observability
- Is structured logging specified?
- Are health check endpoints defined?
- Are key metrics identified? (latency, error rate, throughput)
- Are alerts or thresholds mentioned for critical operations?
- Is distributed tracing addressed?

### Deployment
- Is the deployment strategy specified? (rolling, blue-green, canary)
- Are database migrations addressed?
- Is backward compatibility considered for API changes?
- Are feature flags mentioned for risky rollouts?
- Is a rollback plan defined?

### Incident Response
- Is graceful degradation defined for dependency failures?
- Are circuit breakers or fallbacks specified?
- Are retry policies defined with backoff strategies?
- Are timeout values specified for external calls?
- Is there a runbook or on-call escalation path?

### Data Operations
- Is a backup and recovery strategy defined?
- Are data migrations addressed for schema changes?
- Is data archival specified for old records?
- Are database connection pooling and limits considered?

---

## 6. Clarity

Evaluate whether the spec is unambiguous and implementable.

### Language Precision
- Are there vague terms? ("fast", "secure", "scalable", "robust", "appropriate")
- Are all quantities specified? (timeouts, limits, thresholds, TTLs)
- Is conditional logic unambiguous? (no "if applicable" without defining when it applies)
- Are EARS criteria testable as written?

### Implementability
- Can a developer implement each section without asking clarifying questions?
- Are technology choices specified or left open?
- Are there contradictions between sections?
- Are edge cases defined or left to developer judgment?

---

## 7. Feasibility

Evaluate whether the design is realistic and achievable.

### Technical Feasibility
- Are there circular dependencies?
- Are there single points of failure?
- Can the system meet the stated performance targets?
- Are there race conditions in the described data flows?
- Is the data model normalized appropriately (not over or under)?

### Scope and Complexity
- Is the MVP scope achievable in a reasonable timeframe?
- Are there features that should be deferred to post-MVP?
- Is the number of external integrations manageable?
- Are implementation phases ordered by dependency and risk?

---

## Severity Definitions

| Severity | Definition | Action Required |
|----------|-----------|-----------------|
| **Critical** | Security vulnerability, data loss risk, or fundamental design flaw that would require a major rewrite if built as specified | Must fix before implementation begins |
| **High** | Significant gap that would cause production incidents, undefined behavior, or substantial rework | Should fix before implementation begins |
| **Medium** | Missing detail that a developer would need to guess at, or a design choice that may cause issues at scale | Fix before the relevant implementation phase |
| **Low** | Minor improvement to clarity, consistency, or completeness | Fix when convenient |
| **Info** | Observation, suggestion, or best practice that the author may want to consider | Optional |
