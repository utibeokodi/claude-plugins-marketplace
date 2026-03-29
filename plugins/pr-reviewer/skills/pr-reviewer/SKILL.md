---
name: pr-reviewer
description: This skill should be used when reviewing a GitHub pull request with full JIRA context. Triggers on requests like "review this PR", "review PR #42", "/pr-reviewer #42", "/pr-reviewer PROJ-123 #42", or when users want a comprehensive code review that checks test coverage (black-box philosophy), runs tests locally, verifies implementation matches the JIRA ticket, and reviews code across 8 dimensions (Security, Performance, API/Breaking Changes, Observability, Accessibility, Dependency Risk, Architecture Fit, Maintainability). Supports posting findings as a GitHub PR comment via the --comment flag.
argument-hint: "[TICKET-KEY] #PR-number [--comment] [--depth N] [--model MODEL]"
disable-model-invocation: true
---

# PR Reviewer: Comprehensive Code Review with JIRA Context

Performs end-to-end PR code review by fetching the JIRA ticket and linked documents (PRDs, RFCs, design docs), reviewing tests for coverage and black-box correctness, optionally running tests locally, verifying the implementation matches ticket requirements, and reviewing code across 8 quality dimensions.

## Overview

This skill reviews a GitHub PR in 9 sequential steps:

1. Resolve the PR and extract the JIRA ticket key
2. Fetch the JIRA ticket and follow linked documents for context
3. Offer to pull the PR branch locally for review
4. Output a context summary with per-file change descriptions and VSCode-clickable links
5. Review tests for coverage, black-box philosophy, and structure
6. Run tests locally (skip if CI already passed)
7. Review code against ticket requirements
8. Run 8-dimension code review via parallel subagents
9. Compile and output the review report

All write actions (posting GitHub comments) require explicit user approval.

## When to Use

Invoke this skill when:
- User requests: "review PR #42"
- User says: "review this PR"
- User provides: "/pr-reviewer #42"
- User provides: "/pr-reviewer PROJ-123 #42" (with explicit ticket key)
- User provides: "/pr-reviewer #42 --comment" (to post findings as a PR comment after approval)
- User needs: comprehensive code review with JIRA/PRD context

## Prerequisites

- Atlassian MCP server connected (to fetch JIRA tickets and Confluence pages)
- GitHub CLI authenticated (`gh auth status`)
- PR must be in a GitHub repository
- For test execution: project dependencies installed

## Configuration

| Setting | Default | Flag | Description |
|---------|---------|------|-------------|
| Link follow depth | 3 | `--depth N` | Max depth for following links from the JIRA ticket. Depth 1 = direct links. Depth 2 = links found in those documents. Prevents infinite loops. |
| Model | inherit | `--model MODEL` | Model for review subagents (opus, sonnet, haiku). Default inherits from the parent conversation. |
| Confidence threshold | 80 | `--threshold N` | Minimum confidence score (0-100) to include a finding in the report. |

Example: `/pr-reviewer #42 --depth 2 --model sonnet --threshold 85`

---

## Workflow

### Step 1: Resolve PR and Extract JIRA Ticket

Parse the invocation arguments to identify:
- **PR number or URL** (required, from argument)
- **JIRA ticket key** (optional, from argument or extracted from PR metadata)
- **Flags**: `--comment`, `--depth N`, `--model MODEL`, `--threshold N`

Fetch PR metadata and CI status in parallel:

```bash
gh pr view <PR-number> --json title,body,headRefName,url,baseRefBranch,author
```

```bash
gh pr checks <PR-number> --json name,state,conclusion
```

Extract the JIRA ticket key using this cascade (first match wins):

1. **Explicit argument**: User provided it directly (e.g., `/pr-reviewer PROJ-123 #42`)
2. **PR title**: Match `^([A-Z][A-Z0-9]+-\d+)` at the start, or `[:\s]([A-Z][A-Z0-9]+-\d+)` anywhere
3. **Branch name** (headRefName): Match `([A-Z][A-Z0-9]+-\d+)` anywhere (e.g., `feat/PROJ-123-description`)
4. **PR body**: Match `atlassian\.net/browse/([A-Z][A-Z0-9]+-\d+)` for Jira URLs, or `\[([A-Z][A-Z0-9]+-\d+)\]` for bracket references

