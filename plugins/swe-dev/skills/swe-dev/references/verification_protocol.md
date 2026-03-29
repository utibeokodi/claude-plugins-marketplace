# Manual Verification Protocol

## When verification runs

```
1. Read ticket's "Manual validation" section
2. Get the PR number from the PR just created in Step 4
3. Invoke the manual-verify plugin, passing:
   - ticket_key: The JIRA ticket key
   - pr_numbers: The PR number from Step 4
   - validation_steps: The list of manual validation steps from the ticket description
   - task_type: The kind of feature (UI-facing, internal service, BullMQ job)
   - dev_commands: The relevant dev commands (pnpm run dev:web, pnpm run dev:worker, etc.)
4. Wait for manual-verify to complete and return results
5. If manual-verify reports PASS:
   - Record validation results for the implementation summary
6. If manual-verify reports FAIL:
   a. Analyze the failure description from manual-verify
   b. Fix the implementation
   c. Re-run tests (Phase 3)
   d. Run final checks (Phase 4)
   e. Push the fix to the existing PR branch
   f. Re-invoke manual-verify with the same PR number
7. Record final validation results
```

## Multi-ticket / epic mode

In multi-ticket mode, the user chooses the verification strategy before execution begins:

```
Before starting Wave 1, ask the user:

"How should manual verification be handled?"

Option A: Verify each PR individually after creation (default)
  - Each ticket is verified independently after its PR is created
  - Good when tickets are self-contained features

Option B: Skip verification for all PRs (--skip-verify)
  - No manual verification for any ticket
  - Good when the feature only works once all PRs are merged
  - User can run manual-verify manually later: /manual-verify --pr 42,43,44

Option C: Verify only specific tickets
  - User specifies which tickets should be verified (e.g., "only verify OBS-4 and OBS-5")
  - Remaining tickets are skipped with reason noted in PR description
```

The chosen strategy applies to the entire execution run. For Option B, remind the user they can verify all PRs together after merging using `/manual-verify --pr 42,43,44`.
