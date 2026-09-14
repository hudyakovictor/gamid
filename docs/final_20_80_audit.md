# SIGNAL ARENA — Final 20/80 Audit

## Цель

Закрыть критичные архитектурные пробелы перед началом Foundation и сделать репозиторий самодокументируемым для любого AI-агента, которому передадут ссылку на GitHub.

## 10 финальных анализов

### 1. Agent discoverability

Проверка: сможет ли агент понять проект только по ссылке?

Решение:

```text
README.md → AGENTS.md → developing_status.md → CONTRIBUTING.md → canonical specs
```

Добавить directory map, current phase, commands, roles and constraints.

### 2. Parallel work safety

Проверка: смогут ли Client, Backend, CRM и Landing agents работать параллельно?

Решение: только через `packages/contracts`, feature branches и contract CI.

### 3. Data authority

Проверка: где находится источник истины?

Решение:

```text
API/database = authority
client = renderer
CRM = controlled operator interface
```

### 4. Content lifecycle

Проверка: как сценарий проходит путь от идеи до игрока?

Решение:

```text
DRAFT → VALIDATING → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED
```

### 5. Payment safety

Проверка: можно ли дважды выдать товар?

Решение: order state machine, provider charge uniqueness, idempotency, ledger and reconciliation.

### 6. Game fairness

Проверка: может ли клиент увидеть будущее или купить результат?

Решение: future only on server, score server-authoritative, anti-pay-to-win tests and rubric versioning.

### 7. Operational control

Проверка: сможет ли соло-фаундер управлять продуктом?

Решение: CRM, RBAC, feature flags, logs, audit, support views and kill switches.

### 8. AI safety

Проверка: может ли AI повредить деньги, score или экономику?

Решение: typed tools, risk levels, approval queue, budget limits, prompt versioning and output validation.

### 9. Future platform readiness

Проверка: можно ли добавить Base/MiniPay/Solana без копии игры?

Решение: PlatformAdapter, PaymentProvider, ChainAdapter, shared identity and capability discovery.

### 10. Recovery and release

Проверка: можно ли откатить неудачный релиз?

Решение: migrations, backups, restore drill, feature flags, release checklist, smoke tests and rollback notes.

## 100 closing simulations

### Contract simulations 1–10

1. Client requests a missing field.
2. Backend adds optional field.
3. CRM sends outdated enum.
4. Client receives unknown enum.
5. API returns invalid payload.
6. Mock fixture diverges from API.
7. Contract version changes during active session.
8. Old client calls new endpoint.
9. New client calls old endpoint.
10. CI blocks incompatible contract.

### Database simulations 11–20

11. Migration runs twice.
12. Migration fails halfway.
13. SQLite lock occurs.
14. PostgreSQL repository changes transaction behavior.
15. Entitlement row duplicates.
16. Payment charge ID duplicates.
17. Inventory goes negative.
18. Founder supply race occurs.
19. Restore from backup.
20. Delete user while preserving financial audit.

### Auth simulations 21–30

21. Expired Telegram initData.
22. Replayed initData.
23. Modified initData.
24. Revoked session.
25. Two identities link one user.
26. Wrong platform identity.
27. Rate-limit exceeded.
28. User opens client in dev mode.
29. Token rotation during active session.
30. Public profile requested without consent.

### Scenario simulations 31–40

31. Hidden future requested early.
32. Scenario version changes mid-run.
33. User submits twice.
34. User submits after timeout.
35. User disconnects before lock.
36. Server crashes during reveal.
37. Invalid card sequence.
38. Unavailable source requested.
39. Draft scenario reaches public API.
40. Rubric is missing.

### Scoring simulations 41–50

41. Lucky profit with bad process.
42. Loss with excellent process.
43. High confidence with weak evidence.
44. No Trade with strong evidence.
45. Multiple valid plans.
46. Unknown entity combination.
47. Changed rubric version.
48. Score recalculation request.
49. Client attempts local score.
50. Tournament and regular score use different versions.

### Payments simulations 51–60

