---
name: infra-dev
description: This skill should be used when provisioning infrastructure via Terraform from JIRA tickets. Triggers on requests like "provision CloudWatch alarms", "create PagerDuty service via Terraform", "/infra-dev OBS-9", or when swe-dev delegates a Terraform/infrastructure ticket. Handles AWS (CloudWatch, RDS, ElastiCache, ECS, S3, IAM) and PagerDuty resources with validation loops and proof-of-provisioning screenshots in PRs.
argument-hint: "TICKET-KEY"
disable-model-invocation: true
---

# Infra Dev: Autonomous Infrastructure Provisioning from JIRA Tickets

Takes JIRA infrastructure tickets and provisions resources via Terraform. Writes Terraform configuration, runs `terraform plan` (with user approval), applies changes, validates resources via AWS CLI and provider APIs, captures validation screenshots, and creates a PR with the Terraform code and proof of provisioning.

## Overview

This skill handles infrastructure-as-code tasks that `swe-dev` delegates. Unlike application code tasks, infrastructure tasks:
- Have no TDD loop (replaced by `terraform validate` + `terraform plan` + post-apply validation)
- Require `terraform apply` approval (destructive, affects shared infrastructure)
- Are validated via AWS CLI, PagerDuty API, and other provider CLIs (not unit tests)
- Include validation screenshots as proof of provisioning in the PR

## Core Principle: Plan Everything, Execute Nothing Without Approval

Every action that modifies infrastructure must be preceded by a plan the user approves. `terraform apply` is NEVER run without explicit user approval of the `terraform plan` output. This is non-negotiable.

## When to Use

Invoke this skill when:
- `swe-dev` delegates a Terraform/infrastructure ticket
- User requests: "provision CloudWatch alarms for monitoring"
- User says: "create the PagerDuty service via Terraform"
- User provides: "/infra-dev OBS-9"
- Ticket description mentions Terraform, CloudWatch alarms, infrastructure provisioning, IaC

## Prerequisites

- Terraform CLI installed (`terraform version`)
- AWS CLI configured with appropriate credentials (`aws sts get-caller-identity`)
- PagerDuty API token available (if provisioning PagerDuty resources)
- Atlassian MCP server connected (to fetch ticket details)
- Terraform state backend configured (S3 + DynamoDB for locking)

## Workflow

### Step 1: Fetch and Analyze Ticket

Fetch the JIRA ticket:

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "<ticket-key>",
  contentFormat: "markdown"
)
```

Read the referenced docs:
- The RFC file (especially Key Invariants, Alert Rules, Environment Variables sections)
- `CLAUDE.md` for project conventions
- `.specs/CONSTITUTION.md` for inviolable rules
- Existing Terraform files in the repo to understand current infrastructure patterns

### Step 2: Verify Prerequisites

Before planning, verify the infrastructure toolchain is ready:

```bash
# Verify Terraform
terraform version

# Verify AWS credentials
aws sts get-caller-identity

# Verify Terraform state backend
terraform init -backend=true
```

If any prerequisite fails, report to the user and stop. Do NOT proceed without valid credentials and state.

### Step 2b: Select Namespace (User Prompt Required)

Before planning, ask the user which namespace this provisioning targets:

```markdown
## Namespace Selection

Which namespace should this infrastructure be provisioned in?

- **dev** — All resources will be prefixed with `dev-` (e.g., `dev-ingestion-error-rate-critical`)
- **prod** — All resources will be prefixed with `prod-` (e.g., `prod-ingestion-error-rate-critical`)

Please confirm: **dev** or **prod**?
```

Wait for the user's response before proceeding. The selected namespace determines:
- **Resource name prefix**: All resource names must start with `dev-` or `prod-` (e.g., `dev-ai-observability-critical`, `prod-ingestion-error-rate-critical`)
- **Terraform workspace or directory**: Use the appropriate workspace or environment-specific directory (e.g., `infra/terraform/dev/`, `infra/terraform/prod/`)
- **Variable defaults**: Dev and prod may have different threshold defaults (e.g., relaxed thresholds in dev, stricter in prod)
- **Terraform state**: Dev and prod must use separate state files to avoid cross-environment conflicts

Store the selected namespace in a variable and apply the prefix consistently to every resource name, tag, and output throughout the remaining steps. Never mix namespaces in a single run.

### Step 3: Plan (User Approval Required)

#### 3a. Read the ticket and existing infrastructure

```
1. Read the ticket description thoroughly
2. Read the RFC sections referenced (Alert Rules, Key Invariants, Environment Variables)
3. Explore existing Terraform files in the repo:
   - infra/terraform/ directory structure
   - Existing modules, variables, outputs
   - Current provider configurations
   - Terraform state (terraform state list)
4. Identify any ambiguities or unknowns
5. If ANYTHING is unclear, ask clarifying questions. Never assume.
```

#### 3b. Produce an infrastructure plan

Present a detailed plan to the user:

```markdown
## Infrastructure Plan: <TICKET-KEY> — <ticket summary> [<NAMESPACE>]

