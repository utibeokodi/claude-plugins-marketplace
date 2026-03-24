# Infra Dev

Autonomous infrastructure provisioning from JIRA tickets via Terraform. Writes Terraform configuration, validates with `terraform plan`, applies with user approval, verifies resources via AWS CLI and provider APIs, and creates PRs with validation proof.

## Core Principle

**Plan everything, execute nothing without approval.** `terraform apply` is NEVER run without explicit user approval of the `terraform plan` output. Resource destruction requires typing the resource name to confirm.

## Features

- **Terraform workflow**: fmt, validate, plan (approve), apply, validate
- **Multi-provider**: AWS (CloudWatch, RDS, ElastiCache, ECS, S3, IAM, SNS, ALB), PagerDuty, Sentry, Cloudflare
- **Validation loop**: Post-apply verification via AWS CLI and provider APIs
- **Proof in PR**: Validation outputs saved to `infra/validation/<ticket-key>/` and included in the PR
- **Drift detection**: Checks for infrastructure drift before making changes
- **All thresholds as variables**: Never hardcodes values in resource definitions
- **Cost estimates**: Rough monthly cost impact included in plans and PRs

## Usage

```bash
# From a JIRA ticket
/infra-dev OBS-9

# Delegated by swe-dev
# (automatic when swe-dev encounters a Terraform ticket)
```

## Workflow

```
Step 1: Fetch JIRA ticket
Step 2: Verify prerequisites (Terraform, AWS CLI, credentials)
Step 3: Plan (detailed resource list, variables, validation strategy) → user approval
Step 4: Write Terraform configuration
Step 5: terraform plan → user approval
Step 6: terraform apply (after approval only)
Step 7: Validate resources via AWS CLI / provider APIs, capture outputs
Step 8: Create PR with Terraform code + validation proof
Step 9: Report results
```

## Companion Plugins

| Plugin | Role | When Called |
|--------|------|------------|
| **rfc-to-jira** | Creates infrastructure tickets | Before infra-dev |
| **swe-dev** | Delegates Terraform tickets to infra-dev | When swe-dev encounters infrastructure tasks |
| **pr-review** | Reviews infrastructure PRs | After infra-dev creates PRs |

## Prerequisites

- Terraform CLI installed
- AWS CLI configured with credentials
- PagerDuty API token (if provisioning PagerDuty resources)
- Terraform state backend configured (S3 + DynamoDB)
- Atlassian MCP server connected

## Installation

```
/install infra-dev@claude-plugins-marketplace
```
