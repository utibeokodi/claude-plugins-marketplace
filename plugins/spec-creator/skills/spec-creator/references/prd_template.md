# Requirements: [Feature / Service Name]

*Status: [Draft / In Review / Approved] | Last updated: [Date]*

## 1. Overview

[2-4 sentences: what this does, why it exists, who it serves.]

**Goals:**
- [Goal 1]
- [Goal 2]

**Non-Goals:**
- [What is explicitly NOT being built]

---

## 2. Personas [OPTIONAL]

| Persona | Description |
|---------|-------------|
| **[Name]** | [Role and context] |

---

## 3. Functional Requirements

> Format: User Story + Acceptance Criteria in [EARS notation](https://alistairmavin.com/ears/).
>
> Patterns:
>   `WHEN [trigger] THE SYSTEM SHALL [behaviour]`
>   `IF [precondition] WHEN [trigger] THE SYSTEM SHALL [behaviour]`
>   `WHILE [state] THE SYSTEM SHALL [behaviour]`
>
> Examples:
>   WHEN a user submits a payment form THE SYSTEM SHALL validate the card details before charging
>   IF the payment provider returns a network error WHEN a charge is attempted THE SYSTEM SHALL retry up to 3 times with exponential backoff
>   WHILE a subscription is in the past_due state THE SYSTEM SHALL restrict access to paid features

### REQ-1: [Name]

**Story:** As a [persona], I want [action], so that [benefit].

**Criteria:**
1. WHEN [condition] THE SYSTEM SHALL [behaviour]
2. IF [precondition] WHEN [condition] THE SYSTEM SHALL [behaviour]

### REQ-2: [Name]

**Story:** As a [persona], I want [action], so that [benefit].

**Criteria:**
1. WHEN [condition] THE SYSTEM SHALL [behaviour]

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | [e.g. p95 response < 300ms under expected load] |
| **Security** | [e.g. All secrets from environment variables; no hardcoded credentials] |
| **Reliability** | [e.g. 99.9% uptime; graceful degradation when dependencies are unavailable] |
| **Scalability** | [e.g. Stateless; horizontally scalable; no shared mutable state between instances] |
| **Observability** | [e.g. Structured logs; /health endpoint; key operations emit metrics] |
| **Compliance** | [e.g. No PII in logs; audit trail for sensitive operations] |

---

## 5. External Integrations [OPTIONAL]

| System | Purpose | Notes |
|--------|---------|-------|
| [e.g. Stripe] | [e.g. Payment processing] | [e.g. Account pre-configured; use test mode in dev] |

---

## 6. Constraints

- [Hard constraints the implementation must never violate]

---

## 7. Assumptions [OPTIONAL]

- [Things assumed true that affect this spec if they turn out to be wrong]

---

## 8. Open Questions [OPTIONAL]

- [ ] [Unresolved decision that should be resolved before implementation begins]

---

## 9. Clarifications Log [OPTIONAL]

| Date | Question | Decision | Decided By |
|------|----------|----------|------------|
