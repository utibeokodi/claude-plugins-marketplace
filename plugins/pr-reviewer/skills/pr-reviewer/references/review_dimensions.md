# Review Dimensions

Checklists for each review dimension. Load this file when performing Steps 4 and 7 of the workflow.

---

## Test Review Checklist

### Coverage

- Every new public function/method has at least one test
- Every modified code path has a test that exercises it
- Acceptance criteria from the PRD/ticket are mapped to specific test cases
- Error/exception paths have dedicated negative tests
- Boundary conditions and edge cases from the PRD are covered
- If the PR adds a new API endpoint, there are integration tests for it
- If the PR modifies authorization logic, tests verify both allowed and denied access

### Black-Box Testing Philosophy

Tests MUST follow black-box principles. Flag violations of any of these:

- Tests should only interact with the system under test through its public API (exported functions, HTTP endpoints, public methods)
- Tests should NOT access or assert on internal state, private fields, or implementation details
- Tests should NOT mock private/internal methods of the module under test
- Tests should describe WHAT the system does, not HOW it does it internally
- Test names should describe behavior ("should return 404 when user not found") not implementation ("should call findById and return null")
- If a test would break when refactoring internals (without changing behavior), it is testing implementation, not behavior
- Tests should set up inputs, call the public interface, and assert on outputs or observable side effects

### Structure Quality

- Tests follow a consistent pattern: Arrange/Act/Assert or Given/When/Then
- Test names are descriptive and indicate the scenario being tested
- No shared mutable state between tests (each test is independent)
- No ordering dependencies between tests (any test can run in isolation)
- Setup/teardown is explicit and contained (beforeEach/afterEach or equivalent)
- Test data is constructed inline or via clearly named factories, not magic globals

### Runnability

- All required imports are present
- Test fixtures and test data files exist
- No hard-coded absolute paths
- Database/service dependencies have proper setup (test containers, mocks, seed data)
- Environment variables needed by tests are documented or have test defaults

---

## Security

### Authentication

- Protected routes/endpoints check authentication before processing
- Auth checks cannot be bypassed by manipulating request headers or parameters
- Token validation is present and uses secure comparison
- Session handling follows secure defaults (httpOnly, secure, sameSite cookies)
- No authentication credentials are hard-coded

### Authorization

- RBAC/permission checks are present for privileged operations
- Users cannot access other users' resources (Insecure Direct Object Reference / IDOR)
- Elevation of privilege paths are not exposed
- API endpoints verify the caller has permission for the specific resource, not just a valid session

### Input Validation

- All user input is validated before use (type, length, format, range)
- SQL queries use parameterized statements, not string concatenation
- Command execution does not interpolate user input (command injection)
- Template rendering escapes user-provided content (XSS)
- File paths derived from user input are sanitized (path traversal)
- Deserialization of user input uses safe parsers

### Secrets and Sensitive Data

- No secrets, API keys, or passwords hard-coded in source
- Sensitive data is not logged (passwords, tokens, PII)
- Error messages do not leak internal details (stack traces, DB schemas, file paths)
- Secrets are read from environment variables or a secrets manager

### OWASP Top 10

- Cross-Site Request Forgery: state-changing endpoints require CSRF tokens or use SameSite cookies
- Insecure Deserialization: untrusted data is not deserialized without validation
- Security Misconfiguration: CORS, CSP, and other security headers are correctly set
- Cryptographic Failures: no use of MD5/SHA1 for password hashing; no weak random for security tokens

---

## Performance

### Algorithmic Complexity

- No nested loops over unbounded collections that create O(n^2) or worse behavior
- Large data processing uses streaming or pagination, not loading everything into memory
- Sort operations on large datasets use efficient algorithms or database-level sorting

### Database and Query Patterns

- No N+1 query patterns (loop issuing one query per iteration instead of batch/eager loading)
- New queries have appropriate indexes (check if the WHERE/JOIN columns are indexed)
- Pagination is present for queries that could return unbounded results
- Transactions are scoped narrowly (no long-held locks)

### Async and Concurrency

- `await` inside a loop can often be parallelized with `Promise.all` or equivalent
- Synchronous blocking calls in async contexts (e.g., sync file I/O in an async handler)
- Race conditions in shared state access without proper synchronization

### Memory

- No unbounded accumulation in arrays/lists (e.g., collecting all rows in memory)
- Large objects are not held in closures that outlive their usefulness
- Event listeners and subscriptions are cleaned up (no memory leaks)

### Caching

- Repeated identical queries within a request lifecycle could benefit from caching
- Cache invalidation is handled correctly when data changes
- Missing cache-control headers on expensive read endpoints

---

## API / Breaking Changes

### Public Interface Changes

- Removed or renamed exported functions, classes, or types (breaking for consumers)
- Changed function signatures: added required parameters, changed parameter types, changed return types
- Changed default values that affect existing behavior

### REST Endpoint Changes

- Changed HTTP method, path, or required request body fields
- Removed query parameters or headers that clients depend on
- Changed authentication/authorization requirements for an endpoint

### Response Schema Changes