If no ticket key is found, ask the user: "No JIRA ticket key found in the PR title, branch name, or description. Please provide the ticket key (e.g., PROJ-123) or 'none' to skip JIRA context and review code only."

Get the Atlassian cloudId (needed for all JIRA/Confluence calls):

```
mcp__claude_ai_Atlassian__getAccessibleAtlassianResources()
```

Use the first site's cloudId from the response.

### Step 2: Fetch JIRA Ticket and Follow Linked Documents

Fetch the JIRA ticket:

```
mcp__claude_ai_Atlassian__getJiraIssue(
  cloudId: "<cloud-id>",
  issueIdOrKey: "<ticket-key>",
  contentFormat: "markdown"
)
```

Fetch remote issue links to find linked documents:

```
mcp__claude_ai_Atlassian__getJiraIssueRemoteIssueLinks(
  cloudId: "<cloud-id>",
  issueIdOrKey: "<ticket-key>"
)
```

#### Link Following Strategy

Follow ALL links that could provide context for the review. Links may include:

- **GitHub markdown files** (PRDs, RFCs, design docs): Fetch via `Read` (if local path) or `WebFetch` (if URL)
- **Confluence pages**: Fetch via `mcp__claude_ai_Atlassian__getConfluencePage`
- **Other JIRA tickets** (linked issues like "blocks", "relates to"): Fetch via `getJiraIssue`
- **Any URL in the ticket body** that looks like documentation (markdown files, wiki pages, design docs)

Also scan the ticket body for inline links using patterns:
- `https?://[^/]+\.atlassian\.net/wiki/[^\s\)]+` (Confluence URLs)
- `https?://github\.com/[^\s\)]+\.md` (GitHub markdown files)
- `https?://[^/]+\.atlassian\.net/browse/[A-Z][A-Z0-9]+-\d+` (other JIRA tickets)

#### Depth Tracking

Maintain a **visited set** of URLs to prevent cycles. Track the current depth for each link:

```
depth 0: The JIRA ticket itself
depth 1: Documents directly linked from the ticket
depth 2: Documents linked from depth-1 documents
depth 3: Documents linked from depth-2 documents (default max)
```

Stop following links when:
- Current depth exceeds the configured max depth (default 3)
- URL is already in the visited set
- URL is not accessible (404, auth error) - skip with a note
- URL does not look like a document (e.g., image files, binary assets)

The PRD is the most important linked document. It contains acceptance criteria and test requirements that inform Steps 5, 6, and 7.

#### If Atlassian MCP Is Not Connected

Output a warning: "Atlassian MCP not configured. Skipping JIRA ticket and linked document fetching. Proceeding with code-only review."

Then skip to Step 3 with only PR metadata as context.

### Step 3: Offer to Pull Branch Locally

After gathering context, offer to check out the PR branch locally so the user can browse the code in their editor:

```
Would you like me to pull the PR branch locally for review?
Branch: <headRefName>
Command: git fetch origin <headRefName> && git checkout <headRefName>
```

If the user accepts, run:

```bash
git fetch origin <headRefName> && git checkout <headRefName>
```

The local branch name MUST match the remote branch name exactly (e.g., if the remote branch is `feat/PROJ-123-add-auth`, the local branch is also `feat/PROJ-123-add-auth`). Do not rename or prefix the branch.

If the user declines, proceed without checking out.

### Step 4: Output Context Summary

Before reviewing any code, output a structured summary so the user understands the full context.

First, get the list of changed files with their status:

```bash
gh pr diff <PR-number> --name-only
```

Also get the diff stat for line counts:

```bash
gh pr view <PR-number> --json files --jq '.files[] | "\(.path)\t\(.additions)\t\(.deletions)"'
```

Output the summary using VSCode-clickable file paths with line numbers (format: `file/path.ts:1`):

