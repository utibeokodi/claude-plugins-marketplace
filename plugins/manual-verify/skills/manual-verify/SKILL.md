---
name: manual-verify
description: This skill should be used for black-box manual QA verification of UI and application features via Playwright. Triggers on requests like "manually verify this ticket", "test the UI for OBS-3", "/manual-verify OBS-3", "/manual-verify OBS-3 --pr 42", "/manual-verify --pr 42,43,44", or when swe-dev delegates manual validation after tests pass. Supports single PRs or multiple PRs (merges branches into a temporary verification branch). Launches a headed browser, navigates the application using JIRA ticket context and Langfuse documentation, executes validation steps, captures video and screenshot evidence, and returns structured pass/fail results.
argument-hint: "[TICKET-KEY...] [--pr PR-NUMBER,...]"
disable-model-invocation: true
---

# Manual Verify: Black-Box QA Verification via Playwright

Launches a headed Playwright browser and verifies application behavior by executing the manual validation steps defined in JIRA tickets. All testing context comes from JIRA tickets, PR descriptions, and Langfuse documentation. Source code is never read.

## Core Principle: Black-Box Testing Only

**NEVER read source code, component files, route definitions, test files, or PR diffs to understand how a feature works.** Reading implementation details poisons the test context and causes you to verify the implementation rather than the expected behavior.

All expected behavior MUST come from:

| Source | What to extract | How to use it |
|--------|----------------|---------------|
| **JIRA ticket** | Expected behavior, acceptance criteria, manual validation steps, UI navigation instructions for custom features | Primary source of truth for what to test and how to interact with the UI |
| **PR description** | Summary of what changed and which area of the app is affected | Tells you WHERE to test (which pages/features), never HOW the feature is built |
| **Langfuse documentation** | Standard UI navigation patterns, page structure, feature flows for the base product | How to navigate pages, use filters, access settings in the standard Langfuse UI |

### What you MUST NOT read

- Changed source files from the PR diff
- Component files, route definitions, or API handlers
- Test files or test fixtures
- Any file in the codebase for the purpose of understanding how a feature works
- The PR diff itself (only read the PR description via `gh pr view`)

The PR diff metadata (which files were touched) may only be used at the most abstract level: "files in the traces area changed" tells you to test traces. You must never open those files.

## Prerequisites

Before starting, verify:

```
1. Playwright installed:       npx playwright --version
2. Chromium browser available:  npx playwright install chromium  (install if missing)
3. gh CLI authenticated:        gh auth status
4. Dev commands available:      Passed by swe-dev or specified by user
5. Atlassian MCP connected:     Required to fetch JIRA ticket details
```

If Playwright or Chromium is not installed, install them automatically and continue. If `gh` is not authenticated or Atlassian MCP is unavailable, report the blocker and stop.

## Inputs

When invoked by swe-dev, the following inputs are provided:

| Input | Description | Example |
|-------|-------------|---------|
| `ticket_key` | The JIRA ticket key (one or more) | `OBS-3` or `OBS-3, OBS-4, OBS-5` |
| `pr_numbers` | The PR number(s) to verify | `42` or `42, 43, 44` |
| `validation_steps` | Manual validation steps from the ticket description | `["Navigate to /traces, verify filter panel renders", ...]` |
| `task_type` | The kind of feature being tested | `UI-facing`, `internal service`, `BullMQ job` |
| `dev_commands` | Commands to start the application | `pnpm run dev:web`, `pnpm run dev:worker` |

When invoked directly by the user:

```
# Single ticket / single PR
/manual-verify OBS-3
/manual-verify OBS-3 --pr 42

# Multiple PRs (merges all branches into a temporary verification branch)
/manual-verify --pr 42,43,44
/manual-verify OBS-3, OBS-4, OBS-5 --pr 42,43,44
```

When invoked directly (not by swe-dev), the skill does not receive pre-extracted validation steps or task type. Instead, it fetches the JIRA ticket(s) in Step 1a and extracts the manual validation section, acceptance criteria, task type, and dev commands from the ticket description itself.

## Workflow

### Step 1: Gather Context (Black-Box Sources Only)

#### 1a. Fetch the JIRA ticket

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "<ticket-key>",
  contentFormat: "markdown"
)
```

Extract from the ticket:
- **Manual validation section**: The specific steps to execute (this is the test plan)
- **Acceptance criteria**: Expected outcomes for each validation step
- **Task type**: UI-facing, internal service, or BullMQ job
- **UI navigation instructions**: For custom features, the ticket describes where the feature lives and how users interact with it
- **Feature area**: Which part of the application is affected (tracing, prompts, evaluation, dashboards, settings, etc.)

#### 1b. Fetch the PR description (if a PR exists)

```bash
# If PR number is provided
gh pr view <pr-number> --json title,body,labels

