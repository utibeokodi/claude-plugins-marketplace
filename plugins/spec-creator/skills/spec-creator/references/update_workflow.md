# Spec Update Workflow (Steps U1-U5)

When the user wants to modify an existing spec rather than create a new one, this workflow ensures the change does not introduce inconsistencies with the constitution, global invariants, or other specs in the directory.

## Step U1: Load Context

1. **Identify the target spec**: If `--update PATH` was provided, use that path. Otherwise, infer from the user's request (e.g., "update the billing RFC" maps to the RFC file in the billing-service subdirectory). If ambiguous, ask: "Which spec file do you want to update?" and list the available specs.

2. **Read the target spec** in full.

3. **Identify the companion spec**: If the target is an RFC, find and read the corresponding PRD (same `{NN}-` prefix, same service directory). If the target is a PRD, find and read the corresponding RFC. Both documents may need updates to stay in sync.

4. **Read all other specs** in the `.specs/` directory to build the cross-spec map (same as Step 2b item 4 in the creation workflow): data ownership, public interfaces, dependencies, responsibilities, key invariants.

5. **Read the constitution and global invariants** (same as Step 2b item 3 in the creation workflow).

6. **Summarize** what was loaded: "I've read the target spec, its companion, N other specs, the constitution, and the global engineering standards. Here's what you're asking me to change: [restate the user's request]."

## Step U2: Clarify the Change

Ask targeted questions about the change (not the full structural/domain question battery from Step 3). Focus on:

- **Scope**: "Does this change affect only this spec, or should it ripple to other specs too?"
- **Motivation**: "What's driving this change? (new requirement, bug found during implementation, architectural decision)"
- **Constraints**: "Are there any constraints on how this should be implemented that differ from the original spec?"

If the change is simple and self-explanatory (e.g., "add a retry count to the error handling table"), skip clarifying questions and proceed directly.

**WAIT for the user's response if questions were asked.**

## Step U3: Impact Analysis

Before drafting any changes, analyze what the requested modification would affect:

### 3a. Identify affected sections in the target spec

List every section of the target spec that needs to change. For example, adding a caching layer to an RFC would affect: Data Model (new cache section), Key Data Flows (cache hit/miss paths), Environment Variables (Redis URL), Key Invariants (cache invalidation rules), Dependencies (Redis), and possibly Testing.

### 3b. Check companion spec consistency

Determine whether the companion spec (PRD if updating RFC, or RFC if updating PRD) needs corresponding changes:
- If updating the RFC's data model, does the PRD need new functional requirements or NFRs?
- If updating the PRD's requirements, does the RFC need new interfaces, data flows, or error handling?

### 3c. Check cross-spec consistency

Check the proposed change against every other spec in the directory:
- Does the change affect data ownership boundaries? (e.g., adding a table that another service already owns)
- Does the change modify or add a public interface that overlaps with another service?
- Does the change alter a dependency direction? (e.g., Service A now calls Service B, but Service B's spec says it has no upstream callers)
- Does the change introduce a new external service integration that another module already wraps?

### 3d. Check constitution and global invariants

Verify the proposed change conforms to both layers of project rules.

### 3e. Present the impact analysis

Present a structured impact report before making any changes:

```
## Impact Analysis

### Requested Change
[Restate what the user asked for]

### Sections to Modify in Target Spec ({target file})
| Section | Change |
|---------|--------|
| Data Model | Add Redis cache layer with key patterns and TTLs |
| Key Data Flows | Add cache-hit/miss paths to the lookup flow |
| Environment Variables | Add REDIS_URL |
| Key Invariants | Add cache invalidation rule |
| Dependencies | Add Redis as downstream dependency |
| Testing | Add cache invalidation test requirement |

### Companion Spec Updates ({companion file})
| Section | Change |
|---------|--------|
| NFRs - Performance | Update p95 target to reflect cached reads |
| REQ-4 Criteria | Add EARS criterion for cache miss behavior |

### Other Specs Affected
| Spec | Section | Change Needed | Reason |
|------|---------|---------------|--------|
| 03-RFC-entitlement-quota-service.md | Dependencies | Add this service as upstream caller | New service calls entitlement.checkQuota() in the cache-miss path |

### Constitution / Global Invariants
[PASS] All changes conform to the project constitution and global engineering standards.
OR
[CONFLICT] The following rules are affected:
| Rule Source | Rule | Conflict | Proposed Resolution |
|-------------|------|----------|---------------------|
| stack.md | Redis MUST use rediss:// | N/A - conforms | - |
```

**WAIT for user to review and approve the impact analysis before proceeding.**

## Step U4: Draft Changes (Section-by-Section)

Draft the modified sections of the target spec. Present each changed section showing the diff between old and new content. Use this format:

```
### [Section Name] (modified)

**Was:**
[Original content of this section]

**Now:**
[Updated content of this section]

**Why:** [Brief rationale for the change]
```

Group related section changes together and present them for review.

**WAIT for user response.** Revise if needed.

If the companion spec also needs updates, draft those next using the same format.

**WAIT for user response.** Revise if needed.

If other specs need updates, draft those last, again using the same format.

**WAIT for user response.** Revise if needed.

## Step U5: Write Changes (Explicit Approval Gate)

**This step requires explicit user approval before any file is modified.**

Present the full list of files to be written:

```
I'm ready to write the following changes:

  Modified: {target spec path} (N sections updated)
  Modified: {companion spec path} (M sections updated)
  Modified: {other spec path} (1 section updated)

Shall I write these changes?
```

**WAIT for explicit confirmation.**

Only after the user confirms:
1. Write each modified file
2. Confirm: "Files updated successfully."

Output summary:

```
## Specs Updated

| File | Sections Changed |
|------|-----------------|
| {target spec path} | Data Model, Key Data Flows, Environment Variables, Key Invariants, Dependencies, Testing |
| {companion spec path} | NFRs, REQ-4 Criteria |
| {other spec path} | Dependencies |

All specs in .specs/ remain consistent with each other, the constitution, and global engineering standards.
```
