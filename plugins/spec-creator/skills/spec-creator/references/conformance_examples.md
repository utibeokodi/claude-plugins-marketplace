# Conformance Check Examples

## Constitution Conflicts Table (used in Step 4c)

When a requirement or design choice conflicts with a constitution rule, flag it using this format:

```
## Constitution Conflicts

The following aspects of this spec may require changes to the project constitution:

| Spec Element | Constitution Rule | Conflict | Proposed Resolution |
|-------------|-------------------|----------|---------------------|
| REQ-3: Direct ClickHouse writes | Section 5: "No direct ClickHouse queries without WHERE org_id = ?" | This service needs cross-tenant aggregation queries for analytics | Add an exception for read-only analytics queries with explicit audit logging |
```

If no conflicts exist, note: "All requirements conform to the project constitution. No changes needed."

## Constitution / Global Invariants Change Proposal (used in Step 5e)

When an RFC design decision conflicts with the constitution or global invariants, present a Change Proposal alongside the RFC sections:

```
## Constitution / Global Invariants Change Proposal

This RFC requires the following additions/modifications:

### Constitution ({path})
1. **Add exception to Section N**: [description of the change and why it's needed]

### Global Invariants ({path})
1. **New standard for Section M**: [proposed new rule or amendment]
2. **Exception to existing rule**: [which rule, why this service needs an exception]

These changes should be reviewed and approved before implementation begins.
```

If no changes are needed, note: "All design decisions conform to the project constitution and global engineering standards."
