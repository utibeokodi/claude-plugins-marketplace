# Edge Cases

## Validation step references a feature that does not exist

If a validation step describes UI that is not found on the page:
1. Take a screenshot showing what IS on the page
2. Mark the step as FAIL
3. In the failure description, note: "Expected [feature from ticket] but the page shows [actual content]"
4. Continue to the next step

## Application crashes or shows an error page

1. Take a screenshot of the error
2. Capture the browser console errors
3. Mark the current step as FAIL
4. Attempt to navigate back to a known page (e.g., project dashboard)
5. If the app is unrecoverable, mark all remaining steps as SKIP with reason: "Application error, could not continue"

## Validation step is ambiguous

If the JIRA ticket's validation step is unclear about what exactly to check:
1. Execute the step as best understood from the ticket description
2. Note the ambiguity in the validation report
3. Mark as PASS if the most reasonable interpretation of the expected outcome is met
4. Never read source code to resolve the ambiguity

## Dev server is slow or unresponsive

- Increase wait timeouts to 30 seconds for initial page loads
- If a page does not load within 30 seconds, mark the step as FAIL with "Page did not load within 30 seconds"
- Do NOT assume the dev server is broken after one slow response. Retry once.

## Feature requires specific test data

If the validation step assumes data exists (e.g., "verify the traces table shows traces"):
1. Check if the JIRA ticket includes setup instructions for test data
2. If no setup instructions, note in the report: "Step requires test data that was not specified in the ticket"
3. Mark as SKIP if data is required but unavailable

## Non-UI task types

For `internal service` or `BullMQ job` task types, the skill adjusts its approach:

**Internal service (API only)**:
- Execute API requests directly in the terminal using `curl` or `httpie`
- Take a screenshot of the terminal showing the full request and response (command, headers, status code, response body)
- Verify API responses match expected outcomes from the JIRA ticket
- Save terminal screenshots as evidence (e.g., `step-N-api-request.png`)
- For multi-step API flows (e.g., create then retrieve), capture each request/response pair as a separate screenshot

**BullMQ job**:
- Start the worker using the provided dev command
- Trigger the job as described in the JIRA ticket
- Verify outcomes by running terminal commands (database queries, queue inspection, API calls) as described in the ticket
- Take screenshots of the terminal output showing the verification results
- If the ticket does not describe how to verify the job, mark as SKIP
