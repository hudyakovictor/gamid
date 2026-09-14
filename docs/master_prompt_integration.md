# SIGNAL ARENA — Master Prompt Integration

## Назначение

Большой master prompt пользователя не должен оставаться только внешним текстом в Arena.ai. Его правила разделяются по уровням, чтобы не было противоречий и чтобы любой агент мог начать работу по ссылке на репозиторий.

## Где хранить правила

```text
AGENTS.md
  краткие обязательные правила для всех агентов,
  роли, границы директорий, contract-first и запреты.

docs/CONTRIBUTING.md
  ветки, commits, PR, review tags и merge policy.

docs/developing_status.md
  текущая фаза, последовательность и acceptance gates.

README.md
  навигация по проекту, текущий статус и ссылки.

docs/full_game_spec.md
  каноничное продуктовое и игровое ТЗ.

docs/monetization.txt
  коммерческая модель, Stars, Founder Packs, anti-pay-to-win и deferred platform work.

docs/acceptance_matrix.md
  проверяемые критерии приёмки.

docs/p0_p1_remediation_plan.md
  активные технические блокеры и порядок их закрытия.

docs/security_architecture.md
  security controls, trust boundaries and release requirements.
```

## Приоритет правил

При конфликте использовать такой порядок:

```text
1. Security, privacy and data integrity.
2. README and current developing_status phase.
3. docs/full_game_spec.md and docs/academy_plan.md.
4. docs/system_architecture.md and docs/acceptance_matrix.md.
5. docs/security_architecture.md, deployment and observability controls.
6. docs/monetization.txt rules and deferred-platform decisions.
7. Current implementation, only where it does not contradict the documents above.
```

## Как использовать в Arena.ai

Пользователь может давать короткую команду:

```text
Репозиторий:
https://github.com/hudyakovictor/ssarena

Прочитай AGENTS.md, README.md, docs/README.md,
docs/developing_status.md, docs/CONTRIBUTING.md и relevant canonical documents.

Роль: Client Agent.
Задача: <одна ограниченная задача>.
Работай только в разрешённых директориях.
Сначала проверь contracts, current phase, security boundary and acceptance gates.
Не добавляй hidden/future truth или authoritative scoring в public client.
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