```markdown
## Context Summary

**PR:** <title> (#<number>) by <author>
**Branch:** <headRefName> -> <baseRefBranch>
**URL:** <PR URL>

**JIRA:** <ticket-key> - <ticket summary>
**Status:** <ticket status> | **Assignee:** <assignee>
**JIRA URL:** <link>

**Linked Documents:**
| # | Document | Type | Depth |
|---|----------|------|-------|
| 1 | <title> | PRD / RFC / Design Doc / Confluence / JIRA | <depth level> |
| 2 | <title> | ... | ... |

**CI Status:** <X/Y checks passing | N failed | still running | not configured>

### What This PR Changes
<2-4 sentence high-level summary derived from the diff and PR description>

### What The Ticket Requires
<2-4 sentence summary of the ticket/PRD requirements and acceptance criteria>

### Changed Files

| Status | File | +/- | Summary |
|--------|------|-----|---------|
| Added | `src/auth/ratelimit.ts:1` | +120 | Rate limiting middleware for auth endpoints |
| Modified | `src/auth/middleware.ts:45` | +15/-3 | Added rate limiter integration to auth chain |
| Modified | `src/config/env.ts:12` | +8/-0 | Added RATE_LIMIT_MAX and RATE_LIMIT_WINDOW env vars |
| Added | `src/auth/__tests__/ratelimit.test.ts:1` | +85 | Unit tests for rate limiting logic |
| Modified | `package.json:35` | +2/-0 | Added rate-limiter-flexible dependency |
```

File paths MUST use the format `path/to/file.ts:LINE` where LINE is:
- For **added files**: `:1` (start of file)
- For **modified files**: the line number of the first change in the diff

This format makes paths clickable in VSCode terminals, allowing the user to jump directly to the relevant code.

Each file gets a one-line summary describing what changed in that file (not just "modified", but the actual nature of the change).

Wait for user acknowledgment or proceed after outputting the summary.

### Step 5: Review Tests

Fetch the PR diff to identify changed files:

```bash
gh pr diff <PR-number>
```

From the diff, identify:
- **New test files** added in this PR
- **Modified test files** changed in this PR
- **Source files changed** (to assess what needs test coverage)
- **Test file mapping**: For each changed source file, look for corresponding test files using common patterns (`*.test.*`, `*.spec.*`, `__tests__/`, `test_*`)

Load `references/review_dimensions.md` and use the **Test Review Checklist** section.

Analyze each test file for:

1. **Coverage**: Do tests cover all changed/new code paths? Are acceptance criteria from the PRD mapped to specific test cases?
2. **Black-box philosophy**: Do tests only interact through public interfaces? Flag any test that accesses internal state, mocks private methods, or would break from a refactor that preserves behavior.
3. **Structure**: Do tests follow Arrange/Act/Assert or Given/When/Then? Are test names descriptive? Is there shared mutable state between tests?
4. **Completeness**: Are there negative/error path tests? Are edge cases from the PRD covered?
5. **Runnability**: Are all imports present? Do fixtures exist? Are there hard-coded paths? Are dependencies available?

For each issue found, assign a confidence score 0-100:
- 90-100: Clear violation with direct evidence in the code
- 80-89: Likely issue based on the checklist and observable patterns
- Below 80: Discard (speculative or context-dependent)

### Step 6: Run Tests (Skip if CI Passed)

Check the CI status collected in Step 1.

**If all checks concluded with SUCCESS**:
```
[SKIP] Test execution: CI checks passed (X/Y), skipping local run.
```

**If CI failed, is still running, or is not configured**:

Detect the test runner using this cascade:
1. Check `package.json` for `test`, `test:unit`, `test:integration` scripts
2. Check for config files: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `setup.cfg`, `go.mod`, `Cargo.toml`
3. Check `Makefile` for test targets
4. If none detected, ask the user: "Could not detect the test runner. Please provide the test command (e.g., `npm test`, `pytest`, `go test ./...`) or 'skip' to skip test execution."

Find test files relevant to the PR's changed files using `Glob`:
- From changed file `src/auth/token.ts`, search: `**/*token*.test.*`, `**/*token*.spec.*`, `**/auth/*.test.*`, `**/__tests__/auth/**`

Run only the targeted test files first (faster feedback):

```bash
<test-runner> <test-file-patterns>
```

