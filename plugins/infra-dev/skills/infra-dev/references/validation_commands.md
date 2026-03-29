# Validation Commands Reference

Provider-specific CLI validation commands for each resource type. Run the appropriate commands for each provisioned resource after `terraform apply`.

---

## Step 7a: Run Validation Commands

For each resource type, run the appropriate validation command:

**AWS CloudWatch Alarms:**
```bash
# List all alarms and verify they exist
aws cloudwatch describe-alarms \
  --alarm-names "ingestion-error-rate-critical" "bullmq-queue-depth-critical" \
  --query 'MetricAlarms[*].{Name:AlarmName,Threshold:Threshold,Period:Period,State:StateValue}' \
  --output table

# Verify alarm actions point to correct SNS topic
aws cloudwatch describe-alarms \
  --alarm-names "ingestion-error-rate-critical" \
  --query 'MetricAlarms[0].AlarmActions' \
  --output json
```

**AWS CloudWatch Dashboards:**
```bash
# Verify dashboard exists
aws cloudwatch get-dashboard --dashboard-name "operations-dashboard" \
  --query 'DashboardName' --output text

aws cloudwatch get-dashboard --dashboard-name "business-dashboard" \
  --query 'DashboardName' --output text
```

**AWS SNS Topics:**
```bash
# Verify SNS topic and subscriptions
aws sns get-topic-attributes --topic-arn "<topic-arn>"
aws sns list-subscriptions-by-topic --topic-arn "<topic-arn>" \
  --query 'Subscriptions[*].{Protocol:Protocol,Endpoint:Endpoint}' \
  --output table
```

**AWS RDS:**
```bash
# Verify instance configuration
aws rds describe-db-instances --db-instance-identifier "<instance-id>" \
  --query 'DBInstances[0].{Class:DBInstanceClass,MultiAZ:MultiAZ,Storage:AllocatedStorage,Engine:Engine}' \
  --output table
```

**AWS ElastiCache:**
```bash
# Verify Redis cluster
aws elasticache describe-cache-clusters --cache-cluster-id "<cluster-id>" \
  --query 'CacheClusters[0].{NodeType:CacheNodeType,Engine:Engine,Nodes:NumCacheNodes}' \
  --output table
```

**AWS ECS:**
```bash
# Verify ECS service
aws ecs describe-services --cluster "<cluster-name>" --services "<service-name>" \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount,TaskDef:taskDefinition}' \
  --output table
```

**AWS S3:**
```bash
# Verify bucket exists and has correct configuration
aws s3api head-bucket --bucket "<bucket-name>"
aws s3api get-bucket-encryption --bucket "<bucket-name>"
aws s3api get-bucket-lifecycle-configuration --bucket "<bucket-name>"
```

**AWS IAM:**
```bash
# Verify role and attached policies
aws iam get-role --role-name "<role-name>" \
  --query 'Role.{Name:RoleName,Arn:Arn}' --output table
aws iam list-attached-role-policies --role-name "<role-name>" \
  --query 'AttachedPolicies[*].{Name:PolicyName}' --output table
```

**PagerDuty:**
```bash
# Verify service exists
curl -s -H "Authorization: Token token=$PAGERDUTY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.pagerduty.com/services/<service-id>" | jq '{name: .service.name, status: .service.status, escalation_policy: .service.escalation_policy.summary}'

# Verify escalation policy
curl -s -H "Authorization: Token token=$PAGERDUTY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.pagerduty.com/escalation_policies/<policy-id>" | jq '{name: .escalation_policy.name, rules: [.escalation_policy.escalation_rules[].targets[].summary]}'

# Verify integration key
curl -s -H "Authorization: Token token=$PAGERDUTY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.pagerduty.com/services/<service-id>/integrations" | jq '.integrations[] | {name: .name, type: .type, key: .integration_key}'
```

**Sentry:**
```bash
# Verify project exists
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/<org-slug>/<project-slug>/" | jq '{name: .name, status: .status, platform: .platform}'
```

---

## Step 7b: Capture Validation Screenshots

