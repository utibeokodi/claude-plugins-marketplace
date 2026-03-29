When spawning a planning agent for parallel plan generation, use `isolation: "worktree"` so any accidental writes are safely discarded:

```
Agent(
  prompt: <planning prompt below>,
  isolation: "worktree",
  run_in_background: true
)
```

Planning prompt:

```
You are creating an implementation plan for JIRA ticket <TICKET-KEY>.
DO NOT write any code, create files, or modify anything. Only produce a plan.

## Ticket Details
<paste full ticket description from JIRA>

## Instructions

1. Read the reference docs listed in the ticket's Context section:
   - The RFC file
   - CLAUDE.md for project conventions
   - .specs/CONSTITUTION.md for inviolable rules
   - .specs/stack.md for engineering standards
   - The pattern-to-follow file referenced in the ticket
2. Explore the relevant parts of the codebase:
   - Look at adjacent modules for patterns to follow
   - Check the Prisma schema for existing models
   - Read any files the ticket says to modify
3. Identify any ambiguities, unknowns, or assumptions. If ANYTHING is
   unclear, include it in a "Clarifying Questions" section. Never assume.
   The user will answer these questions before the plan is finalized.
4. Produce a DETAILED plan following this structure:
   - Approach (2-3 sentences)
   - Files to create (exact paths, with purpose for each)
   - Files to modify (exact paths, what changes, whether it's a Langfuse file)
   - Test strategy (specific test cases in Given/When/Then format)
   - Key decisions (patterns chosen, what's reused vs. new, with rationale)
   - Clarifying questions (anything unclear — NEVER assume)
   - Risks / open questions (ambiguities, deviations from ticket)
   - Estimated complexity (S/M/L)
5. DO NOT abbreviate the plan. Include the same level of detail regardless
   of whether this is for a single ticket or part of a batch.
6. Return the plan as markdown
```