### Namespace
**<dev|prod>** — All resources prefixed with `<dev-|prod->`.

### Objective
[What resources will be provisioned and why]

### Resources to Create

| Resource Type | Name | Key Configuration | Provider |
|--------------|------|-------------------|----------|
| [e.g., aws_cloudwatch_metric_alarm] | [e.g., dev-ingestion-error-rate-critical] | [e.g., threshold: 5%, period: 300s, evaluation_periods: 1] | AWS |
| [e.g., pagerduty_service] | [e.g., dev-ai-observability-critical] | [e.g., escalation_policy: critical-oncall] | PagerDuty |

### Terraform Files to Create/Modify

| File | Purpose | New/Modify |
|------|---------|------------|
| [exact path] | [what it defines] | New |
| [exact path] | [what changes] | Modify |

### Variables (all thresholds configurable, never hardcoded)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| namespace | string | (user-selected) | Environment namespace: `dev` or `prod`. Used as prefix for all resource names. |
| [e.g., ingestion_error_rate_threshold] | number | 5 | Percentage threshold for critical alert |
| [e.g., rds_cpu_warning_threshold] | number | 70 | RDS CPU % for warning alert |

### Validation Strategy

After `terraform apply`, these commands will verify the resources exist and are configured correctly:

| Validation Step | Command | Expected Output |
|----------------|---------|-----------------|
| [e.g., Verify alarm exists] | `aws cloudwatch describe-alarms --alarm-names "ingestion-error-rate-critical"` | Alarm with correct threshold and actions |
| [e.g., Verify PagerDuty service] | `curl -H "Authorization: Token token=$PD_TOKEN" https://api.pagerduty.com/services/$SERVICE_ID` | Service with correct escalation policy |

### Clarifying Questions (if any)
[Questions that MUST be answered before proceeding. Never assume.]
- [e.g., "The RFC says 'SNS topic to PagerDuty' but no SNS topic exists yet. Should I create one or is there an existing topic?"]

### Key Constraints (from RFC)
- [e.g., "All thresholds must be Terraform variables, not hardcoded"]
- [e.g., "All infrastructure must be managed via Terraform, never via AWS Console"]

### Estimated Resources / Cost Impact
[Rough estimate of AWS costs for the resources being provisioned]
- [e.g., "10 CloudWatch alarms: ~$1/month (first 10 free)"]
- [e.g., "2 SNS topics: free tier"]
- [e.g., "PagerDuty: free tier (up to 5 users)"]

### Summary
[2-3 sentence high-level summary of the entire plan: what is being provisioned, for which service/system, and the expected outcome once applied.]

### Risks
- [e.g., "Alarm thresholds are estimates; may need tuning after first week of production data"]
```

Wait for user approval before proceeding.

### Step 4: Write Terraform Configuration

After plan approval:

#### 4a. Create feature branch

```bash
git checkout -b feat/<ticket-key>-<short-description> main
```

#### 4b. Write the Terraform files

Follow these patterns:
- **Namespace prefix on all resource names** using `var.namespace` (e.g., `"${var.namespace}-ingestion-error-rate-critical"`)
- **All thresholds as variables** (never hardcoded values in resource definitions)
- **Meaningful resource names** that include the namespace prefix and alert tier (critical/warning/info)
- **Tags on all resources** (Project, Environment: `var.namespace`, ManagedBy: "terraform")
- **Outputs** for resource IDs and ARNs (used in validation step)
- **Comments** explaining why each threshold was chosen (link to RFC)

#### 4c. Validate the configuration

```bash
cd infra/terraform

# Format
terraform fmt -recursive

# Validate syntax and references
terraform validate
```

If validation fails, fix and re-run. Report errors to the user if stuck.

### Step 5: Terraform Plan (User Approval Required)

Generate and present the plan:

```bash
terraform plan -out=tfplan 2>&1
```

Present the full plan output to the user:

```markdown
## Terraform Plan Output

<TICKET-KEY>: <summary>

### Resources to Add
[paste terraform plan output showing resources to create]

### Resources to Change
[paste any changes to existing resources]

### Resources to Destroy
[paste any resources being destroyed — highlight these prominently]

### Summary
Plan: X to add, Y to change, Z to destroy.

**IMPORTANT: Review the plan above carefully.**
- Are the right resources being created?
- Are the thresholds correct?
- Is anything being destroyed that shouldn't be?

