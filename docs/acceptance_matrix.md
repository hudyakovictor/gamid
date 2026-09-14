# SIGNAL ARENA — Acceptance Matrix

| Area | Minimum acceptance |
|---|---|
| Contracts | Zod schemas shared by client, API and CRM; contract tests pass |
| Auth | Telegram identity verified server-side; replay rejected; session revocation works |
| Scenarios | Hidden future server-only; content/rubric/data versions fixed |
| Scoring | Golden fixtures pass; process score independent of lucky outcome |
| Database | Migration applies; indexes and uniqueness constraints exist; restore tested |
| Payments | Duplicate webhook creates one entitlement; order state is auditable |
| Refunds | Refund/revoke behavior defined and tested |
| Shop | Catalog, preview, order, entitlement, inventory and equip work through API |
| Founder Packs | Supply reservation atomic; no token/income promise; purchase is non-competitive |
| Public profiles | Opt-in; private fields excluded; cosmetics render with fallback |
| Tournaments | Scenario/rubric version locked; duplicate entries and rewards prevented |
| CRM | RBAC server-side; dangerous actions confirmed and audited |
| Localization | Missing key fallback; versions; length and locale validation |
| AI | Jobs versioned, schema-validated and approval-controlled |
| Observability | Request ID, structured errors, audit events and alerts exist |
| Recovery | Backup and restore drill passed; rollback path documented |
| Client | Loading/error/empty/reduced-motion states; no authoritative logic in client |
| Release | typecheck, lint, tests, smoke, secret scan and build pass |
