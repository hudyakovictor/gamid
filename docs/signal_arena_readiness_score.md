# SIGNAL ARENA — Оценка ТЗ и готовности

## Методика

Оценка сделана по текущему `full_game_spec.md` v1.1 и `monetization.txt`, с учётом подготовленных архитектурных дополнений v3/v4. Баллы — не оценка качества идеи вообще, а оценка готовности к реализации, монетизации и масштабированию.

## Итог

| Показатель | Балл |
|---|---:|
| Игровое ядро и дизайн решений | 91/100 |
| Образовательная методика | 90/100 |
| Архитектурная готовность после v3/v4 | 87/100 |
| Готовность к Telegram Mini App MVP | 78/100 |
| Готовность к ранней Stars-монетизации | 76/100 |
| Готовность к публичному запуску | 64/100 |
| Готовность к масштабированию | 82/100 |
| Средняя текущая готовность | **81/100** |

## 15 факторов

| № | Фактор | Балл | Оценка | Что уже хорошо | Что мешает 99 |
|---:|---|---:|---|---|---|
| 1 | Core gameplay | 93 | Очень сильно | Чёткий loop: evidence → hypothesis → plan → reveal → debrief | Нужны конкретные playable vertical slice и список первых сценариев |
| 2 | Образовательная методика | 92 | Очень сильно | Academy → Exam → Arena → Mastery, transfer и rematch | Нужны измеримые learning experiments и baseline |
| 3 | Сценарии и fairness | 89 | Сильно | t0, hidden future, future hash, версии данных | Нужен production pipeline проверки исторических данных |
| 4 | Scoring и rubric | 88 | Сильно | 11 измерений, process выше случайного PnL | Нужны формальные функции расчёта и тестовые сценарии с эталонными ответами |
| 5 | UX мобильного workspace | 84 | Хорошо | Ограничение source groups, no terminal metaphor | Нет финального набора wireframes и task flows |
| 6 | Phaser-клиент | 86 | Хорошо | Phaser 4 + TS + Vite + rexUI + custom chart | Нет согласованной структуры сцен, state machine и performance budget в коде |
| 7 | Backend domain model | 82 | Хорошо | Сценарии, решения, progression и telemetry определены | Нужно создать реальные schemas, commands, repositories и migrations |
| 8 | Telegram integration | 72 | Средне | Понятна роль Telegram Mini App и Stars | Нет реализованных auth, Bot API, webhook, initData и production test flows |
| 9 | Stars monetization | 76 | Хорошо для дизайна | Catalog, orders, entitlements, refunds, Founder Packs | Нет реализации и end-to-end тестов; нужны юридическая и операционная проверки |
| 10 | Founder Packs | 78 | Хорошо | Ограниченные цифровые наборы без обещания токена | Нужно проверить willingness-to-pay, copy, refund and supply edge cases |
| 11 | Ads and sponsored tasks | 61 | Средне | Есть rewarded-модель и server callback concept | Нет конкретной сети, интеграции, eCPM assumptions, privacy и anti-fraud tests |
| 12 | Tournament system | 75 | Хорошо | Одинаковые scenario/rubric, leaderboard, tie-breaker | Полный tournament engine и anti-cheat ещё не реализованы |
| 13 | Public profiles and cosmetics | 74 | Хорошо | Backend-first inventory, equipment, visibility rules | Нет asset manifest pipeline, rendering contract и moderation workflow |
| 14 | CRM and operations | 78 | Хорошо | Отдельный Admin API, CRM stack, RBAC, audit | CRM ещё не существует; нужны roles, dangerous actions и support runbooks |
| 15 | AI and future scalability | 83 | Сильно | Provider abstraction, agent jobs, approvals, adapters, localization | Нужны cost controls, evaluation datasets, prompt registry and human approval UI |

## Оценка по горизонтам

### Сегодня: спецификация

**88/100.** Концептуально и системно документ уже выше среднего. Игровой цикл, образовательная философия, scoring и ограничения определены лучше, чем в большинстве ранних игровых ТЗ.

### Перед первым кодом

