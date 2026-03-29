# Spec Review Report Template

Use this template when compiling the review report in Step 9.

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