Capture stdout and stderr. Report results:
- **All pass**: `[PASS] Tests: X passed, 0 failed (ran N test files covering changed code)`
- **Failures**: `[FAIL] Tests: X passed, Y failed` with failure output included in the report (max 50 lines, focused on failure messages)

### Step 7: Review Code Against Ticket Requirements

With the ticket details, PRD, linked documents, and diff all in context, assess whether the implementation matches the requirements.

Produce a **requirements gap table**:

| Requirement (from ticket/PRD) | Status | Notes |
|-------------------------------|--------|-------|
| <acceptance criterion 1> | Implemented / Missing / Partial | <file:line or explanation> |
| <acceptance criterion 2> | ... | ... |

Also flag:
- **Out-of-scope changes**: Modifications in the diff that go beyond what the ticket asks for
- **Missing requirements**: Acceptance criteria from the ticket/PRD that have no corresponding code in the diff

If no JIRA ticket was fetched (user said "none"), skip this step and note: "Requirements review skipped (no JIRA ticket provided)."

### Step 8: Eight-Dimension Code Review (Parallel Subagents)

Load `references/review_dimensions.md` for the full checklists.

Spawn up to 8 parallel subagents via `Agent()`. Use the model specified by the `--model` flag (default: inherit from parent). Each subagent receives:
- The full PR diff
- The ticket summary and key requirements
- Their specific dimension's checklist from `references/review_dimensions.md`

The 8 dimensions:

1. **Security** (always run)
2. **Performance** (always run)
3. **API/Breaking Changes** (always run)
4. **Observability** (always run)
5. **Accessibility** (only if PR touches UI/frontend files: HTML, JSX, TSX, CSS, SCSS, Vue, Svelte)
6. **Dependency Risk** (only if PR modifies dependency manifests: package.json, requirements.txt, Cargo.toml, go.mod, etc.)
7. **Architecture Fit** (always run)
8. **Maintainability** (always run)

Each subagent prompt follows this structure:

```
You are reviewing a pull request for {DIMENSION} concerns.

## Task
Review the PR diff below using the checklist provided. For each issue found, return a JSON array of findings. Each finding must include:
- dimension: "{dimension-name}"
- severity: "critical" | "high" | "medium" | "low"
- file: "path/to/file.ts"
- line: 42 (or null if file-level)
- issue: "Clear description of the problem"
- recommendation: "Specific action to fix it"
- confidence: 0-100 (how confident you are this is a real issue, not a false positive)

Only include findings where you are genuinely confident (aim for {THRESHOLD}+). Be precise, not exhaustive. Quality over quantity.

If you find no issues above the confidence threshold, return an empty array: []

## Ticket Context
{ticket summary and key requirements from PRD}

## Checklist for {DIMENSION}
{paste the relevant section from references/review_dimensions.md}

## PR Diff
{full diff}
```

After all subagents return:
1. Parse the JSON findings from each subagent
2. Filter out any finding with `confidence < THRESHOLD` (default 80)
3. Deduplicate: if two dimensions flag the same file+line+issue, keep the one with higher severity
4. Sort by severity (critical > high > medium > low), then by confidence descending

### Step 9: Compile and Output Report

Load `references/output_format.md` for the canonical report template.

Assemble the full report with all findings from Steps 4-8.

**Default mode (no --comment flag)**: Output the complete report directly in the conversation.

**If --comment flag is present**: Do NOT auto-post. Instead:
1. Output the report in the conversation
2. Ask the user: "This is the review report. Would you like me to post it as a comment on PR #<number>?"
3. Only after explicit user confirmation, post via:

```bash
gh pr comment <PR-number> --body "$(cat <<'EOF'
<report markdown>
EOF
)"
```

4. Output confirmation: "Review posted as a comment on PR #<number>."

---

## Edge Cases

### No JIRA Ticket Found
Ask the user to provide the ticket key. Offer "none" to proceed with code-only review (Steps 2, 4 context, and 7 requirements review are skipped/reduced).

### Atlassian MCP Not Connected
Warn and proceed with code-only review. Note in the report header: "JIRA context unavailable."

### CI Checks Still Running
Note in context summary: "CI: X/Y checks running." Proceed with local test execution since CI is not yet conclusive.

