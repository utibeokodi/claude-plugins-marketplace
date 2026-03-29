Each plan in the batch uses the **same full Plan Template** as single-ticket mode. Multi-ticket plans are NOT abbreviated. The user needs the same level of detail to make informed approval decisions regardless of how many tickets are being planned.

Present all plans for a wave together, separated by horizontal rules for readability:

```markdown
## Wave 1 Plans (3 tickets)

Use the navigation below to jump to each plan, or review sequentially.

| # | Ticket | Summary | Complexity |
|---|--------|---------|------------|
| 1 | OBS-3 | Add SaaS columns via Prisma migration | S |
| 2 | OBS-6 | Add org_id to ClickHouse tables | S |
| 3 | OBS-7 | Add env var validation | S |

---

## Plan 1/3: OBS-3 — Add SaaS columns via Prisma migration

### Approach
Create a Prisma migration adding slug (TEXT UNIQUE), status (TEXT DEFAULT 'active'),
and settings (JSONB DEFAULT '{}') to the organizations table. Update schema.prisma,
run db:generate to regenerate the Prisma client.

### Files to Create
| File | Purpose |
|------|---------|
| packages/shared/prisma/migrations/YYYYMMDD_add_saas_columns/migration.sql | Prisma migration |

### Files to Modify
| File | Change | Langfuse File? |
|------|--------|----------------|
| packages/shared/prisma/schema.prisma | Add slug, status, settings fields to Organization model | Yes |

### Test Strategy
| Test Case | Type | Given/When/Then |
|-----------|------|-----------------|
| Columns exist | Unit | Given a fresh migration, When I query the organizations table, Then slug/status/settings columns exist |
| Defaults correct | Unit | Given a new organization, When created without explicit values, Then status='active' and settings='{}' |
| Slug unique | Unit | Given org with slug 'acme', When creating another org with slug 'acme', Then P2002 unique constraint error |

### Key Decisions
- Using Prisma migration (not raw SQL) since this is a PostgreSQL schema change
- Adding slug now even though subdomain routing is post-MVP (avoids a future migration)

### Risks / Open Questions
- None identified

### Estimated Complexity
S

---

## Plan 2/3: OBS-6 — Add org_id to ClickHouse tables
[Full Plan Template...]

---

## Plan 3/3: OBS-7 — Add env var validation
[Full Plan Template...]

---

## Approval

Review each plan above. You can:
- **Approve all**: "looks good, proceed"
- **Approve some**: "OBS-3 and OBS-7 look good. For OBS-6, use a different migration approach..."
- **Reject all**: "rethink the approach for all of these because..."
- **Ask questions**: "For OBS-3, why are we adding slug now if subdomain routing is post-MVP?"
```

Only approved plans proceed to Step 4.
