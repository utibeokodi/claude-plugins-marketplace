Several RFCs define BullMQ repeatable/cron jobs (usage sync, downgrade checks, queue-depth metrics). These are distinct from service methods and API routes. Use this template:

````markdown
## Objective

Implement the `[job name]` BullMQ repeatable job that [what it does].

## Context

**RFC:** [path to the RFC file]
**Worker location:** `worker/src/saas/[job-file].ts`
**Queue registration:** `packages/shared/src/server/queues.ts` (existing Langfuse file — rebase-sensitive)
**Worker entrypoint:** `worker/src/app.ts` (existing Langfuse file — rebase-sensitive)
**Test runner:** Vitest (worker tests use Vitest, not Jest)

**Schedule:** [e.g., "Every hour", "Daily at 00:00 UTC", "Every 1 minute"]
**BullMQ repeat config:** `{ pattern: '[cron expression]' }` or `{ every: [milliseconds] }`

## Implementation Steps

### 1. Create feature branch

```bash
git checkout -b feat/[ticket-key]-[short-description] main
```

### 2. Define the queue

Add the queue definition to `packages/shared/src/server/queues.ts`:
- Queue name: `[queue-name]`
- This modifies an existing Langfuse file — record in rebase checklist

### 3. Write failing tests first

**Test file:** `worker/src/__tests__/[job-name].test.ts`
**Test runner:** Vitest

```bash
# Run worker tests
pnpm run test --filter=worker -- [job-name] -t "[test description]"
```

Write tests that cover:
- [Happy path: job processes successfully]
- [Error path: external service unavailable — job retries]
- [Isolation: job processes only the target tenant's data]
- [Idempotency: running the job twice produces the same result]
- [PRD EARS criteria for this job, if any]

### 4. Implement the job processor

**Files to create/modify:**
- `worker/src/saas/[job-file].ts` — job processor function
- `packages/shared/src/server/queues.ts` — queue definition (EXISTING FILE)
- `worker/src/app.ts` — register processor (EXISTING FILE)

**Job processor pattern:**
```typescript
// worker/src/saas/[job-file].ts
import { Job } from "bullmq";

export async function process[JobName](job: Job) {
  const { orgId } = job.data;
  if (!orgId) throw new Error("Missing orgId in job payload");
  // ... implementation
}
```

**Registration in worker entrypoint:**
```typescript
// In worker/src/app.ts, add:
import { process[JobName] } from "./saas/[job-file]";
// Register with the queue worker
```

### 5. Run tests and validate

```bash
pnpm run test --filter=worker -- [job-name]
pnpm tc
pnpm run format
```

### 6. Manual validation

```bash
pnpm run dev:worker
# Verify job executes on schedule by checking worker logs
# Verify side effects (Redis state, DB records, external API calls)
```

## Acceptance Criteria

- [ ] Queue defined in `packages/shared/src/server/queues.ts`
- [ ] Processor registered in `worker/src/app.ts`
- [ ] Job includes orgId in payload and rejects jobs without it
- [ ] Repeatable schedule configured correctly
- [ ] Tests passing (Vitest)
- [ ] Partial failure in one tenant does not block other tenants
- [ ] [PRD criteria in Given/When/Then format]
````
