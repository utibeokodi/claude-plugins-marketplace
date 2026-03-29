# Langfuse UI Navigation Reference

The Langfuse UI follows consistent patterns. This reference helps navigate the standard product. Custom features added on top of Langfuse are navigated using instructions from the JIRA ticket.

## Application Structure

- **URL pattern**: `/project/[projectId]/[feature]`
- **Navigation**: Left sidebar with collapsible sections
- **Switchers**: Organization switcher and project switcher in the top navigation bar
- **Environment filter**: Global dropdown in the nav bar, applies across all views

## Standard Page Types

**List pages** (Traces, Sessions, Generations, Users, Prompts, Scores, Datasets):
- Table with sortable columns, pagination
- Filter panel (sidebar or inline)
- Row click opens detail view
- Batch operations via checkboxes + "Actions" menu

**Detail pages** (Trace detail, Session detail, Prompt detail):
- Header with metadata
- Tabbed content areas
- Related items (e.g., trace shows observations tree)

**Settings pages** (Organization settings, Project settings):
- Sidebar navigation by settings category
- Forms for configuration
- API key management

## Common UI Patterns

- **Toasts**: Appear top-right for success/error feedback
- **Modals/Dialogs**: Overlay for confirmations, forms, creation flows
- **Loading states**: Skeleton loaders or spinners while data loads
- **Empty states**: Message shown when no data matches filters
- **Tables**: All data tables support column visibility, sorting, and filtering
