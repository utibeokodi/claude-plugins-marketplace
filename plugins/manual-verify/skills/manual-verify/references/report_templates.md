# Report Templates

## Validation Report (report.md)

Write `validation/<ticket-key>/report.md` using this format:

```markdown
# Validation Report: <TICKET-KEY>

**Date**: <timestamp>
**Status**: PASS / FAIL / PARTIAL
**Branch**: <branch name or temporary merge branch>
**PRs verified**: <PR number(s)>
**Steps**: X passed, Y failed, Z skipped

## Results

### Step 1: [validation step name]
**Status**: PASS
**Expected**: [from JIRA ticket]
**Actual**: [from accessibility snapshot / screenshot analysis]
**Evidence**: [screenshots/step-1-before.png](screenshots/step-1-before.png), [screenshots/step-1-after.png](screenshots/step-1-after.png)

### Step 2: [validation step name]
**Status**: FAIL
**Expected**: [from JIRA ticket]
**Actual**: [what actually happened]
**Evidence**: [screenshots/step-2-failure.png](screenshots/step-2-failure.png)
**Failure details**: [Specific, actionable description of what went wrong.
Include what the user would see, not implementation details.]

## Console Errors
[Any browser console errors captured during the session.
Only include errors that occurred during validation steps, not pre-existing noise.]

## Video Recording
Full session: [videos/full-session.webm](videos/full-session.webm)
```

## swe-dev Result Format (Step 8)

When called by swe-dev, return a structured result using this format:

```markdown
## manual-verify result: <TICKET-KEY>

**Status**: PASS | FAIL
**Summary**: [One-line summary, e.g., "UI verified" or "Filter panel does not render after page load"]
**Branch**: <branch name or temporary merge branch>
**PRs verified**: <PR number(s)>
**Cleanup**: <"No cleanup needed" for single PR, or "Temporary branch deleted, returned to <original-branch>" for multi-PR>

### Steps
| # | Step | Status | Evidence |
|---|------|--------|----------|
| 1 | [name] | PASS | step-1-after.png |
| 2 | [name] | FAIL | step-2-failure.png |

### Failure Details (if any)
[For each failed step, describe:]
- What was expected (from the JIRA ticket)
- What actually happened (from the browser)
- Screenshot reference

### Evidence Directory
validation/<ticket-key>/
```