For each validation command, capture the output as a screenshot or save the output to a file for the PR:

```bash
# Save validation outputs to files
mkdir -p /tmp/infra-validation/<ticket-key>

# Example: CloudWatch alarms validation
aws cloudwatch describe-alarms \
  --alarm-names "ingestion-error-rate-critical" "bullmq-queue-depth-critical" \
  --query 'MetricAlarms[*].{Name:AlarmName,Threshold:Threshold,Period:Period,State:StateValue,Actions:AlarmActions}' \
  --output table > /tmp/infra-validation/<ticket-key>/cloudwatch-alarms.txt

# Example: PagerDuty service validation
curl -s -H "Authorization: Token token=$PAGERDUTY_API_TOKEN" \
  "https://api.pagerduty.com/services/<service-id>" | jq '.' > /tmp/infra-validation/<ticket-key>/pagerduty-service.json

# Copy validation outputs into the repo for the PR
mkdir -p infra/validation/<ticket-key>
cp /tmp/infra-validation/<ticket-key>/* infra/validation/<ticket-key>/
```

---

## Step 7c: Validate Results and Report

Present the validation results to the user:

```markdown
## Validation Results: <TICKET-KEY>

### Resources Verified

| Resource | Status | Details |
|----------|--------|---------|
| CloudWatch Alarm: ingestion-error-rate-critical | Verified | Threshold: 5%, Period: 300s, Actions: SNS → PagerDuty |
| CloudWatch Alarm: bullmq-queue-depth-critical | Verified | Threshold: 10000, Period: 60s, Actions: SNS → PagerDuty |
| PagerDuty Service: ai-observability-critical | Verified | Escalation: critical-oncall, Status: active |
| SNS Topic: critical-alerts | Verified | Subscription: PagerDuty HTTPS endpoint |
| CloudWatch Dashboard: operations | Verified | Widgets: 8 |

### Validation Outputs
Saved to `infra/validation/<ticket-key>/` (included in PR)

### Issues Found
| Resource | Issue | Action Needed |
|----------|-------|---------------|
| (none) | | |
```

If validation reveals issues:
1. Report the specific problem
2. Propose a fix (modify Terraform, re-plan, re-apply)
3. Wait for user approval before re-applying
4. Re-validate after fix

---

## Supported Providers and Validation Commands

| Provider | Resource Types | Validation Method |
|----------|---------------|-------------------|
| **AWS CloudWatch** | Alarms, Dashboards, Log Groups | `aws cloudwatch describe-alarms`, `aws cloudwatch get-dashboard` |
| **AWS SNS** | Topics, Subscriptions | `aws sns get-topic-attributes`, `aws sns list-subscriptions-by-topic` |
| **AWS RDS** | Instances, Parameter Groups, Security Groups | `aws rds describe-db-instances` |
| **AWS ElastiCache** | Clusters, Replication Groups | `aws elasticache describe-cache-clusters` |
| **AWS ECS** | Clusters, Services, Task Definitions | `aws ecs describe-services`, `aws ecs describe-task-definition` |
| **AWS S3** | Buckets, Lifecycle Policies, Encryption | `aws s3api head-bucket`, `aws s3api get-bucket-encryption` |
| **AWS IAM** | Roles, Policies, Instance Profiles | `aws iam get-role`, `aws iam list-attached-role-policies` |
| **AWS ACM** | Certificates | `aws acm describe-certificate` |
| **AWS Route 53** | Hosted Zones, Records | `aws route53 list-resource-record-sets` |
| **AWS ALB** | Load Balancers, Target Groups, Listeners | `aws elbv2 describe-load-balancers`, `aws elbv2 describe-target-health` |
| **PagerDuty** | Services, Escalation Policies, Integrations | PagerDuty REST API (`/services`, `/escalation_policies`) |
| **Sentry** | Projects, DSN | Sentry API (`/api/0/projects/`) |
| **Cloudflare** | DNS Records, SSL Certificates | Cloudflare API (`/zones`, `/dns_records`) |
