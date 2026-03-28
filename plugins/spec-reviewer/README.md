# Spec Reviewer

Reviews PRD and RFC specification documents for security vulnerabilities (including cross-spec security regression), completeness gaps, cross-spec consistency, redundancy against existing specs and codebase, functional regression risks, operational readiness, clarity issues, and feasibility concerns. Produces a structured review report with severity-rated findings and actionable recommendations.

## Core Principle

**Defense in depth**: a new spec must not only be secure and complete in isolation, it must not weaken the security, introduce redundancy, or break the functional correctness of the existing system when deployed alongside it.

## Review Dimensions

1. **Security**: Authentication, authorization, data protection, input validation, secrets management, API security, multi-tenancy isolation, OWASP Top 10, STRIDE threat modeling, and cross-spec security regression (trust boundary erosion, privilege escalation paths, data exposure amplification, attack surface expansion, tenant isolation regression)
2. **Completeness**: Missing requirements, undefined error paths, unquantified NFRs, gaps in EARS criteria coverage
3. **Consistency**: PRD-to-RFC alignment, cross-spec data ownership conflicts, dependency direction contradictions, event contract mismatches, convention mismatches, constitution and global invariants compliance
4. **Redundancy**: Responsibility duplication across specs, data duplication without sync strategy, interface duplication, and codebase redundancy (reimplementing existing code, duplicate tables, duplicate external service wrappers, duplicate utilities)
5. **Functional Regression**: Behavioral contract violations, data flow disruption, migration/cutover risks, performance regression on existing hot paths, backward compatibility of API and schema changes
6. **Operational Readiness**: Observability, deployment strategy, incident response, data operations
7. **Clarity**: Vague language, unquantified values, ambiguous conditionals, contradictions
8. **Feasibility**: Circular dependencies, single points of failure, race conditions, scope realism

## Usage

```
# Interactive review (pauses after each dimension for discussion)
/spec-reviewer .specs/billing-service/

# Full report in one shot (no pauses)
/spec-reviewer --no-gates .specs/billing-service/

# Security audit only (includes cross-spec security regression)
/spec-reviewer --security-only .specs/auth/01-RFC-auth.md

# Single dimension
/spec-reviewer --dimension completeness .specs/notification-service/
/spec-reviewer --dimension redundancy .specs/billing-service/
/spec-reviewer --dimension regression .specs/billing-service/

# Only high and critical findings
/spec-reviewer --severity-threshold high .specs/billing-service/

# Write report to file
/spec-reviewer --output .specs/billing-service/REVIEW.md .specs/billing-service/

# Review a single file (companion loaded automatically)
/spec-reviewer .specs/billing-service/02-RFC-billing-service.md
```

## How It Works

1. Parse request, identify target specs, and load project context (constitution, global invariants, all other specs, and existing codebase for redundancy/regression analysis)
2. Review each dimension systematically using the checklist from `references/review_dimensions.md`
3. Present findings per dimension with user review gates between each
4. Compile a final report with severity-rated findings, verdict, threat summary, redundancy map, regression risk assessment, and next steps
5. Optionally provide fix suggestions with before/after diffs and apply them with user approval

## Verdicts

| Verdict | Criteria |
|---------|----------|
| **BLOCKED** | Critical findings that must be resolved before implementation |
| **CONDITIONAL** | No critical findings, but high findings should be addressed first |
| **APPROVED WITH NOTES** | No critical or high findings; medium/low items can be addressed during implementation |
| **APPROVED** | No significant findings |

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Dimensions | all | `--dimension NAME` | Review a single dimension (security, completeness, consistency, redundancy, regression, operational, clarity, feasibility) |
| Dimensions | all | `--security-only` | Shorthand for `--dimension security` |
| Severity filter | all | `--severity-threshold LEVEL` | Only report findings at or above this level (critical, high, medium, low, info) |
| Review gates | enabled | `--no-gates` | Skip per-dimension pauses and output the complete report in one shot |
| Output | chat | `--output PATH` | Write review report to a file |

## Companion Plugins

| Plugin | Relationship |
|--------|-------------|
| `spec-creator` | Creates the PRD and RFC specs that this plugin reviews |
| `rfc-to-jira` | Converts reviewed and approved RFCs into JIRA tickets |
| `swe-dev` | Implements tickets produced from the reviewed RFC |
| `pr-reviewer` | Reviews PRs that implement the spec |

## Prerequisites

- At least one spec file (PRD or RFC) to review
- Access to `.specs/` directory for cross-spec consistency and redundancy checks (optional)
- Access to constitution and engineering standards documents for compliance checks (optional)
- Git repository for codebase redundancy and regression analysis (optional)

## Installation

```
/install spec-reviewer@utibes-plugins-marketplace
```
