# Implementation Loop (TDD)

This is the TDD loop that each agent (or the single-ticket path) follows. The ticket description contains all the details; this loop is the execution pattern:

## Phase 1: Write Failing Tests

```
1. Read ticket's "Write failing tests first" section
2. Create test file at the specified location
3. Write test cases covering:
   - Happy path (from Given/When/Then acceptance criteria)
   - Error/negative path (at least one per ticket)
   - Tenant isolation (if ticket involves data access)
   - PRD EARS criteria mapped in the ticket
4. Run tests to confirm they FAIL:
   - Web tests: pnpm test --testPathPatterns="<pattern>"
   - Worker tests: pnpm run test --filter=worker -- <file> -t "<name>"
5. If tests pass (shouldn't), investigate — the feature shouldn't exist yet
```

## Phase 2: Implement

```
1. Read ticket's "Implement the solution" section
2. Create/modify files listed in the ticket
3. Follow the code patterns specified:
   - Prisma typed client (not $queryRaw)
   - Zod v4 for validation (import from 'zod/v4')
   - Error format from stack.md
   - JSDoc/TSDoc on public functions
   - No any types, no console.log, no EE imports
4. If ticket flags a Langfuse file modification:
   - Make the smallest possible change
   - Note it for the PR description
```

## Phase 3: Run Tests and Fix

```
LOOP:
  1. Run the specific test suite
  2. Run typecheck: pnpm tc
  3. Run formatter: pnpm run format
  4. IF all pass → proceed to Phase 4 (Final Checks)
  5. IF failures:
     a. Analyze error output
     b. Fix the implementation (not the tests, unless the test itself has a bug)
     c. CONTINUE loop
  6. IF stuck after 3 iterations on the same error:
     a. Re-read the RFC section referenced in the ticket
     b. Check if a Key Invariant or Langfuse Baseline item was missed
     c. If still stuck, report the error to the user and pause
```

## Phase 4: Final Checks

```bash
# Full typecheck across all packages
pnpm tc

# Format entire project
pnpm run format

# Run ALL tests (not just the ones for this ticket)
pnpm test

# Verify the build succeeds
pnpm build:check
```

If any step fails, fix and re-run before proceeding to PR creation.