- Removed or renamed fields from an existing response body
- Changed field types (string to number, etc.)
- Changed the structure of nested objects in responses

### Database Schema

- Dropped columns, tables, or changed column types without a migration guard
- Non-backward-compatible migration (e.g., renaming a column that existing code reads)
- Missing default values for new non-nullable columns

### Event and Message Schema

- Changed event payload shape for queue/pub-sub messages
- Changed message format for inter-service communication
- Removed fields from events that downstream consumers depend on

---

## Observability

### Logging

- Errors are logged with sufficient context: request ID, user ID, operation name, error message, stack trace
- No `console.log` in production code that should use a structured logger
- Log levels are appropriate (error for failures, warn for degradation, info for operations, debug for troubleshooting)
- Sensitive data is not included in log output

### Metrics

- New endpoints or operations have request counters and latency histograms
- Error rates are observable (error counter or error ratio metric)
- Business-critical operations have success/failure metrics

### Tracing

- New service-to-service calls have trace spans
- Trace context is propagated to downstream calls (HTTP headers, message metadata)
- Span names are descriptive and follow naming conventions

### Alertability

- If this code path fails silently, will anyone be notified?
- Are there health check endpoints for new services?
- Are SLO-relevant operations instrumented for alerting?

---

## Accessibility

### ARIA and Semantic HTML

- Interactive elements have appropriate ARIA labels and roles
- Custom components use semantic HTML elements where possible (button, nav, main, etc.)
- Form inputs have associated labels (htmlFor/for attribute or aria-label)
- Dynamic content updates use aria-live regions

### Keyboard Navigation

- All interactive elements are reachable via Tab key
- Focus order is logical and follows visual layout
- Focus is not trapped in modals/overlays without an escape mechanism
- Custom keyboard shortcuts do not conflict with screen reader shortcuts

### Visual

- Color is not the sole indicator of state or meaning (use icons, text, patterns too)
- Text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Images have descriptive alt text (or empty alt for decorative images)
- Text can be resized to 200% without loss of content or functionality

### Screen Reader

- Page has a logical heading hierarchy (h1 > h2 > h3, no skipping)
- Links and buttons have descriptive text (not "click here")
- Tables have header cells and scope attributes
- Error messages are associated with their form fields

---

## Dependency Risk

### New Dependencies

- Is the new dependency actually necessary, or could existing code/libraries handle it?
- What is the package size impact (bundle size for frontend, install size for backend)?
- Is the dependency actively maintained (last release date, commit activity, open issues)?

### Known Vulnerabilities

- Run `npm audit` / `pip audit` / `cargo audit` / equivalent for the ecosystem
- Check if the specific version introduced has known CVEs
- If vulnerabilities exist, are they in code paths actually used by this project?

### License Compatibility

- Is the dependency's license compatible with the project's license?
- Flag any GPL/AGPL dependencies in MIT/Apache-licensed projects
- Flag any dependencies with "no license" or unclear licensing

### Maintenance Risk

- Is this a single-maintainer package with no succession plan?
- Does the package have a large number of unresolved issues or stale PRs?
- Is there a more established alternative that provides the same functionality?

---

## Architecture Fit

### Separation of Concerns

- Does the change keep business logic, data access, and presentation in their proper layers?
- Are new files/modules placed in the correct directory according to project conventions?
- Does the change avoid mixing responsibilities in a single function or class?

### Coupling and Cohesion

- Does the change introduce tight coupling between modules that should be independent?
- Are new dependencies between modules justified and in the expected direction?
- Do new abstractions group related functionality (high cohesion)?

### Pattern Consistency

- Does the change follow the established patterns in the existing codebase?
- If a new pattern is introduced, is there justification (not just preference)?
- Are naming conventions consistent with the rest of the project?

### Layer Violations

- Does the change reach across architectural layers (e.g., UI directly querying the database)?
- Are service boundaries respected (no importing from another service's internals)?
- Is the dependency direction correct (higher layers depend on lower, not vice versa)?

### Circular Dependencies

- Does the change introduce circular imports between modules?
- Are there indirect circular dependencies through shared state or event chains?

---

## Maintainability

### Readability

- Can a new team member understand this code without external context?
- Are complex algorithms or business rules explained with comments?
- Is the code flow linear and easy to follow (not deeply nested)?

### Naming

- Do variable, function, and class names clearly convey their purpose?
- Are abbreviations avoided unless they are universally understood?
- Are boolean variables named as questions (isActive, hasPermission, canEdit)?

### Documentation

- Do complex functions have JSDoc/docstrings explaining parameters, return values, and side effects?
- Are non-obvious design decisions documented (why, not what)?
- Are TODO/FIXME comments accompanied by a ticket reference?

### Size and Complexity

- Are functions small enough to understand at a glance (roughly under 40 lines)?
- Are classes/modules focused on a single responsibility?
- Is cyclomatic complexity reasonable (no deeply nested conditionals)?

### Duplication

- Is there copy-pasted code that should be extracted to a shared utility?
- Are there near-identical patterns that could be unified?
- If duplication exists, is it intentional (e.g., two modules that will diverge)?
