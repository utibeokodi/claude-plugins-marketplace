# Edge Cases

## Ticket has no implementation steps (External Setup)

Some tickets (External Setup) require human action, not code. The skill should:
- Detect the ticket type from its description or JIRA issue type
- Skip it with a clear message: "OBS-2 is an External Setup task — requires manual configuration, skipping"
- Do NOT attempt to implement it

## Ticket is a Terraform/infrastructure task

Terraform tasks (CloudWatch alarms, PagerDuty services, AWS provisioning) should be delegated to the `infra-dev` plugin:
- Detect Terraform tasks from ticket description (mentions Terraform, CloudWatch alarms, infrastructure provisioning, IaC)
- Report: "OBS-9 is a Terraform task — delegating to infra-dev plugin"
- Invoke the `infra-dev` plugin with the ticket details
- If `infra-dev` is not installed, skip and note: "OBS-9 requires infra-dev plugin (not installed)"

## Ticket references an unimplemented dependency

If a ticket says "Blocked by: OBS-3" and OBS-3 is not yet merged:
- In single-ticket mode: warn the user and ask if they want to proceed anyway
- In epic/multi-ticket mode: the wave system handles this automatically (OBS-3 runs in an earlier wave)

## Tests pass on first run (before implementation)

This means either:
- The feature already exists (check git log)
- The tests are wrong (not testing what they should)
- Investigate before proceeding. Report to user.

## Merge conflicts between PRs in the same wave

Merge conflicts between PRs in the same wave are the user's responsibility. The skill does NOT auto-resolve conflicts because:
- The user should review and approve all conflict resolutions
- Merging order is a user decision (which PR goes first affects the rebase)
- Auto-resolution can silently introduce bugs in non-trivial conflicts

When reporting wave results, note which PRs may conflict:
```
Note: PR #15 (OBS-4) and PR #16 (OBS-5) both modify
packages/shared/src/saas/multi-tenancy/index.ts.
Merge one first, then the other PR may need a rebase.
```

## Ticket description is missing key sections

If the ticket doesn't follow the expected template (no acceptance criteria, no file paths):
- Read the RFC and PRD referenced in the ticket to fill in gaps
- If no RFC is referenced, ask the user for guidance
- Do NOT guess at implementation details

## Agent fails mid-implementation

If a worktree agent encounters an unrecoverable error:
- The worktree is preserved (changes are not lost)
- Report the error, the worktree path, and what was completed
- The user can resume manually or re-run just that ticket

## Rate limiting on JIRA API

When fetching many tickets for a large epic:
- Batch API calls where possible (use JQL search instead of individual fetches)
- If rate limited, wait and retry with backoff
- Report progress: "Fetched 15/23 tickets..."
