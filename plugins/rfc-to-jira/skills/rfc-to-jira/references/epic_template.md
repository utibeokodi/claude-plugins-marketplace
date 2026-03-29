```markdown
## Purpose

[Copy from RFC § Purpose]

## Responsibilities

[Copy from RFC § Responsibilities, both "what Langfuse already does" and "what this module adds"]

## Langfuse Baseline (DO NOT Implement)

[If the RFC has a "Langfuse Baseline" section, copy it here. These capabilities already exist in Langfuse upstream and MUST NOT be re-built. Every task in this epic must respect these boundaries.]

- [e.g., "Organization model and RBAC already exist — do not create new org tables"]
- [e.g., "protectedOrganizationProcedure already injects orgId into tRPC context"]
- [e.g., "ClickHouse queries already filter by project_id"]

## Public Interface

[Copy from RFC § Public Interface — list all exported service methods with signatures]

## Scope

**In scope (MVP):**
- [Derived from Implementation Phases]

**Out of scope (deferred):**
- [Copy from RFC § Deferred to Post-MVP]

## Key Invariants

[Copy from RFC § Key Invariants — these are non-negotiable rules that apply to ALL tasks in this epic]

## Dependencies

[Copy from RFC § Dependencies — upstream and downstream modules]

**Cross-epic sequencing:**
- [e.g., "This epic MUST be completed before Billing, Entitlement, Provisioning, Notification epics can begin"]
- [e.g., "Bidirectional dependency with Entitlement — document the fallback cache-miss path"]

## Glossary

[Define every domain term used in this epic so the implementer does not have to guess:]

| Term | Definition |
|------|-----------|
| [e.g., org_id] | [The organization identifier, derived from JWT or API key lookup, never from user input] |
| [e.g., tenant] | [An organization with an active subscription; maps to the `organizations` table] |
| [e.g., plan limits] | [Trace count thresholds per billing period, pushed by Billing via `updatePlanLimits()`] |

## Architecture Reference

- Module location: [from RFC header, e.g., `packages/shared/src/saas/multi-tenancy/`]
- tRPC router: [from RFC header, or "None — this module has no tRPC endpoints" if applicable]
- Reference docs: `CLAUDE.md`, `.specs/CONSTITUTION.md`, `.specs/stack.md`, `.specs/structure.md`

## External Prerequisites

[Copy from RFC § Environment Variables > "External prerequisites" subsection. These are setup steps that must be completed OUTSIDE the codebase before implementation can begin.]

Examples of external prerequisites:
- Stripe: Create products, prices, and webhook endpoints in the Stripe Dashboard
- SendGrid: Configure sender identity, create API key, set up email templates, domain authentication (DKIM/SPF DNS records)
- AWS: Provision RDS, ElastiCache, S3 buckets, ECS clusters via Terraform
- PagerDuty: Create services, escalation policies, and integration keys
- Sentry: Create project, capture DSN, configure release tracking in CI/CD
- ClickHouse: Apply schema migrations before ingestion begins
- DNS: Configure domain records for the application

**IMPORTANT:** These prerequisites generate dedicated "External Setup" tasks in Phase 0 (see Task Decomposition Guidelines). Each task includes step-by-step instructions for configuring the external service, what credentials/IDs to capture, and where to store them (environment variables, AWS Secrets Manager).

## Scale Constraints

[Copy from RFC § Scale Constraints]
```
