# {Service Name}

> RFC Template: Adapt section content to your project's tech stack and architecture.
> Sections marked [OPTIONAL] should be omitted when not applicable.

## Purpose
{One or two sentences: what this module does and why it exists. Focus on the business capability it enables.}

## Responsibilities
- {Responsibility 1: what this service owns and does}
- {Responsibility 2}
- {Responsibility 3}

## Public Interface

{The contracts other services or clients depend on. Adapt to your interface style:}
{For exported functions: functionName(param1: Type, param2: Type) -> ReturnType | ErrorType}
{For REST endpoints: list paths, methods, auth}
{For events: event name and payload shape}
{For message queues: queue name, message schema, consumer expectations}

{Include additional interface contracts relevant to this service: webhook endpoints,
entity mappings, RBAC matrices, plan/tier definitions, etc.}

## API / RPC Endpoints [OPTIONAL]

> Omit this section for internal-only services that expose no external API.
> Adapt to your API style: REST, GraphQL, gRPC, tRPC, or internal function calls.

| Type | Path / Method | Auth | Description |
|------|---------------|------|-------------|
| REST | `POST /api/{resource}` | JWT Bearer | {Description} |
| Webhook | `POST /webhooks/{provider}` | Signature validation | {Description} |
| Internal | `functionName()` | N/A | {Description} |

### Request / Response Contracts

Define the exact shape of each non-trivial request and response.

```
[Endpoint name or function]

Input:
{ "field": "type (required|optional)" }

Output:
{ "field": "type" }

Error:
{ "error": "string", "error_description": "string" }
```

## Data Model

> Adapt schema syntax to your technology: SQL (PostgreSQL, MySQL, SQLite),
> NoSQL (MongoDB, DynamoDB), or time-series (ClickHouse, InfluxDB, TimescaleDB).
> Only define tables/collections owned by this service.
> IDs should follow your project's existing ID generation convention.

### Primary Store

```sql
CREATE TABLE {entity_names} (
  id          TEXT PRIMARY KEY,
  {tenant_id} TEXT NOT NULL REFERENCES {tenants}(id) ON DELETE CASCADE,
  field1      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_{entity_names}_{tenant_id} ON {entity_names}({tenant_id});
```

### Cache Layer [OPTIONAL]

```
key:pattern:{tenantId}:{param} -> TYPE  (description, TTL)
```

### Time-Series / Analytics Store [OPTIONAL]

```sql
-- Only for services that read/write analytics or event data
-- Adapt to your time-series technology
```

**External entity references** (IDs stored here but owned by other services):

| Field | Owned By | Purpose |
|-------|----------|---------|
| `{tenant_id}` | Identity / multi-tenancy service | Tenant isolation |
| `{external_id}` | {External service} | Link to external record |

## Key Data Flows

### {Flow Name}

```
1. [Actor] -> [Action]
2. [Service] validates/checks [what]
3. [Service] calls [downstream service / external API]
4. [Result stored / returned to caller]
```

### {Flow Name}

```
1. ...
```

## Error Handling

| Error Type | Status / Code | Trigger | Consumer Action |
|-----------|---------------|---------|-----------------|
| `ResourceNotFoundError` | 404 | {When this error occurs} | {What the caller should do} |
| `ConflictError` | 409 | {When this error occurs} | {What the caller should do} |
| `ExternalServiceError` | 502 | External service failure | Retry with backoff or surface to user |

## Environment Variables

> All configuration MUST come from environment variables. Never hardcode secrets.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SERVICE_API_KEY` | Yes | {Description} | `sk_test_...` |
| `DATABASE_URL` | Yes | {Description} | `postgres://...` |

**External prerequisites** (must be configured before implementation begins):
- {Any external service accounts, API keys, tenant config, third-party setup required}

## Key Invariants
- {Non-negotiable rule 1: use MUST/MUST NOT language}
- {Non-negotiable rule 2}

## Dependencies
- **Upstream (services that call this service):**
  - {Service name}: calls `functionName` for {reason}
- **Downstream (services this service calls):**
  - {Service name}: {what it calls and why}
- **External services:**
  - {External service name}: no other service in this system calls it directly
- **Owns:** {What data/state this service exclusively owns}. Other services call `{serviceFunction}()` rather than accessing the data directly.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| {e.g. External API rate limits} | High / Medium / Low | {Strategy} |
| {e.g. Data migration complexity} | High / Medium / Low | {Strategy} |

## Scale Constraints (MVP)
- **Expected load:** {volume estimates: users, requests/day, data volume}
- **Performance target:** {latency targets: e.g. p95 < 300ms, p99 < 1s}
- **Data retention:** {how long data is kept, archiving strategy if any}

## Implementation Phases

| Phase | Description | Depends On |
|-------|-------------|------------|
| 0 | {Foundation: data model, config, environment setup} | n/a |
| 1 | {Core functionality: the minimum viable behaviour} | Phase 0 |
| 2 | {Secondary features, integrations, advanced cases} | Phase 1 |

## Testing

> Only list requirements specific to this service. General test strategy (framework,
> conventions, coverage thresholds) should be in your project's engineering standards doc.

- {e.g. Mock the external payment API in unit tests}
- {e.g. Tenant A MUST NOT be able to access Tenant B's data in any test scenario}
- {e.g. Test the retry logic with simulated network failures}
- {e.g. Load test the main read path at 2x expected peak load before launch}

## Deferred to Post-MVP
- {Feature or capability}: {why deferred; what signal would trigger building it}

## Open Questions
- [ ] {Unresolved technical decision that must be resolved before implementation begins}
