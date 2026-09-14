# SIGNAL ARENA — Master Prompt Integration

## Назначение

Большой master prompt пользователя не должен оставаться только внешним текстом в Arena.ai. Его правила разделяются по уровням, чтобы не было противоречий и чтобы любой агент мог начать работу по ссылке на репозиторий.

## Где хранить правила

```text
AGENTS.md
  краткие обязательные правила для всех агентов,
  роли, границы директорий, contract-first и запреты.

CONTRIBUTING.md
  ветки, commits, PR, review tags и merge policy.

developing_status.md
  текущая фаза, последовательность и acceptance gates.

README.md
  навигация по проекту, текущий статус и ссылки.

full_game_spec.md
  каноничное продуктовое и игровое ТЗ.

monetization.txt
  коммерческая модель, Stars, Founder Packs, marketplace и GameFi.

docs/MASTER_PROMPT.md
  рабочий prompt для Agent Mode и его компактная версия.

docs/ACCEPTANCE_MATRIX.md
  проверяемые критерии приёмки.

docs/RISK_REGISTER.md
  риски и способы снижения.
```

## Приоритет правил

При конфликте использовать такой порядок:

```text
1. Security, privacy and data integrity.
2. README and current developing_status phase.
3. full_game_spec.md.
4. docs/architecture and acceptance matrix.
5. monetization rules.
6. docs/MASTER_PROMPT.md.
7. Current implementation.
```

## Как использовать в Arena.ai

Пользователь может давать короткую команду:

```text
Репозиторий:
https://github.com/hudyakovictor/ssarena

Прочитай AGENTS.md, README.md, developing_status.md,
CONTRIBUTING.md и docs/MASTER_PROMPT.md.

Роль: Client Agent.
Задача: <одна ограниченная задача>.
Работай только в разрешённых директориях.
Сначала проверь contracts и текущую фазу.
В конце выведи обязательный отчёт агента.
```

Для CRM:

```text
Роль: CRM Agent.
Работай в apps/admin-crm и packages/ui-crm.
Изменения API сначала опиши через packages/contracts.
Не подключайся к БД напрямую.
```

Для backend:

```text
Роль: Backend Agent.
Работай в apps/api-server, packages/domain, packages/db и contracts.
API authoritative.
Payment, scoring, entitlement и hidden future — только server-side.
```

Для landing:

```text
Роль: Landing Agent.
Работай только в apps/landing.
Используй public API и не обещай токен, доходность или ликвидность.
```

## Правило «сначала UI/UX»

Перед реализацией экрана агент обязан:

1. Определить одну главную задачу экрана.
2. Проверить место экрана в навигации.
3. Описать loading, empty, error и success states.
4. Проверить 9:16, safe areas и touch targets.
5. Проверить reduced-motion и accessibility.
6. Определить источники данных и API contract.
7. Только после этого писать Phaser/rexUI или CRM UI.

Работа не считается завершённой, если экран выглядит как технический scaffold вместо финального продукта.

## Правило игровых assets

Если задача затрагивает карты, сущности, UI-анимации или косметику:

- проверить существующие assets;
- использовать asset manifest;
- не создавать случайные placeholders без маркировки;
- добавить preview/fallback;
- проверить mobile readability;
- обновить content/catalog schema;
- добавить localization keys;
- проверить public profile/tournament rendering.

## Правило доказательства

Фраза «готово» запрещена без:

```text
commands run
screenshots or e2e evidence where relevant
acceptance checklist
known risks
not implemented list
```

## Обязательный Agent Report

```text
Role:
Phase:
Task:
Scope:
Files changed:
Contracts changed:
Database/migrations:
API routes:
Feature flags:
Analytics events:
Commands run:
Tests:
Screenshots/evidence:
Risks:
Not implemented:
Rollback plan:
```