### Test Runner Not Detected
Ask the user for the test command. Accept "skip" to skip test execution entirely.

### PR Diff Too Large (10k+ Lines)
Ask the user: "This is a large PR (N files changed, M+ lines). Review all files or focus on specific directories?" Accept a directory filter or "all".

### Link Depth Produces Too Many Documents
If more than 15 documents are fetched across all depths, output a warning: "Fetched N documents. Focusing on the most relevant ones (PRD, RFC, directly linked design docs)." Prioritize PRDs and RFCs over tangentially linked pages.

### Circular Links
The visited set prevents fetching the same URL twice. If a cycle is detected, log it and continue.

### Non-Accessible Links
If a link returns 404, auth error, or is otherwise inaccessible, skip it and note in the context summary: "{URL} - not accessible (skipped)."

### No Issues Found in a Dimension
Output `[PASS]` for that dimension. Do not invent issues to fill the section.

---

## Self-Improvement Protocol

This skill tracks corrections and improvements over time. When the user corrects Claude's behavior while this skill is active, the skill writes those observations to an improvement plan file in the marketplace repository. These plans are later reviewed by the skill author to implement permanent changes to the skill.

### During Execution: Monitor for Corrections

While executing this skill's workflow, watch for signals that the user is correcting your behavior:

**Correction signals to watch for:**
- Direct corrections: "no", "don't do that", "stop", "wrong", "that's not right", "I said..."
- Redirection: "instead, do X", "I meant Y", "use Z approach"
- Repeated instructions: the user restating something they already said (indicates you missed it)
- Frustration indicators: "again", "I already told you", "as I said before"
- Preference expressions: "I prefer", "always do X", "never do Y"
- Approval of non-obvious approaches: "yes exactly", "perfect", "that's the right way" (for approaches that were judgment calls, not obvious from the instructions)

**What to capture for each correction:**
1. **What you did wrong** (or what non-obvious approach worked well)
2. **What the user wanted instead** (or confirmed as correct)
3. **Which workflow step it relates to**
4. **Why the correction matters** (impact on output quality)

### Writing Improvements

After the skill's workflow completes (or at natural breakpoints if the session is long), write or update the improvement plan file at:

```
/Applications/workspace/gen-ai-projects/utibes-plugins-marketplace/improvement-plans/pr-reviewer.md
```

Use this format:

```markdown
# Improvement Plan: pr-reviewer

Last updated: {date}
Total lessons: {count}

## Lessons Learned

### Lesson {N}: {short title}
- **Date:** {date}
- **Workflow Step:** {step name/number}
- **What happened:** {what you did that was corrected, or what approach was confirmed}
- **What to do instead:** {the correct behavior, or the confirmed approach to keep using}
- **Why:** {why this matters for output quality}

## Patterns to Watch For

{Summarize recurring themes from the lessons above. For example, if the user has corrected false positive rates multiple times, note: "User prioritizes precision over recall in findings. Only flag issues with high confidence."}

## Proposed Skill Changes

{If a lesson is clear and repeated enough to warrant a permanent change to the SKILL.md instructions, document the proposed change here. Include which section to modify and the suggested new wording. Proposed changes must keep the skill conforming to Anthropic best practices: SKILL.md under 500 lines (move detail to references/ files), descriptions under 250 characters, and side-effect skills must have disable-model-invocation: true.}

| # | Section | Current Behavior | Proposed Change | Based on Lessons |
|---|---------|-----------------|-----------------|------------------|
| 1 | {section} | {what the skill currently says} | {what it should say} | Lessons {N, M} |
```

### Rules

1. **Never modify SKILL.md directly.** All improvements go to the improvement plan file as proposals for the skill author.
2. **Be specific.** "User didn't like the review" is useless. "User wants findings grouped by file rather than by dimension" is actionable.
3. **Capture successes too.** If you made a judgment call and the user confirmed it was right, record that as a positive lesson so future sessions maintain that behavior.
4. **Deduplicate.** If a new correction matches an existing lesson, update the existing lesson's count or add context rather than creating a duplicate.
5. **Keep it concise.** Target under 50 lessons; if it grows beyond that, consolidate related lessons into patterns.
