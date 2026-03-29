## Plan: <TICKET-KEY> — <ticket summary>

### Approach
[2-3 sentences: the high-level strategy for implementing this ticket]

### Files to Create
| File | Purpose |
|------|---------|
| [exact path] | [what it contains] |

### Files to Modify
| File | Change | Langfuse File? |
|------|--------|----------------|
| [exact path] | [what changes] | Yes/No |

### Test Strategy
| Test Case | Type | Given/When/Then |
|-----------|------|-----------------|
| [name] | Unit | Given X, When Y, Then Z |
| [name] | Integration | Given X, When Y, Then Z |
| [name] | Negative path | Given X, When Y, Then error Z |

### Key Decisions
- [Decision 1: e.g., "Using Prisma typed client for all queries, no $queryRaw"]
- [Decision 2: e.g., "Reusing Langfuse's existing protectedOrganizationProcedure, not creating new middleware"]

### Clarifying Questions (if any)
[Questions that MUST be answered by the user before implementation. Never assume.]
- [e.g., "The RFC specifies a 300-second TTL for the Redis key, but the PRD says 'short-lived'. Should I use 300 seconds or a different value?"]
- [e.g., "The ticket says to modify auth.ts, but there are two files matching that pattern. Which one: web/src/server/auth.ts or packages/shared/src/server/auth.ts?"]

If there are no clarifying questions, write: "None — ticket and RFC are unambiguous."

### Risks / Open Questions
- [Risks that don't block implementation but should be noted]
- [Any deviation from the ticket's suggested approach, with rationale]

### Estimated Complexity
[S / M / L — based on number of files, test cases, and integration points]