**78/100.** Нужно сначала закрыть API contracts, database schema, MVP scope, первые сценарии и технический vertical slice. Сейчас есть риск начать строить платформу раньше, чем будет проверена одна полная игровая сессия.

### Telegram MVP

**70–78/100.** Архитектурно путь определён, но готовность ограничивают отсутствие реализованных Stars, auth, refund flow, production telemetry и backend validation.

### Ранняя монетизация

**76/100.** Founder Packs можно проектировать сразу, но фактическая готовность появится после end-to-end тестирования Stars и проверки, что покупатель сначала видит ценность игры, а затем оффер.

### Будущее масштабирование

**82/100.** После добавления v3/v4 архитектура хорошо подготовлена к CRM, AI, локализации, общему backend и будущим platform adapters. До 90+ не хватает production boundaries, observability, load testing и migration discipline.

## Критические разрывы до запуска

### P0 — обязательно до публичного MVP

1. Реализовать один playable vertical slice: вход → scenario → decision → reveal → score → insight.
2. Утвердить 5–10 сценариев с проверенными rubrics.
3. Создать `packages/contracts`.
4. Создать database schema для users, scenarios, runs, decisions, scores, catalog, orders и entitlements.
5. Реализовать server-side Telegram auth.
6. Реализовать Stars test flow и idempotent fulfillment.
7. Добавить feature flags и audit log.
8. Проверить утечку hidden future.
9. Собрать минимальную CRM: users, catalog, orders, logs.
10. Добавить crash/error monitoring.

### P1 — сразу после MVP

1. Founder Pack.
2. Rewarded ads.
3. Public profiles.
4. Cosmetics rendering.
5. Basic tournament schema and one test tournament.
6. Localization pipeline ru/en.
7. Personal insights.
8. Load and abuse tests.

### P2 — позже

1. Full tournament seasons.
2. Squads and social graph.
3. Creator marketplace.
4. AI-assisted content generation.
5. TON Connect.
6. On-chain credentials.
7. Token decision.
8. Other platform adapters.

## Почему не 99 сейчас

Главный недостаток — не слабость концепции, а отсутствие доказательства исполнения. ТЗ отлично описывает, каким должен быть зрелый продукт, но ещё не доказывает:

- что первая сессия будет понятной;
- что scenario действительно интересно проходить;
- что scoring будет восприниматься честным;
- что пользователь купит Founder Pack;
- что backend выдержит повторные платежные события;
- что CRM позволит одному основателю управлять продуктом;
- что AI-агенты не будут создавать больше шума, чем экономии.

## Путь от 81 к 90

```text
1. Собрать vertical slice.
2. Провести 10–20 ручных пользовательских тестов.
3. Зафиксировать 5–10 production-quality scenarios.
4. Сделать Stars sandbox flow.
5. Подключить CRM payments/catalog.
6. Включить базовую аналитику.
7. Запустить закрытую альфу.
8. Измерить D1/D7, completion, score trust и first purchase intent.
```

## Путь от 90 к 99

```text
1. Доказать learning transfer на отложенном сценарии.
2. Доказать willingness-to-pay Founder Pack.
3. Доказать устойчивость refund/payment ledger.
4. Доказать anti-cheat и fairness tournament.
5. Доказать стабильность public profile/cosmetic rendering.
6. Ввести load tests и disaster recovery.
7. Внедрить AI evaluation datasets и approval workflows.
8. Провести localization QA.
9. Провести legal/privacy/security review.
10. Показать, что игра работает при выключенных ads, token и blockchain modules.
```

## Финальный вердикт

Signal Arena сейчас — это **сильное продуктовое ТЗ с готовностью примерно 81/100**, а не готовый production-продукт на 99/100.

Сильнейшие стороны:

- необычное ядро decision-before-outcome;
- learning-first философия;
- честный scoring;
- анти-pay-to-win контракт;
- хорошая основа под Stars;
- правильное отложенное решение по токену;
- перспективная архитектура CRM/AI/локализации.

Главный риск:

```text
перепроектировать платформу быстрее,
чем доказать, что одна короткая игровая сессия действительно работает.
```

Правильный ближайший шаг — не добавлять ещё 50 систем, а собрать вертикальный срез и проверить его на реальных игроках.