# If no PR number, find the PR for this ticket's branch
gh pr list --search "<ticket-key>" --json number,title,body,labels
```

Extract from the PR description:
- **Summary**: What area of the app was changed (not implementation details)
- **Feature area**: Confirms which pages/features to test
- **Test plan section**: Any additional verification notes the developer included

**IMPORTANT**: Use `gh pr view`, NOT `gh pr diff`. Never fetch the code diff.

#### 1c. Fetch Langfuse documentation (on-demand)

Based on the feature area identified in 1a/1b, fetch the relevant Langfuse documentation page. This provides the QA tester's mental model of how the standard UI works.

Load `references/feature_doc_urls.md` for the feature-to-documentation URL mapping.

#### 1d. Build the test context summary

Before proceeding, compile a clear test context that includes ONLY:

```markdown
## Test Context for <TICKET-KEY>

### What to test
[From JIRA ticket: the feature and expected behavior in user terms]

### Validation steps
[From JIRA ticket: the numbered manual validation steps]

### Expected outcomes
[From JIRA ticket: acceptance criteria mapped to each validation step]

### UI navigation
[From JIRA ticket (custom features) + Langfuse docs (standard features):
 how to reach the pages being tested]

### Feature area
[From PR description: which area of the app, e.g., "Traces list page"]

### Task type
[UI-facing / internal service / BullMQ job]
```

This test context is the ONLY reference used during browser automation. No other sources are consulted.

### Step 2: Set Up Git Branch

Before starting the application, ensure the correct code is checked out locally. The approach differs for single vs. multiple PRs.

#### 2a. Single PR

Fetch the PR's branch and check it out:

```bash
# Get the branch name from the PR
PR_BRANCH=$(gh pr view <pr-number> --json headRefName --jq '.headRefName')

# Fetch and checkout the branch (preserving the original branch name)
git fetch origin "$PR_BRANCH"
git checkout "$PR_BRANCH"
git pull origin "$PR_BRANCH"
```

Verify the checkout succeeded:

```bash
# Confirm we are on the expected branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$PR_BRANCH" ]; then
  echo "ERROR: Expected branch $PR_BRANCH but on $CURRENT_BRANCH"
  exit 1
fi
echo "Checked out $PR_BRANCH"
```

#### 2b. Multiple PRs

When verifying multiple PRs together, fetch all branches and merge them into a temporary verification branch:

```bash
# 1. Record the starting branch so we can return to it during cleanup
ORIGINAL_BRANCH=$(git branch --show-current)

# 2. Fetch all PR branch names
PR_BRANCHES=()
for pr in <pr-number-1> <pr-number-2> <pr-number-3>; do
  BRANCH=$(gh pr view "$pr" --json headRefName --jq '.headRefName')
  PR_BRANCHES+=("$BRANCH")
done

# 3. Fetch all branches from origin
for branch in "${PR_BRANCHES[@]}"; do
  git fetch origin "$branch"
done

# 4. Create a temporary verification branch from main
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TMP_BRANCH="tmp/manual-verify-${TIMESTAMP}"
git checkout main
git pull origin main
git checkout -b "$TMP_BRANCH"

# 5. Merge each PR branch into the temporary branch
for branch in "${PR_BRANCHES[@]}"; do
  echo "Merging $branch..."
  git merge "origin/$branch" --no-edit
  if [ $? -ne 0 ]; then
    echo "MERGE CONFLICT merging $branch"
    echo "Conflicting files:"
    git diff --name-only --diff-filter=U
    git merge --abort
    echo "ERROR: Cannot continue. Report conflict to user."
    exit 1
  fi
  echo "Successfully merged $branch"
done

echo "Temporary verification branch ready: $TMP_BRANCH"
echo "Contains merges from: ${PR_BRANCHES[*]}"
```

#### Merge conflict handling

If any merge conflict occurs during multi-PR branch setup:

1. Abort the merge: `git merge --abort`
2. Report the conflict to the user, including:
   - Which branch caused the conflict
   - Which files are conflicting
   - The list of branches that were successfully merged before the conflict
3. Ask the user how to proceed:
   - **Option A**: Skip the conflicting PR and verify the rest
   - **Option B**: The user resolves the conflict manually, then the skill continues
   - **Option C**: Abort and verify PRs individually instead
4. Do NOT attempt to auto-resolve merge conflicts

#### Cleanup (after verification completes)

After all validation steps are done (Step 7), clean up the git state:

```bash
# For single PR: no cleanup needed (user's branch is checked out)

