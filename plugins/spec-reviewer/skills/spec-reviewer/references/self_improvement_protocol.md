# Self-Improvement Protocol: spec-reviewer

This skill tracks corrections and improvements over time. When the user corrects Claude's behavior while this skill is active, the skill writes those observations to an improvement plan file in the marketplace repository. These plans are later reviewed by the skill author to implement permanent changes to the skill.

## During Execution: Monitor for Corrections

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

## Writing Improvements

After the skill's workflow completes (or at natural breakpoints if the session is long), write or update the improvement plan file at:

```
/Applications/workspace/gen-ai-projects/utibes-plugins-marketplace/improvement-plans/spec-reviewer.md
```

Use this format:

```markdown
# Improvement Plan: spec-reviewer

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

{Summarize recurring themes from the lessons above. For example, if the user has corrected severity ratings multiple times, note: "User considers tenant isolation gaps as always Critical, never High."}

## Proposed Skill Changes

{If a lesson is clear and repeated enough to warrant a permanent change to the SKILL.md instructions, document the proposed change here. Include which section to modify and the suggested new wording. Proposed changes must keep the skill conforming to Anthropic best practices: SKILL.md under 500 lines (move detail to references/ files), descriptions under 250 characters, and side-effect skills must have disable-model-invocation: true.}

| # | Section | Current Behavior | Proposed Change | Based on Lessons |
|---|---------|-----------------|-----------------|------------------|
| 1 | {section} | {what the skill currently says} | {what it should say} | Lessons {N, M} |
```

## Rules

1. **Never modify SKILL.md directly.** All improvements go to the improvement plan file as proposals for the skill author.
2. **Be specific.** "User disagreed with a finding" is useless. "User considers missing pagination a Low finding, not Medium, for internal-only APIs" is actionable.
3. **Capture successes too.** If you made a judgment call and the user confirmed it was right, record that as a positive lesson so future sessions maintain that behavior.
4. **Deduplicate.** If a new correction matches an existing lesson, update the existing lesson's count or add context rather than creating a duplicate.
5. **Keep it concise.** Target under 50 lessons; if it grows beyond that, consolidate related lessons into patterns.