51. Duplicate payment webhook.
52. Payment success after client disconnect.
53. Fulfillment crashes after payment persistence.
54. Refund before fulfillment.
55. Refund after consumable use.
56. Founder Pack sold simultaneously by two users.
57. Price changes after order creation.
58. Stars receipt cannot be reconciled.
59. Entitlement revoked.
60. CRM manually retries fulfillment.

### CRM simulations 61–70

61. Support agent opens finance action.
62. Content editor changes price.
63. Admin publishes invalid scenario.
64. Bulk action partially fails.
65. Dangerous action lacks confirmation.
66. Audit event fails.
67. Feature flag expires.
68. AI operator approves own high-risk job.
69. Private fields appear in table.
70. CRM API is called without admin scope.

### AI simulations 71–80

71. AI returns invalid JSON.
72. AI invents historical fact.
73. AI translation exceeds UI length.
74. AI changes prohibited token language.
75. AI proposes reward inflation.
76. AI requests forbidden tool.
77. Prompt version changes output.
78. AI budget is exceeded.
79. Model provider is unavailable.
80. Human rejects generated content.

### Localization simulations 81–85

81. Missing translation key.
82. Locale fallback.
83. Plural mismatch.
84. Scenario content and translation versions differ.
85. Legal text is translated without review.

### Tournaments and profiles 86–92

86. Wrong scenario version assigned.
87. Duplicate tournament entry.
88. Duplicate tournament reward.
89. Provisional leaderboard differs from final.
90. Player profile exposes private weakness.
91. Equipped cosmetic asset missing.
92. Public profile is disabled after sharing.

### Operations and release 93–100

93. API latency spike.
94. WebSocket reconnect.
95. Worker retry storm.
96. Ads provider unavailable.
97. Database backup restore.
98. Feature flag rollback.
99. Secret accidentally committed.
100. New release fails smoke test.

## Closing results

Каждая из 100 симуляций должна иметь один из статусов:

```text
PASS
PASS WITH GUARDRAIL
BLOCKED
```

Нельзя считать сценарий PASS, если отсутствует:

- contract validation;
- audit trail для admin mutation;
- idempotency для retryable action;
- rollback path для risky feature;
- privacy check для public data;
- test fixture для scoring/payment/fairness.

## Critical additions

### Add to root

```text
README.md
AGENTS.md
CONTRIBUTING.md
developing_status.md
```

### Add to docs

```text
docs/ADR/README.md
docs/ACCEPTANCE_MATRIX.md
docs/RISK_REGISTER.md
docs/OPERATIONS_RUNBOOK.md
docs/AI_OPERATIONS.md
docs/CONTRACTS.md
docs/DIRECTORY_MAP.md
docs/CHANGELOG.md
```

### Add to scripts

```text
scripts/validate-contracts/
scripts/validate-content/
scripts/validate-locales/
scripts/release-check/
scripts/smoke-test/
scripts/secret-scan/
```

## Final 20/80 rule

До кода клиента обязательно закрыть только этот минимальный блок:

```text
1. README and directory map.
2. AGENTS.md.
3. CONTRIBUTING.md.
4. developing_status.md.
5. packages/contracts.
6. packages/content schemas and fixtures.
7. database migrations.
8. API skeleton.
9. auth/session validation.
10. scenario run state machine.
11. hidden future protection.
12. scoring golden fixtures.
13. order/entitlement idempotency.
14. audit and structured logs.
15. CRM basic control plane.
```

После этого client, backend, CRM and landing can be developed in parallel.

## Agent handoff command

```text
Repository:
https://github.com/hudyakovictor/ssarena

Read first:
- README.md
- AGENTS.md
- developing_status.md
- CONTRIBUTING.md
- docs/DIRECTORY_MAP.md
- docs/ACCEPTANCE_MATRIX.md
- docs/RISK_REGISTER.md

Role: <client|backend|crm|landing|content|ai>
Phase: <current phase from developing_status.md>
Task: <one bounded task>

Do not change files outside your role without explaining why.
Start with contracts. End with tests, risks, not implemented and rollback plan.
```
