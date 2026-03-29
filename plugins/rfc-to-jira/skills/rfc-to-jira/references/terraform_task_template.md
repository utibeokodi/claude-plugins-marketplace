Some RFCs (especially Monitoring & Alerting) require infrastructure provisioned via Terraform, not application code. These tasks have no TDD loop, no `pnpm test`, and are validated via `terraform plan` and AWS CLI.

````markdown
## Objective

Provision [infrastructure resource] via Terraform for [module name].

## Context

**RFC:** [path to the RFC file]
**Terraform directory:** [e.g., `infra/terraform/modules/monitoring/`]
**Key invariant:** "All AWS and PagerDuty infrastructure MUST be provisioned via Terraform — never via the AWS Console"

## Implementation Steps

### 1. Create feature branch

```bash
git checkout -b feat/[ticket-key]-[short-description] main
```

### 2. Write Terraform configuration

**Files to create/modify:**
- [e.g., `infra/terraform/modules/monitoring/cloudwatch-alarms.tf`]
- [e.g., `infra/terraform/modules/monitoring/pagerduty.tf`]
- [e.g., `infra/terraform/modules/monitoring/variables.tf`]

**Resources to define:**
- [e.g., "aws_cloudwatch_metric_alarm for each Critical-tier alert"]
- [e.g., "pagerduty_service with escalation policy"]

**Alert thresholds MUST be configurable via Terraform variables, not hardcoded.**

### 3. Validate

```bash
cd infra/terraform
terraform fmt
terraform validate
terraform plan -out=plan.out
```

Review the plan output to confirm:
- [ ] Correct resources will be created
- [ ] No unintended modifications to existing resources
- [ ] Variables are parameterized (no hardcoded thresholds)

### 4. Apply (with approval)

```bash
# Only after human review of the plan
terraform apply plan.out
```

### 5. Verify

```bash
# Verify CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names "[alarm-name]"

# Verify PagerDuty service
# Check PagerDuty Dashboard or use PagerDuty API

# Verify CloudWatch dashboard
aws cloudwatch get-dashboard --dashboard-name "[dashboard-name]"
```

## Acceptance Criteria

- [ ] Terraform config passes `terraform validate` and `terraform fmt`
- [ ] `terraform plan` shows only intended changes
- [ ] All thresholds are Terraform variables (not hardcoded)
- [ ] Resources provisioned and verified via AWS CLI / provider dashboard
- [ ] No manual console changes (everything in Terraform state)
````