# For multiple PRs: delete the temporary branch and return to original branch
git checkout "$ORIGINAL_BRANCH"
git branch -D "$TMP_BRANCH"
echo "Cleaned up temporary branch $TMP_BRANCH, returned to $ORIGINAL_BRANCH"
```

Include the cleanup status in the validation report. If cleanup fails, report it but do not fail the overall verification.

#### Install dependencies after branch checkout

After checking out the branch (single or multi-PR), install dependencies before starting the dev server:

```bash
pnpm install
```

This ensures any new dependencies from the PR branches are available.

### Step 3: Build Test Plan

Transform the validation steps from the JIRA ticket into an executable test plan. Each validation step becomes one or more browser actions with an expected outcome.

```markdown
## Test Plan: <TICKET-KEY>

### Step 1: [validation step from ticket]
- Navigate to: [URL or UI path, derived from ticket description or Langfuse docs]
- Actions: [what to do on the page, derived from ticket description]
- Expected outcome: [what should happen, from acceptance criteria]
- Evidence to capture: [screenshot name]

### Step 2: [next validation step]
...
```

**Rules for building the test plan:**
- Every action and expected outcome must trace back to the JIRA ticket or Langfuse docs
- If the ticket says "navigate to the traces page and verify the new filter", the Langfuse docs tell you traces live at `/project/[projectId]/traces` and have a filter panel in the sidebar
- If the ticket describes a custom feature ("click the new 'Export' button on the dashboard"), use the ticket's description of that feature directly
- If a validation step is ambiguous, include it as-is and note the ambiguity in the report. Do NOT read source code to resolve the ambiguity.

Present the test plan to the user and wait for approval before executing.

### Step 4: Start the Dev Environment

Start the application using the provided dev commands:

```bash
# Start infrastructure (if needed)
pnpm run infra:dev:up

# Start the web server
pnpm run dev:web &

# Start the worker (if needed for the task type)
pnpm run dev:worker &
```

Wait for the dev server to be healthy before proceeding:

```bash
# Poll until the server responds (max 60 seconds, check every 3 seconds)
for i in $(seq 1 20); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    echo "Server is ready"
    break
  fi
  sleep 3
done
```

If the server fails to start within 60 seconds, report the failure and stop.

### Step 5: Launch Playwright Browser

Write and execute a Node.js script to launch a headed Playwright browser with video recording:

Load `references/playwright_launch_script.js` as the base template for launching Playwright with video recording and console error capture. Adapt the validation steps for the current ticket.

**Important**: The skill writes a fresh Playwright script for each test run. It does NOT maintain a library of reusable scripts. Each script is tailored to the specific validation steps from the JIRA ticket.

### Step 6: Execute Validation Loop

For each step in the test plan, follow this agentic browser loop:

```
FOR each validation step:
  1. NAVIGATE to the target page
     - Use page.goto() for direct URL navigation
     - Use accessibility tree + click actions for UI navigation (sidebar links, buttons, tabs)

  2. WAIT for the page to be ready
     - Wait for network idle: page.waitForLoadState('networkidle')
     - Wait for key elements to appear (from Langfuse docs: tables, filter panels, etc.)

  3. CAPTURE "before" state
     - Take accessibility snapshot: page.accessibility.snapshot()
     - Take screenshot: page.screenshot({ path: 'validation/<ticket-key>/screenshots/step-N-before.png', fullPage: true })

  4. PERFORM actions
     - Use accessibility tree to identify interactive elements
     - Prefer role-based selectors: page.getByRole('button', { name: 'Submit' })
     - For text inputs: page.getByLabel('Filter') or page.getByPlaceholder('Search...')
     - For navigation: page.getByRole('link', { name: 'Traces' })
     - NEVER use CSS selectors derived from source code (class names, data-testid)
     - Acceptable selectors: roles, labels, placeholder text, visible text content

  5. WAIT for the action result
     - Wait for navigation: page.waitForURL() or page.waitForLoadState()
     - Wait for network: page.waitForResponse() for API calls
     - Wait for elements: page.waitForSelector() for dynamic content

  6. CAPTURE "after" state
     - Take accessibility snapshot
     - Take screenshot: page.screenshot({ path: 'validation/<ticket-key>/screenshots/step-N-after.png', fullPage: true })

  7. VERIFY the expected outcome
     - Compare the "after" accessibility snapshot against the expected outcome from the test plan
     - For visual assertions (layout, colors, styling): analyze the screenshot
     - For data assertions (table contents, form values): read from accessibility tree
     - For error assertions (toast messages, validation errors): check for alert/status roles in accessibility tree

  8. RECORD the result
     - PASS: Expected outcome matches actual state
     - FAIL: Expected outcome does not match. Record:
       - What was expected (from JIRA ticket)
       - What actually happened (from accessibility snapshot + screenshot)
       - The screenshot showing the failure
     - SKIP: Step could not be executed (e.g., prerequisite page not accessible). Record reason.

  9. ON FAILURE: retry once
     - Refresh the page
     - Re-attempt the validation step
     - If it fails again, mark as FAIL and continue to the next step
     - Do NOT retry more than once per step
