# SIGNAL ARENA — Contribution Rules

## 1. Общий принцип

Любая работа в Agent Mode выполняется через небольшие проверяемые изменения. Агент не должен смешивать несколько независимых задач в одном Pull Request.

```text
одна задача
→ один branch
→ один логический PR
→ проверка
→ review
→ merge
```

## 2. Ветки

Формат:

```text
<type>/<scope>/<short-description>
```

Примеры:

```text
feat/client/arena-hub
feat/api/scenario-run
feat/crm/catalog-editor
feat/landing/founder-page
feat/content/false-breakout
fix/api/payment-idempotency
fix/client/reveal-leak
fix/crm/refund-filter
chore/contracts/add-profile-dto
refactor/domain/scoring-service
ops/ci/contract-checks
```

Типы:

```text
feat
fix
refactor
chore
docs
test
ops
content
```

Запрещено:

```text
work
update
changes
final
new
misc
```

## 3. Pull Request title

Формат:

```text
<type>(<scope>): <imperative description>
```

Примеры:

```text
feat(client): add Arena Hub shell
feat(api): add scenario run endpoint
feat(crm): add catalog editor
feat(contracts): define public profile DTO
fix(payments): make Stars fulfillment idempotent
test(content): validate hidden future payload
docs(architecture): document platform adapters
```

Заголовок должен отвечать на вопрос: «Что изменилось?» Не писать в прошедшем времени.

## 4. Commit messages

Использовать Conventional Commits:

```text
<type>(<scope>): <short imperative description>
```

Примеры:

```text
feat(contracts): add scenario run schemas
feat(api): validate Telegram init data
feat(client): render decision sheet
feat(crm): add Founder Pack inventory field
fix(api): prevent duplicate entitlement grant
fix(client): hide future segment before lock
test(scoring): add lucky win fixture
docs(agents): clarify task routing
```

Правила:

- строка до 72 символов;
- одна задача на commit;
- без точки в конце;
- английский язык для commit title;
- подробности — в body при необходимости;
- не использовать `--no-verify` без объяснения в PR.

## 5. PR scope

Один PR может включать несколько файлов только если они относятся к одной вертикальной задаче.

Разрешённый пример:

```text
Добавление catalog:
contracts + API + migration + CRM list + client shop card + tests
```

Неразрешённый пример:

```text
В одном PR:
новый scoring + редизайн CRM + локализация + Base adapter
```

## 6. Обязательная структура PR

Каждый PR должен содержать:

```markdown
## Summary

## Scope

## Files changed

## Contracts changed

## Database / migrations

## API routes

## Client / CRM impact

## Feature flags

## Analytics events

## Tests run

## Risks

## Not implemented

## Rollback plan
```

## 7. PR labels

Использовать labels:

```text
area:client
area:api
area:crm
area:landing
area:contracts
area:db
area:content
area:payments
area:ai
area:ops
area:security
area:docs

priority:p0
priority:p1
priority:p2

status:draft
status:ready
status:blocked
status:needs-review
```

## 8. Draft PR policy

Агент должен открывать Draft PR, если:

- работа ещё не завершена;
- нужен архитектурный вопрос;
- контракт меняется и требует согласования;
- есть незакрытые тесты;
- есть migration risk;
- изменяется платёжная логика.

PR можно перевести в Ready only if acceptance checklist completed.

## 9. Required checks

Перед Ready for Review:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm validate:contracts
pnpm validate:content
pnpm validate:locales
pnpm build
```

Если команда отсутствует, агент обязан указать это в PR, а не притворяться, что проверка выполнена.

## 10. Comment naming convention

Комментарии в PR и коде должны начинаться с category tag.

### PR review tags

```text
[BLOCKER]
[SECURITY]
[DATA]
[CONTRACT]
[PAYMENT]
[FAIRNESS]
[SCORING]
[UX]
[PERF]
[TEST]
[DOCS]
[QUESTION]
[SUGGESTION]
[NIT]
```

### Значение тегов

- `[BLOCKER]` — нельзя merge до исправления.
- `[SECURITY]` — риск утечки, обхода прав или атаки.
- `[DATA]` — ошибка схемы, миграции или целостности данных.
- `[CONTRACT]` — рассинхронизация client/API/CRM.
- `[PAYMENT]` — Stars, order, refund, entitlement или ledger.
- `[FAIRNESS]` — утечка future или нечестный scenario.
- `[SCORING]` — ошибка rubric или score.
- `[UX]` — проблема понятности, навигации или доступности.
- `[PERF]` — производительность или memory leak.
- `[TEST]` — отсутствует или неверен тест.
- `[DOCS]` — документация устарела.
- `[QUESTION]` — требуется уточнение, merge не блокируется автоматически.
- `[SUGGESTION]` — улучшение без обязательного действия.
- `[NIT]` — мелкое замечание.

## 11. Comment format

### Blocking comment

```text
[BLOCKER][PAYMENT] Entitlement is granted before the successful_payment event is persisted. A retry can grant the item twice.

Why:
...

Required change:
...

Acceptance:
...
```

### Contract comment

```text
[CONTRACT] This response shape is duplicated in the client instead of imported from packages/contracts.

Required change:
Move the schema to packages/contracts and make both API and client consume it.
```

### Question

```text
[QUESTION] Should this scenario be available in Arena before the related Exam is passed?

Current assumption:
...
```

### Suggestion

```text
[SUGGESTION] Consider extracting this into a repository method so SQLite-to-Postgres migration remains straightforward.
```

## 12. Code comments

Комментарии в коде нужны только для объяснения «почему», а не «что делает строка».

Плохо:

```ts
// Increment count
count += 1;
```

Хорошо:

```ts
// Keep fulfillment idempotent because Telegram may retry the payment update.
```

Для временного кода:

```text
TODO(P0): ...
TODO(P1): ...
FIXME: ...
SECURITY: ...
```

Каждый TODO должен иметь issue/PR reference, если это возможно.

## 13. AI agent rules

Перед кодом агент обязан:

1. Прочитать `AGENTS.md`.
2. Прочитать `developing_status.md`.
3. Определить текущую фазу.
4. Найти существующий контракт.
5. Проверить похожие модули.
6. Сформулировать scope.
7. Не менять соседние подсистемы без причины.

После кода агент обязан:

1. Запустить доступные проверки.
2. Указать изменённые файлы.
3. Указать новые контракты.
4. Указать миграции.
5. Указать риски.
6. Указать, что не сделано.
7. Подготовить PR description по шаблону.

## 14. Merge policy

Нельзя merge, если:

- есть `[BLOCKER]`;
- не проходят typecheck или tests;
- не описана миграция;
- платёжная логика не имеет idempotency test;
- content change не прошёл validation;
- изменён scoring без golden fixture;
- изменён public profile без privacy review;
- AI action не имеет approval policy;
- feature flag не имеет rollback plan.

## 15. PR naming examples by task

```text
feat(contracts): define catalog and entitlement schemas
feat(api): add public scenario read endpoint
feat(client): add Arena Hub navigation
feat(crm): add scenario review queue
feat(landing): add Founder Support explanation
feat(content): add false breakout scenario pack
fix(payments): prevent duplicate Stars fulfillment
fix(security): reject expired Telegram init data
fix(scoring): handle valid No Trade outcome
test(tournaments): lock scenario version per entry
ops(ci): add contract and content validation
```
