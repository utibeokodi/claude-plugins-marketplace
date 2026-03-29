Some RFCs depend on external services that must be configured before code implementation can begin. These are non-code tasks (no TDD, no PR) but are critical blockers. The RFC's "Environment Variables" section lists these under "External prerequisites", and the "Dependencies" section may reference "Wraps external service". Use this template:

````markdown
## Objective

Configure [External Service] for [module name] integration.

## Context

**RFC:** [path to the RFC file]
**Module that wraps this service:** [e.g., `packages/shared/src/saas/billing/stripe.ts`]
**Why this must happen first:** [e.g., "The billing service needs Stripe product IDs and webhook signing secrets before any code can reference them"]

## Configuration Steps

### 1. [Service] Account Setup

- [ ] [Step 1: e.g., "Log in to Stripe Dashboard at dashboard.stripe.com"]
- [ ] [Step 2: e.g., "Switch to Test Mode for development"]

### 2. Create Required Resources

- [ ] [Resource 1: e.g., "Create Product: 'AI Observability Platform'"]
- [ ] [Resource 2: e.g., "Create Price: Free tier ($0/month, metered usage)"]
- [ ] [Resource 3: e.g., "Create Price: Starter tier ($49/month, metered usage)"]
- [ ] [Resource 4: e.g., "Create Price: Pro tier ($199/month, metered usage)"]
- [ ] [Resource 5: e.g., "Create Webhook endpoint: https://your-domain/api/webhooks/stripe"]
  - Events to subscribe: [list specific events, e.g., "customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed"]

### 3. Capture Credentials and IDs

Record the following values (these become environment variables):

| Value | Where to Find | Env Variable | Test vs. Live |
|-------|--------------|--------------|---------------|
| [e.g., API Secret Key] | [e.g., Stripe Dashboard > Developers > API Keys] | `STRIPE_SECRET_KEY` | Separate keys per environment |
| [e.g., Webhook Signing Secret] | [e.g., Stripe Dashboard > Developers > Webhooks > Signing secret] | `STRIPE_WEBHOOK_SECRET` | Separate per environment |
| [e.g., Free Price ID] | [e.g., Stripe Dashboard > Products > Free > Price ID] | `STRIPE_PRICE_FREE` | Same in test and live |

### 4. Store Credentials

- [ ] Add values to `.env` for local development (copy from `.env.dev.example`)
- [ ] For production: store in AWS Secrets Manager
- [ ] NEVER commit credentials to the repository
- [ ] Verify test and production credentials are strictly separated

### 5. Verify Setup

- [ ] [Verification step: e.g., "Run a test API call to confirm the key works"]
- [ ] [Verification step: e.g., "Send a test webhook event from Stripe Dashboard and confirm it arrives"]

## Acceptance Criteria

- [ ] All required resources created in [Service]
- [ ] All credentials captured and stored in `.env` (local) and AWS Secrets Manager (production)
- [ ] Test and production credentials are separate
- [ ] Test API call or webhook confirms connectivity
- [ ] No credentials committed to git

## Common External Services and What to Configure

For reference, here are typical setup requirements for services used in this project:

| Service | What to Configure | Key Outputs |
|---------|-------------------|-------------|
| **Stripe** | Products, Prices (per plan tier), Webhook endpoint, Customer portal settings, Smart Retries / dunning config | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Price IDs per plan |
| **Twilio SendGrid** | Sender identity verification, API key, email templates (welcome, quota warning, invoice), domain authentication (DKIM/SPF DNS records), DMARC policy (`p=none` initially), disable click tracking on billing/security templates | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, template IDs |
| **AWS RDS** | PostgreSQL instance (Multi-AZ), security groups, parameter groups, IAM roles | `DATABASE_URL` connection string |
| **AWS ElastiCache** | Redis cluster, security groups, encryption in transit | `REDIS_URL` connection string |
| **AWS S3** | Buckets for backups and exports, lifecycle policies, encryption | `S3_BUCKET_NAME`, `S3_REGION` |
| **AWS ECS** | Cluster, task definitions, service configuration, IAM task role with `cloudwatch:PutMetricData` | Cluster ARN, service names |
| **PagerDuty** | Service, escalation policy, integration key (Events API v2) | `PAGERDUTY_ROUTING_KEY` |
| **Sentry** | Project, DSN, release tracking setup, CI/CD `sentry-cli releases new` integration | `SENTRY_DSN` |
| **ClickHouse** | Version verification (>=25.1.5.5 for CVE patches), disable library_bridge, user/password, CI pipeline version check | `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD` |
| **Cloudflare/Route 53** | DNS records, SSL certificates | Domain configuration |
````
