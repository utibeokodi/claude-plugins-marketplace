When spawning a worktree agent for parallel execution, use this prompt structure. The approved plan is included so the agent follows the agreed-upon approach:

```
You are implementing JIRA ticket <TICKET-KEY>.

## Ticket Details
<paste full ticket description from JIRA>

## Approved Implementation Plan
<paste the plan that was approved by the user in Step 3>

IMPORTANT: Follow this approved plan exactly. Do not deviate from the agreed-upon
approach, file paths, or test strategy unless you encounter a technical blocker.
If you must deviate, document the reason in the PR description.

## Instructions

1. Create a feature branch: feat/<ticket-key>-<short-description>
2. Read the reference docs listed in the ticket's Context section
3. Follow the TDD loop using the test cases from the approved plan:
   a. Write failing tests first (use the Given/When/Then cases from the plan)
   b. Implement the solution (create/modify the files listed in the plan)
   c. Run tests until green
   d. Run typecheck (pnpm tc) and formatter (pnpm run format)
4. Run final checks (full test suite, build)
5. Create a PR following .github/PULL_REQUEST_TEMPLATE.md
6. Transition the JIRA ticket to "In Review"
7. If manual verification is enabled (not --skip-verify), invoke the manual-verify
   plugin with:
   - ticket_key: <TICKET-KEY>
   - pr_numbers: <the PR number just created>
   - validation_steps: <manual validation steps from the ticket description>
   - task_type: <UI-facing | internal service | BullMQ job>
   - dev_commands: <pnpm run dev:web, pnpm run dev:worker, etc.>
   If manual-verify reports FAIL, fix the implementation, re-run tests and final
   checks, push the fix to the PR branch, and re-invoke manual-verify.
   If --skip-verify, note in the PR description: "Manual verification skipped: [reason]."

## Key Rules
- Tests BEFORE implementation (TDD is mandatory)
- No any types, no console.log, no imports from /ee/
- All queries must include tenant-scoping (org_id or project_id)
- Follow the error format from stack.md
- If a Langfuse file modification is flagged, make the smallest possible change
- Follow the approved plan — do not add scope or change the approach

## JIRA Connection
- Cloud ID: <cloud-id>
- Ticket: <ticket-key>

## Git
- Branch from: <main OR blocker's feature branch, as approved in branching plan>
- PR target: main
```
