# Report Output Format

Use this exact structure when assembling the review report. Replace placeholders with actual values.

---

## PR Review: {PR_TITLE} (#{PR_NUMBER})

**PR:** {PR_URL}
**JIRA:** {TICKET_KEY} - {TICKET_SUMMARY} ({JIRA_URL})
**Linked Docs:** {COUNT} documents ({DOC_TITLES_COMMA_SEPARATED})
**CI Status:** {PASSING|FAILING|RUNNING|NOT CONFIGURED}
**Reviewed:** {DATE}

---

## Context Summary

### What This PR Changes
{2-4 sentence summary of the code changes, derived from the diff and PR description}

### What The Ticket Requires
{2-4 sentence summary of the ticket/PRD requirements and acceptance criteria}

### Key Linked Documents
| Document | Type | Relevance |
|----------|------|-----------|
| {title} | PRD / RFC / Design Doc / Confluence | {one-line relevance to this PR} |

---

## Tests {STATUS}

{STATUS is one of: [PASS], [FAIL], [WARN], [SKIP]}

**CI:** {passed X/Y checks | failed N checks | not configured}
**Local Run:** {passed X/Y | skipped (CI passed) | failed, see below}

{If issues found:}

### Test Issues

| # | Severity | Issue | File | Recommendation |
|---|----------|-------|------|----------------|
| 1 | {HIGH/MEDIUM} | {description} | {file:line} | {what to do} |

{If local tests failed:}

### Test Failure Output
```
{truncated test output, max 50 lines, focused on failure messages}
```

{If no issues:}

All tests follow black-box testing principles with adequate coverage of the changed code paths.

---

## Requirements Coverage {STATUS}

{STATUS is one of: [PASS], [PARTIAL], [FAIL]}

| # | Requirement (from ticket/PRD) | Status | Notes |
|---|-------------------------------|--------|-------|
| 1 | {requirement text} | {Implemented / Missing / Partial} | {file:line or explanation} |

{If changes beyond ticket scope:}

### Out-of-Scope Changes
| File | Change | Notes |
|------|--------|-------|
| {file} | {what changed} | {why it may be beyond ticket scope} |

---

## Security {STATUS}

{STATUS is one of: [PASS], [N issues found]}

{If issues found:}

| # | Severity | File:Line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | {CRITICAL/HIGH/MEDIUM} | {file:line} | {description} | {what to do} |

{If no issues:}

No security issues found above confidence threshold.

---

## Performance {STATUS}

{Same table format as Security}

---

## API Compatibility {STATUS}

{Same table format as Security}

---

## Observability {STATUS}

{Same table format as Security}

---

## Accessibility {STATUS}

{Same table format as Security. Only include this section if the PR touches UI/frontend code. If no UI changes, output: "N/A - No UI changes in this PR."}

---

## Dependency Risk {STATUS}

{Same table format as Security. Only include this section if the PR adds/modifies dependencies. If no dependency changes, output: "N/A - No dependency changes in this PR."}

---

## Architecture Fit {STATUS}

{Same table format as Security}

---

## Maintainability {STATUS}

{Same table format as Security}

---

## Summary

| Dimension | Status | Issues |
|-----------|--------|--------|
| Tests | {PASS/FAIL/WARN/SKIP} | {count or 0} |
| Requirements | {PASS/PARTIAL/FAIL} | {count missing or 0} |
| Security | {PASS/WARN} | {count} |
| Performance | {PASS/WARN} | {count} |
| API Compat. | {PASS/WARN} | {count} |
| Observability | {PASS/WARN} | {count} |
| Accessibility | {PASS/WARN/N/A} | {count} |
| Dependency Risk | {PASS/WARN/N/A} | {count} |
| Architecture | {PASS/WARN} | {count} |
| Maintainability | {PASS/WARN} | {count} |

**Recommendation:** {One sentence: "Ready to merge" / "Address N critical/high issues before merging" / "Significant gaps in requirements coverage, discuss with ticket author"}

---

## Severity Definitions

- **CRITICAL**: Will cause a bug, security vulnerability, or data loss in production. Must fix before merge.
- **HIGH**: Likely to cause issues or significantly degrades quality. Strongly recommended to fix.
- **MEDIUM**: Worth improving but not blocking. Address if time permits.
- **LOW**: Minor suggestion for polish. Optional.

## Notes on Conditional Sections

- **Accessibility**: Only include if the PR modifies frontend/UI files (HTML, JSX, TSX, CSS, SCSS, Vue, Svelte templates). Otherwise output "N/A".
- **Dependency Risk**: Only include if the PR adds, removes, or updates entries in package.json, requirements.txt, Cargo.toml, go.mod, or equivalent dependency manifests. Otherwise output "N/A".
- All other dimensions are always included.
