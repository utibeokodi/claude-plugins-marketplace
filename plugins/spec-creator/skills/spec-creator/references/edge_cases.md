# Edge Cases

## No Codebase Exists
If `git rev-parse` fails or there's no recognizable project structure, skip codebase exploration entirely. Continue with WebSearch research only. Note in the RFC that tech stack assumptions should be validated.

## Existing Files With Same Name
Before writing, check if files with the target names already exist. If they do, ask: "`{filename}` already exists. Overwrite, use the next number ({NN+1}), or cancel?"

## User Provides Very Sparse Description
If the initial description is only 1-2 words (e.g., "billing"), proceed to Step 2 (research), then open Step 3 with a broader framing question: "Before I ask detailed questions, can you describe in a few sentences what the billing service needs to do and what problem it solves?"

## --rfc-only Without a PRD Path
Ask: "To write an RFC, I need an existing PRD for context. Please provide the path to the PRD file, or would you like to start from scratch with a full spec creation (PRD + RFC)?"

## User Wants to Stop Mid-Process
If the user says "stop", "cancel", or "I'll continue later" at any point before Step 6: summarize what has been drafted so far. No partial files are written without explicit approval.

## Q&A Mode Transitions to Spec Creation
If a Q&A conversation naturally leads to the user wanting a spec: "Would you like to start creating a spec now? I can kick off the full process." If yes, restart from Step 1 in spec creation mode.

## Large Codebase
If the codebase has hundreds of files, focus exploration on: root config files, existing specs, adjacent services (similar names to what's being built), and key schema/data model files. Do not attempt to read the entire codebase.

## Sections Not Applicable
Not every RFC or PRD section is relevant to every service. If a section clearly does not apply (e.g., "Cache Layer" for a service with no caching needs, or "Personas" for an internal service), omit it rather than filling it with placeholder text. Note the omission: "Cache Layer: omitted (this service has no caching requirements)."

## Existing Specs as Style Reference
If existing specs are found in the output directory during Step 2, read 1-2 of them and match their style, level of detail, and conventions. This ensures consistency across the project's spec library.

## Constitution Found But Spec Requires Violations
If the new service fundamentally cannot comply with a constitution rule (e.g., a cross-tenant analytics service in a system that mandates strict tenant isolation), do NOT silently ignore the conflict. Instead:
1. Flag every conflict explicitly in the Constitution Conflicts table (Step 4c)
2. Propose specific, scoped amendments in the Constitution Change Proposal (Step 5e)
3. Mark these as blockers in the Open Questions section of both the PRD and RFC
4. Warn the user: "This spec requires N changes to the project constitution. These should be reviewed and approved before implementation begins."

## No Constitution Exists
If no constitution or invariants document is found, skip all constitution conformance checks. Optionally suggest: "Your project doesn't have a constitution or invariants document. Would you like me to create one based on the rules established in this spec?"

## Cross-Spec Inconsistency Detected (Creation Mode)
If the new spec conflicts with an existing spec (e.g., both claim ownership of the same table, or the new service wants to call an external API that another service wraps exclusively), do NOT silently adjust the new spec. Instead:
1. Flag the inconsistency inline when presenting the relevant section
2. Explain what the existing spec says and where (e.g., "02-RFC-billing-service.md states that the Billing Service wraps Stripe exclusively")
3. Propose a resolution: either the new spec adapts (call the existing service instead), or the existing spec needs updating (transfer ownership). Make a recommendation but let the user decide.
4. If the user chooses to update the existing spec, note the required change in the Open Questions section: "Requires update to {existing spec path}: {description of change}"

## Update Causes Cascade Across Many Specs
If the impact analysis (Step U3) reveals that the change would require modifications to 4+ other specs, warn the user before proceeding: "This change has a wide blast radius, affecting N other specs. Would you like to proceed with all changes, narrow the scope, or reconsider the approach?" Present the full list so the user can make an informed decision.

## Update Target Spec Not Found
If the user references a spec that doesn't exist (e.g., "update the auth service RFC" but no auth service spec exists), inform them: "No spec found for [service name] in {output_dir}. Would you like to create one instead?" If yes, switch to spec creation mode.

## Update Conflicts With In-Progress Implementation
If the spec being updated has already been decomposed into JIRA tickets (check for ticket references in the spec or ask the user), warn: "This spec may have already been partially implemented. Changes to the spec may require corresponding changes to existing tickets or code. Proceed with the spec update?"

## Companion Spec Missing
If updating an RFC but the companion PRD doesn't exist (or vice versa), note it: "No companion PRD found for this RFC. I'll update the RFC only. Consider creating a PRD later to keep the spec pair complete."