Approve `terraform apply`? (yes/no)
```

**NEVER run `terraform apply` without explicit user approval.**

If the user rejects the plan:
- Ask what needs to change
- Modify the Terraform configuration
- Re-run `terraform plan`
- Present the updated plan for approval

### Step 6: Terraform Apply (After Approval Only)

```bash
terraform apply tfplan
```

Capture the full apply output. If apply fails:
1. Report the error to the user
2. Analyze the failure (IAM permissions, resource conflicts, quota limits)
3. Propose a fix
4. Re-run the plan/apply cycle with user approval

### Step 7: Validation Loop

After successful apply, validate that every provisioned resource exists and is configured correctly. This is the infrastructure equivalent of running tests.

Load `references/validation_commands.md` for provider-specific CLI validation commands for each resource type. Run the appropriate commands for each provisioned resource.

### Step 8: Create PR

After all validations pass:

1. **Stage all Terraform files and validation outputs**:
   ```bash
   git add infra/terraform/ infra/validation/<ticket-key>/
   ```

2. **Read the PR template**:
   ```
   Read(file_path=".github/PULL_REQUEST_TEMPLATE.md")
   ```

3. **Commit**:
   ```bash
   git commit -m "feat(<ticket-key>): <short description of infrastructure changes>"
   ```

4. **Push and create PR**:
   ```bash
   git push -u origin feat/<ticket-key>-<short-description>

   gh pr create --title "<ticket-key>: <ticket summary>" --body "$(cat <<'EOF'
   ## Summary
   [Description of infrastructure changes]

   ## Terraform Changes
   - Resources added: [list]
   - Resources modified: [list]
   - Resources destroyed: [list]

   ## Terraform Plan Output
   ```
   [paste terraform plan summary]
   ```

   ## Validation Results
   All provisioned resources verified via AWS CLI / PagerDuty API.
   Validation outputs are in `infra/validation/<ticket-key>/`.

   | Resource | Status |
   |----------|--------|
   | [resource 1] | Verified |
   | [resource 2] | Verified |

   ## Cost Impact
   [Estimated monthly cost change]

   ## Checklist
   - [ ] `terraform fmt` passed
   - [ ] `terraform validate` passed
   - [ ] `terraform plan` reviewed and approved
   - [ ] `terraform apply` successful
   - [ ] All resources validated via CLI/API
   - [ ] All thresholds are Terraform variables (not hardcoded)
   - [ ] All resources tagged (Project, Environment, ManagedBy)
   - [ ] No secrets in Terraform files (using variables or data sources)
   - [ ] Validation outputs included in PR

   ## JIRA Ticket
   [Link to JIRA ticket]
   EOF
   )"
   ```

5. **Transition the JIRA ticket** to "In Review":
   ```
   mcp__claude_ai_Atlassian__transitionJiraIssue(
     cloudId: "<cloud-id>",
     issueIdOrKey: "<ticket-key>",
     transition: { id: "<in-review-transition-id>" }
   )
   ```

### Step 9: Report Results

```markdown
## Infrastructure Provisioning Summary: <TICKET-KEY>

### PR
[PR URL]

### Resources Provisioned
| Resource | Provider | Status | Validation |
|----------|----------|--------|------------|
| [name] | AWS | Created | CLI verified |
| [name] | PagerDuty | Created | API verified |

### Cost Impact
[Monthly cost estimate]

### Validation Outputs
Saved to `infra/validation/<ticket-key>/` and included in PR.
```

---

## Handling Edge Cases

### Terraform state lock conflict

If `terraform plan` or `apply` fails due to a state lock:
1. Report the lock holder and lock ID
2. Ask the user if they want to force-unlock (dangerous)
3. Never force-unlock without explicit user approval

### Resource already exists

If Terraform reports a resource already exists (not in state but exists in AWS):
1. Report the conflict
2. Propose options: import into state (`terraform import`) or rename the resource
3. Wait for user approval
4. If importing, show the import plan before executing

### Terraform apply partial failure

If some resources are created but others fail:
1. Report which resources succeeded and which failed
2. Run validation on the successful resources
3. Propose a fix for the failed resources
4. Wait for user approval before re-applying
5. Never run `terraform destroy` without explicit user approval

### Credentials or permissions issue

If AWS CLI or PagerDuty API returns permission errors during validation:
1. Report the specific permission needed
2. Suggest the IAM policy change required
3. Wait for the user to fix permissions before retrying

### Drift detection

Before writing new Terraform, check for drift in existing resources:
```bash
terraform plan -detailed-exitcode
```
If drift is detected (exit code 2):
1. Report the drifted resources
2. Ask the user whether to fix drift first or proceed with new changes
3. Never silently overwrite drifted state

### Destroying resources

If a ticket requires destroying infrastructure:
1. Highlight destroyed resources prominently in the plan
2. Require explicit confirmation: "This will DESTROY [resource]. Type the resource name to confirm."
3. After destroy, validate that the resource no longer exists
4. Include the destroy validation in the PR

---

## Configuration

| Setting | Source | Default |
|---------|--------|---------|
| Terraform directory | Project convention | `infra/terraform/` |
| Validation output directory | This skill | `infra/validation/<ticket-key>/` |
| Terraform state backend | Project config | S3 + DynamoDB |
| Branch naming | CONSTITUTION § Git | `feat/<ticket-key>-<short-description>` |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | Required |
| AWS region | Environment variable | `AWS_CLOUDWATCH_REGION` |

---

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