```

#### Selector Strategy (Black-Box Compatible)

Since the skill cannot read source code, selectors must be derived from what a user sees:

| Approach | Example | When to use |
|----------|---------|-------------|
| **Role + name** | `page.getByRole('button', { name: 'Create Project' })` | Buttons, links, headings, tabs |
| **Label** | `page.getByLabel('Email')` | Form inputs with labels |
| **Placeholder** | `page.getByPlaceholder('Search traces...')` | Search boxes, filter inputs |
| **Text content** | `page.getByText('No traces found')` | Static text, messages, toasts |
| **Alt text** | `page.getByAltText('Project logo')` | Images |
| **URL navigation** | `page.goto('/project/.../traces')` | Direct page access |

**NEVER use**: CSS class selectors, data-testid attributes, XPath based on DOM structure, or any selector that requires knowledge of the source code.

#### Handling Authentication

The Langfuse UI requires authentication. Handle this at the start of the validation loop:

```
1. Navigate to the application root (http://localhost:3000)
2. If redirected to /auth/sign-in:
   a. Check if the JIRA ticket or user specifies test credentials
   b. If not, ask the user for credentials and pause
   c. Fill in the login form using role-based selectors
   d. Submit and wait for redirect to the dashboard
   e. Save the browser storage state for reuse:
      context.storageState({ path: 'validation/.auth-state.json' })
3. If a saved auth state exists from a previous run:
   context = await browser.newContext({ storageState: 'validation/.auth-state.json' })
```

#### Handling Dynamic Content

Langfuse pages frequently load data asynchronously. Wait strategies:

```
- After navigation: page.waitForLoadState('networkidle')
- For tables: Wait for at least one row to appear, OR for an empty-state message
- For filters: Wait for the filter panel to be interactive (not disabled/loading)
- For modals/drawers: Wait for the dialog role to appear
- For toasts/notifications: Wait up to 5 seconds for alert/status role
- For loading spinners: Wait for them to disappear before asserting
```

### Step 7: Compile Evidence

After all validation steps complete, organize the evidence:

```bash
# Directory structure
validation/<ticket-key>/
├── report.md
├── screenshots/
│   ├── step-1-before.png
│   ├── step-1-after.png
│   ├── step-2-before.png
│   ├── step-2-after.png
│   └── step-2-failure.png    # Only present for failed steps
├── videos/
│   └── full-session.webm     # Complete session recording
└── logs/
    └── console-errors.log    # Browser console errors captured during the session
```

#### Generate the validation report

Load `references/report_templates.md` for the `report.md` format. Write `validation/<ticket-key>/report.md` using the Validation Report template in that file.

### Step 8: Return Results and Clean Up

#### When called by swe-dev

Return a structured result that swe-dev can act on. Load `references/report_templates.md` for the swe-dev Result Format template.

**On FAIL**: swe-dev will analyze the failure details, fix the implementation, re-run tests, and re-invoke manual-verify. The failure description must be specific enough for swe-dev to identify what to fix WITHOUT reading the validation report's screenshots (since swe-dev is a text-based agent). Describe failures in terms of user-visible behavior: "The 'Create Organization' button is present but clicking it shows a 500 error toast" rather than "The API returned a 500."

#### When invoked directly by the user

Present the full validation report in the conversation, including:
- The test plan that was executed
- Pass/fail status for each step
- Screenshot paths for the user to review
- Video recording path
- Any console errors
- Recommendations for failed steps

## Langfuse UI Navigation Reference

Load `references/langfuse_ui_reference.md` for standard Langfuse UI navigation patterns.

## Handling Edge Cases

Load `references/edge_cases.md` and check applicable cases.

---

## Configuration

| Setting | Source | Default |
|---------|--------|---------|
| Evidence directory | This skill | `validation/<ticket-key>/` |
| Browser | Playwright | Chromium (headed) |
| Viewport | This skill | 1280x720 |
| Video recording | This skill | Enabled, per-session |
| Slow motion | This skill | 500ms between actions |
| Page load timeout | This skill | 30 seconds |
| Action timeout | This skill | 10 seconds |
| Max retries per step | This skill | 1 |
| Auth state file | This skill | `validation/.auth-state.json` |
| Dev server URL | Project config / user | `http://localhost:3000` |
| Dev server command | swe-dev / user | `pnpm run dev:web` |
| Worker command | swe-dev / user | `pnpm run dev:worker` |
| Infrastructure command | swe-dev / user | `pnpm run infra:dev:up` |

## Self-Improvement Protocol

Load `references/self_improvement_protocol.md` and follow the protocol described there for monitoring corrections and writing improvement plans.
