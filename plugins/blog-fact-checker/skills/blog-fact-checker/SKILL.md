---
name: blog-fact-checker
description: This skill should be used when verifying blog posts or articles sentence by sentence, outputting a comprehensive verification table in chat. Triggers on requests like "fact-check this blog post", "verify my blog", "/blog-fact-checker [file-path]", or when users want to validate all claims in markdown content. Supports technical blogs, news articles, historical content, and general knowledge posts.
argument-hint: "[file-path]"
---

# Blog Fact Checker

Analyze blog posts or articles sentence by sentence, verifying factual claims and outputting a comprehensive verification table directly in the chat.

## Overview

This skill reads a markdown blog post and systematically verifies every sentence, including both factual claims and non-factual statements. The output is a markdown table displayed in chat that shows verification status, source links, and notes for each sentence.

**Key features:**
- Processes ALL sentences (not just factual claims)
- Outputs results as a table in chat (doesn't edit the file)
- Provides source links that directly support or contradict claims
- Handles technical content, statistics, historical facts, and general knowledge
- Verifies citations and quotes within the blog post

## When to Use

Invoke this skill when:
- User requests: "fact-check this blog post"
- User says: "verify the claims in [file-path]"
- User provides: "/blog-fact-checker [file-path]"
- User wants to: "check if my blog is accurate"
- User needs: sentence-by-sentence verification of a markdown file

## Workflow

### Step 1: Read the Blog Post

Read the markdown file from the provided file path:

```
Read(file_path="/path/to/blog-post.md")
```

### Step 2: Parse into Sentences

Extract all sentences from the blog post:

**Include:**
- All body sentences
- Headings that are complete sentences
- Sentences in lists and quotes
- Code comments if they contain factual claims

**Exclude:**
- Code blocks (unless user specifically requests)
- URLs and file paths
- Markdown syntax elements

**Sentence splitting guidelines:**
- Split on periods, question marks, and exclamation points
- Handle abbreviations (e.g., "Dr.", "Inc.", "etc.") correctly
- Keep sentences with multiple clauses together
- Maintain proper context for each sentence

### Step 3: Analyze Each Sentence

For every sentence, determine:

1. **Does it contain a factual claim?**
   - Yes: The sentence makes a verifiable assertion
   - No: The sentence is opinion, instruction, or non-factual

2. **If yes, what type of claim?**
   - Technical specification
   - Statistical/numerical claim
   - Historical fact
   - Attribution (quote or citation)
   - Performance metric
   - Current event
   - Other factual claim

**Consult verification guidelines:**
Load `references/verification_guidelines.md` to understand what constitutes a factual claim and how to evaluate sources.

**Consult claim types:**
Load `references/claim_types.md` for examples of different claim types and verification approaches.

### Step 4: Verify Factual Claims

For each sentence containing factual claims:

1. **Construct search query:**
   - Make it specific and unambiguous
   - Include version numbers, dates, exact terms
   - Add "official" or "2026" for authoritative/recent sources

2. **Search for authoritative sources:**
   - Use WebSearch tool
   - Prioritize official documentation
   - Look for Tier 1 sources (official docs, primary sources)
   - Fall back to Tier 2 if needed (reputable news, expert blogs)

3. **Evaluate the source:**
   - Does it directly address the claim?
   - Is it authoritative and current?
   - Does the page contain specific details that prove the claim?

4. **Determine verification status:**
   - ✅ **Verified**: Tier 1 source confirms, or multiple Tier 2 sources agree
   - ⚠️ **Partially Accurate**: Core claim correct but details wrong, or outdated
   - ❌ **Inaccurate**: Sources contradict the claim
   - 🔍 **Unable to Verify**: No authoritative source found
   - **N/A**: No factual claim to verify

### Step 5: Build the Verification Table

Create a markdown table with the following structure:

**Required columns:**
- **#** - Sentence number (1, 2, 3...)
- **Sentence** - Exact sentence from the blog post
- **Factual Claim?** - Yes or No
- **Verification Status** - ✅/⚠️/❌/🔍/N/A
- **Source Link** - URL that verifies (or contradicts) the claim
- **Notes** - Brief explanation of verification or context

**Optional columns** (add if helpful):
- **Claim Type** - Type of factual claim (technical, statistical, etc.)
- **Search Query** - Query used to find verification
- **Source Quality** - Tier 1/Tier 2/Tier 3

**Table formatting:**
- Use proper markdown table syntax with pipes (|)
- Align columns for readability
- Keep notes concise (1-2 sentences max)
- Leave Source Link blank for non-factual sentences

### Step 6: Output the Table in Chat

Display the complete markdown table directly in the conversation:

**Important:**
- Output the table in the chat response (NOT as a file)
- Include ALL sentences from the blog post
- Ensure the table is properly formatted
- Provide a summary before the table (total sentences, verified count, issues found)

## Table Output Format

### Summary

Provide a brief summary before the table:

```markdown
## Blog Fact-Check Results

**Summary:**
- Total sentences: X
- Sentences with factual claims: Y
- Verified: Z1
- Partially accurate: Z2
- Inaccurate: Z3
- Unable to verify: Z4
- Non-factual: Z5

---
```

### Table Structure

```markdown
| # | Sentence | Factual Claim? | Verification Status | Source Link | Notes |
|---|----------|----------------|---------------------|-------------|-------|
| 1 | First sentence here | Yes | ✅ Verified | https://source.com | Confirmed by official docs |
| 2 | Second sentence here | No | N/A | | Opinion statement |
| 3 | Third sentence here | Yes | ❌ Inaccurate | https://source.com | Source shows different value |
```

### Notes Column Guidelines

**For verified claims:**
- "Confirmed by [source type]"
- "Matches official documentation"
- "Verified from [publication/organization]"

**For partially accurate claims:**
- "Core claim correct, but [detail] is outdated"
- "True for [context], but missing [caveat]"

**For inaccurate claims:**
- "Source shows [correct information]"
- "Contradicted by [source]"
- "Number/date is incorrect"

**For unverifiable claims:**
- "No authoritative source found"
- "Sources conflict"
- "Too recent to verify"

**For non-factual sentences:**
- "Opinion/subjective statement"
- "Future prediction"
- "Recommendation without factual basis"
- "Rhetorical question"

## Examples

### Example 1: Technical Blog Post

**User request:** "Fact-check this blog post about React"

```markdown
## Blog Fact-Check Results

**File:** `/path/to/react-blog.md`

**Summary:**
- Total sentences: 15
- Sentences with factual claims: 8
- Verified: 6
- Partially accurate: 1
- Inaccurate: 1
- Unable to verify: 0
- Non-factual: 7

---

| # | Sentence | Factual Claim? | Verification Status | Source Link | Notes |
|---|----------|----------------|---------------------|-------------|-------|
| 1 | React is a popular JavaScript library. | No | N/A | | Subjective (opinion on "popular") |
| 2 | React was created by Facebook in 2013. | Yes | ✅ Verified | https://react.dev/learn | Confirmed by official React docs |
| 3 | React 18 introduced automatic batching. | Yes | ✅ Verified | https://react.dev/blog/2022/03/29/react-v18 | Confirmed in React 18 release notes |
| 4 | This makes React the best framework for SPAs. | No | N/A | | Opinion/subjective judgment |
| 5 | Over 80% of developers use React. | Yes | ❌ Inaccurate | https://survey.stackoverflow.co/2024 | Stack Overflow survey shows ~40% |
```

### Example 2: News Article

**User request:** "/blog-fact-checker ~/articles/ai-news.md"

**Process:**
1. Read `~/articles/ai-news.md`
2. Extract 22 sentences
3. Identify 14 factual claims
4. Search for each claim
5. Build verification table
6. Output in chat

**Output includes:**
- Verified claims from official announcements
- Inaccurate statistics with corrected sources
- Citations verified against original sources
- Opinions marked as non-factual

### Example 3: Historical Blog Post

**User request:** "Verify the claims in this history of programming languages article"

**Handles:**
- Dates of language releases (verified from official sources)
- Quotes from creators (verified from interviews/publications)
- Adoption statistics (verified from surveys)
- Technical features (verified from documentation)

## Best Practices

### Search Strategy

**Construct effective queries:**
- Include specific terms: "Python 3.12 release date official"
- Add version numbers: "React 18 features"
- Include year for recent info: "Claude Sonnet 4.5 2026"
- Use quotes for exact phrases: "automatic batching"

**Avoid vague queries:**
- ❌ "Python release"
- ❌ "React features"
- ❌ "latest version"

### Source Evaluation

**Prefer authoritative sources:**
1. Official documentation and product pages
2. Original research papers
3. Government/academic institutions
4. Established news outlets
5. Expert blogs (with caution)

**Verify source quality:**
- Is it the official source?
- Is it current?
- Does it contain specific details?
- Is it cited by other authoritative sources?

### Citation Verification

When the blog post includes citations:

**Verify:**
1. The source exists and is accessible
2. The quote is accurate (word-for-word)
3. The claim accurately represents the source
4. The source is used in proper context

**Note in table:**
- "Quote verified from original source"
- "Citation accurate but missing context"
- "Source doesn't support this interpretation"

### Handling Edge Cases

**Conflicting sources:**
- Note the discrepancy in the table
- Cite both sources
- Mark as "⚠️ Partially Accurate" or "🔍 Unable to Verify"
- Explain the conflict in notes

**Rapidly changing information:**
- Use most recent authoritative source
- Note "as of [date]" in verification
- Flag that information may change

**Context-dependent claims:**
- Verify the claim in stated context
- Note if claim is incomplete or lacks caveats
- Mark as "⚠️ Partially Accurate" if context matters

**Multiple claims in one sentence:**
- Verify each claim separately
- If any fail, mark sentence appropriately
- Explain in notes which parts are verified

## References

This skill includes detailed reference materials for comprehensive verification:

### `references/verification_guidelines.md`

Load this file for:
- Detailed criteria for factual vs. non-factual claims
- Source quality tiers (Tier 1/2/3)
- Verification process steps
- Edge case handling
- Quality checklist

### `references/claim_types.md`

Load this file for:
- Examples of different claim types
- Verification approaches for each type
- Common issues and solutions
- Source recommendations by claim type

**When to load references:**
- Load at the start if unfamiliar with fact-checking
- Consult when encountering edge cases
- Reference when uncertain about claim classification

## Quality Checklist

Before outputting the table:

- [ ] All sentences from the blog post are included
- [ ] Each sentence is numbered sequentially
- [ ] Factual claims are correctly identified
- [ ] All factual claims have been searched
- [ ] Source links point to pages with specific verification details
- [ ] Source links are accessible (not broken)
- [ ] Verification status is appropriate for each claim
- [ ] Notes provide clear, concise explanations
- [ ] Table is properly formatted markdown
- [ ] Summary counts are accurate

## Limitations

**This skill cannot:**
- Edit or correct the blog post file
- Access paywalled or restricted sources
- Verify future predictions
- Determine "truth" in actively disputed claims
- Read images or non-text content in the blog

**For such cases:**
- Note the limitation in the table
- Mark as "🔍 Unable to Verify" with explanation
- Suggest alternative approaches if applicable

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
/Applications/workspace/gen-ai-projects/utibes-plugins-marketplace/improvement-plans/blog-fact-checker.md
```

Use this format:

```markdown
# Improvement Plan: blog-fact-checker

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

{Summarize recurring themes from the lessons above. For example, if the user has corrected source evaluation multiple times, note: "User has high standards for source quality. Always prefer Tier 1 sources and flag Tier 2 usage explicitly."}

## Proposed Skill Changes

{If a lesson is clear and repeated enough to warrant a permanent change to the SKILL.md instructions, document the proposed change here. Include which section to modify and the suggested new wording. Proposed changes must keep the skill conforming to Anthropic best practices: SKILL.md under 500 lines (move detail to references/ files), descriptions under 250 characters, and side-effect skills must have disable-model-invocation: true.}

| # | Section | Current Behavior | Proposed Change | Based on Lessons |
|---|---------|-----------------|-----------------|------------------|
| 1 | {section} | {what the skill currently says} | {what it should say} | Lessons {N, M} |
```

### Rules

1. **Never modify SKILL.md directly.** All improvements go to the improvement plan file as proposals for the skill author.
2. **Be specific.** "User didn't like the output" is useless. "User wanted source links to point to the specific paragraph, not just the page URL" is actionable.
3. **Capture successes too.** If you made a judgment call and the user confirmed it was right, record that as a positive lesson so future sessions maintain that behavior.
4. **Deduplicate.** If a new correction matches an existing lesson, update the existing lesson's count or add context rather than creating a duplicate.
5. **Keep it concise.** Target under 50 lessons; if it grows beyond that, consolidate related lessons into patterns.
