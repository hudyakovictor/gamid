# SIGNAL ARENA
## Full Game Design Specification

итоговый стек игры: Phaser 4 + TypeScript + Vite — игровой движок (сцены, game loop, твины, камера, партиклы, звук)
* rexUI — игровой UI внутри сцены (панели, вкладки, списки, слайдеры, чек-листы)
* Свой кастомный CandleChart на Graphics — вместо lightweight-charts, чтобы график был частью игрового кадра, а не веб-виджетом


**Version:** 1.1 — Full Product Scope

**Purpose:** единое полное ТЗ на игровое ядро SIGNAL ARENA.

**Included:** учебная модель, сценарии, карты, сущности, Академия, Экзамены, Арена, Коллекция, дерево навыков, уровни, оценка, мобильное рабочее поле, телеметрия, персональная аналитика, турниры и правила расширения.

**Not included:** отдельный MVP-план, спринты, сроки, токеномика, NFT, marketplace implementation, реклама, DAO, real-money trading, wallet connection и маркетинговая стратегия.

---

# 1. Product definition

## 1.1. One sentence

**SIGNAL ARENA** — мобильный игровой тренажёр аналитического мышления и торговых решений на исторических ситуациях криптовалютного рынка.

## 1.2. Product objective

Игрок должен развивать реальные навыки:

```text
видеть рыночную структуру;
находить подтверждение;
отделять факт от шума и нарратива;
проверять собственную гипотезу;
строить ограниченный торговый план;
задавать риск и инвалидацию до входа;
выбирать Wait и No Trade;
управлять открытой позицией;
сохранять дисциплину после побед и убытков;
переносить навык в новую ситуацию.
```

## 1.3. Product is not

- Не торговый терминал.
- Не криптобиржа.
- Не демо-счёт.
- Не симулятор HFT/скальпинга в реальном времени.
- Не курс с тестами ради тестов.
- Не викторина «угадай следующую свечу».
- Не игра на рост виртуального PnL.
- Не play-to-earn продукт.
- Не источник торговых сигналов.
- Не обещание реальной прибыли.

## 1.4. Core principle

```text
Игрок не должен иметь возможности стабильно успешно играть,
не выполняя действие, которое имеет смысл в реальном анализе рынка.
```

---

# 2. Core vocabulary

| Object | Definition |
|---|---|
| **Scenario** | Историческая рыночная ситуация с точкой решения `t0` и скрытым будущим |
| **Card** | Игровая репрезентация переносимого навыка, действия или правила |
| **Entity** | Игровая репрезентация угрозы, ошибки, искажения или риска |
| **Protocol** | Обязательное правило миссии |
| **Academy** | Теория и контролируемая тематическая практика |
| **Exam** | Проверка темы без прямой подсказки сущности |
| **Arena** | Смешанная практика со скрытыми сущностями |
| **Collection** | Каталог идентифицированных сущностей, карт, трофеев и мастерства |
| **Decision Trace** | Телеметрия всего процесса принятия решения |
| **Mastery** | Статистически подтверждённое устойчивое применение навыка |

---

# 3. Core game loop

```text
Получить историческую ситуацию
→ изучить доступные данные
→ выбрать/активировать карты навыков
→ построить гипотезу
→ сформировать торговый план
→ зафиксировать решение и уверенность
→ раскрыть историческое продолжение
→ получить оценку и разбор
→ обновить навыки, паттерны, сущности и прогрессию
```

## 3.1. Pre-entry actions

```text
Long
Short
Wait
No Trade
```

## 3.2. In-position actions

```text
Hold Plan
Reduce Risk
Close Position
Move Protection
Wait for Confirmation
Do Not Average
Invalidate Idea
```

## 3.3. Mandatory plan fields

Для Long/Short игрок обязан определить:

```text
- вход или условие входа;
- стоп либо границу инвалидации;
- цель/целевую зону;
- риск-профиль;
- до трёх доказательств;
- уверенность.
```

Для Wait/No Trade игрок обязан назвать причину.

---

# 4. Historical scenario system

## 4.1. Scenario data

```text
scenario_id
asset_class
asset_id
market_segment
timeframe
decision_point_t0
available_source_groups
available_sources
available_cards
active_protocols
hidden_entities
allowed_actions
historical_future_segment
evaluation_rules
content_version
data_version
future_hash
```

## 4.2. Fairness

До фиксации решения игрок не видит данные после `t0`.

Запрещено раскрывать до решения:

- точную дату;
- уникальные исторические идентификаторы;
- оригинальный заголовок, по которому легко найти кейс;
- редкие числа и ссылки, раскрывающие будущее;
- название сущности;
- категорию тестируемой угрозы.

После сценария раскрываются:

```text
историческая дата;
актив;
источники;
продолжение рынка;
допустимые альтернативные планы;
методика оценки;
переносимый принцип.
```

## 4.3. Scenario formats

| Format | Purpose |
|---|---|
| **Pre-Entry** | Решение до открытия позиции |
| **In-Position** | Управление уже существующим планом |
| **Post-Loss** | Проверка поведения после негативного исхода |
| **Conflict** | Несколько источников противоречат друг другу |
| **Blind** | Скрыты тикер, дата и узнаваемые метаданные |
| **Series** | Цепочка решений, где прошлый результат влияет на давление |
| **Tournament** | Одинаковая ситуация для всех игроков |

---

# 5. Cards system

## 5.1. Card principles

Карты не являются ответами, оружием, магией или бустерами вероятности.

```text
Card = способ увидеть, проверить, оформить или защитить решение.
```

Карты могут:

1. Открывать релевантный источник.
2. Требовать аналитическое действие.
3. Формировать обязательное условие плана.
4. Ограничивать опасное действие.
5. Создавать структуру сравнения гипотез.

Карты не могут:

- показывать правильное направление;
- менять исторический исход;
- гарантировать прибыль;
- отменять последствия плохого решения;
- продаваться как функциональное преимущество;
- быть единственным способом получить высокий балл.

## 5.2. Card states

```text
LOCKED      — карта ещё не открыта.
UNLOCKED    — игрок изучил принцип.
APPLIED     — игрок применил принцип в тематической практике.
VERIFIED    — игрок устойчиво применяет принцип в смешанной Арене.
WEAK        — игрок систематически игнорирует или неверно применяет принцип.
```

## 5.3. Card access by mode

| Mode | Card model |
|---|---|
| Academy | Guided Loadout: тематический набор |
| Exam | Curated Loadout: 5–6 карт, выбор до 2–3 |
| Arena Base | 3–5 карт, среди них ключевые, вспомогательные, условные и отвлекающие |
| Arena Advanced | Personal Loadout: игрок собирает набор на серию, не зная будущие сценарии |

## 5.4. Attention limit

Стандартный лимит сценария:

```text
до 2 Reading Cards;
до 1 Decision Card;
до 1 Defense Card.
```

Protocol Cards не входят в лимит, потому что накладываются на миссию.

## 5.5. Card evaluation

Система оценивает:

```text
- уместность карты;
- корректность аналитического действия;
- связь вывода с планом;
- содержательность применения;
- уместность отказа от карты;
- игнорирование критичного риска.
```

Факт клика по карте сам по себе не даёт баллов.

---

# 6. Skill Cards catalog — 40

## 6.1. Reading Cards — 15

| # | Card | Function |
|---:|---|---|
| 1 | **Market Structure** | Тренд, диапазон, HH/HL, LH/LL и слом структуры |
| 2 | **Higher Timeframe** | Сопоставление локального сетапа со старшим контекстом |
| 3 | **Volume Confirmation** | Проверка, подтверждает ли объём движение цены |
| 4 | **Liquidity Map** | Зоны ликвидности, стопы, цели и риск выноса |
| 5 | **Volatility Context** | Связь диапазона рынка со стопом, целью и риском |
| 6 | **Correlation Check** | Связанные активы и относительная сила |
| 7 | **Derivatives Pulse** | OI, funding, ликвидации и перегрев |
| 8 | **News Context** | Событие против реакции цены на событие |
| 9 | **Social Sentiment** | Внимание и перегрев как контекст, а не доказательство |
| 10 | **Macro Context** | Макросреда и событийный риск |
| 11 | **On-Chain Flow** | Потоки, адреса, крупные участники, спрос/предложение |
| 12 | **Tokenomics Review** | Эмиссия, распределение, utility и предложение |
| 13 | **Unlock Calendar** | Будущие token unlocks и их риск |
| 14 | **Infrastructure Risk** | Контракты, мосты, ликвидность и возможность выхода |
| 15 | **Source Quality** | Первичный источник, пересказ, слух и манипуляция |

## 6.2. Decision Cards — 9

| # | Card | Function |
|---:|---|---|
| 16 | **Enter Now** | Входить сейчас только при подтверждении и качественной точке риска |
| 17 | **Wait for Retest** | Ждать повторного теста уровня |
| 18 | **Define Entry Zone** | Работать зоной входа, а не одной «идеальной» ценой |
| 19 | **Define Invalidation** | Формулировать условие отмены идеи |
| 20 | **Set Structural Stop** | Ставить стоп за структурной инвалидацией |
| 21 | **Target Liquidity** | Выбирать цель по структуре и ликвидности |
| 22 | **Minimum R-Multiple** | Проверять риск/потенциальную прибыль |
| 23 | **Scale Out** | Частично сокращать позицию по заранее заданному плану |
| 24 | **No Trade Is a Decision** | Осознанно отказываться от сделки |

## 6.3. Protocol Cards — 8

| # | Card | Function |
|---:|---|---|
| 25 | **Evidence Only** | Решение должно опираться на независимые наблюдаемые факты |
| 26 | **Noise Quarantine** | Низкокачественный шум не может быть основанием решения |
| 27 | **Risk-First Mode** | Сначала риск и инвалидация, затем направление |
| 28 | **No Confirmation, No Trade** | Без подтверждения агрессивный вход недоступен |
| 29 | **Higher Timeframe Check** | Старший ТФ нужно открыть и интерпретировать |
| 30 | **After a Loss** | Новое решение не должно быть реакцией на прошлый убыток |
| 31 | **Discipline Over Profit** | Процесс оценивается выше случайного PnL |
| 32 | **Out of Market Is Normal** | Wait/No Trade является качественным действием |

## 6.4. Defense Cards — 8

| # | Card | Function |
|---:|---|---|
| 33 | **News Is Not a Signal** | Защита от автоматического действия по громкой новости |
| 34 | **Wait for Stabilization** | Защита от ловли падающего рынка без структуры |
| 35 | **Do Not Chase** | Защита от входа вслед за уже ушедшим импульсом |
| 36 | **Avoid Revenge Trading** | Защита от попытки отыграться после убытка |
| 37 | **No Averaging Without a Plan** | Защита от импульсивного усреднения |
| 38 | **Risk Cap** | Ограничение роста риска и размера позиции |
| 39 | **Confidence Check** | Проверка соответствия уверенности качеству доказательств |
| 40 | **Preserve the System** | Защита правил в просадке, после побед и при давлении |

---

# 7. Entities system

## 7.1. Entity principle

```text
Entity = скрытая причина, по которой игрок может принять плохое решение.
```

Сущность не является монстром на игровом поле и не получает урон от карты.

Игрок нейтрализует сущность через:

```text
распознавание риска;
уместный анализ;
защищённый план;
дисциплину;
соблюдение протокола.
```

## 7.2. Entity visibility

| Mode | Visibility rule |
|---|---|
| Academy | Тема известна; сущность объясняется после контролируемого упражнения |
| Exam | Тема известна частично; имя сущности скрыто |
| Arena | Сущность полностью скрыта до решения и обычно не называется после каждого сценария |
| Collection | Полная сущность открывается после статистического подтверждения |

## 7.3. Entity progression

```text
UNKNOWN PATTERN
→ EMERGING PATTERN
→ IDENTIFIED
→ MASTERY I
→ MASTERY II–V
```

### Identification

```text
- пройдена связанная тема Academy;
- сдан тематический Exam;
- минимум 5 скрытых релевантных столкновений Arena;
- качественное решение минимум в 3 из 5;
- минимум 2 разных контекста.
```

### Mastery I

```text
- 12–15 скрытых релевантных столкновений;
- 3+ рыночных режима;
- 2+ типа активов;
- 80%+ качественных решений;
- 2+ комбинации с другими сущностями;
- нет тяжёлого повторного срыва в последних 5 релевантных сценариях.
```

### Advanced Mastery

```text
Mastery II — сущность + ещё одна угроза.
Mastery III — сущность в другом классе актива.
Mastery IV — сущность внутри позиции.
Mastery V — сущность в серии, где прошлый результат создаёт давление.
```

---

# 8. Entities catalog — 40


### Market & Technical Threats

1. **Wick Mimic** — единичный фитиль принимается за подтверждённый сигнал.
2. **Fake Breakout Phantom** — пробой без закрепления, объёма или продолжения.
3. **Indicator Cult** — один индикатор подменяет структуру и контекст.
4. **Stop-Hunt Kraken** — вынос очевидной ликвидности и возврат.
5. **Liquidity Hydra** — несколько ликвидных целей создают неоднозначность.
6. **Slippage Slime** — ухудшение исполнения в быстром/тонком рынке.

### Behavioral & Emotional Threats

7. **FOMO Wraith** — вход из страха пропустить движение.
8. **Loss Aversion Wraith** — отказ признать отмену идеи.
9. **Revenge Wraith** — попытка отыграться после убытка.
10. **Dopamine Imp** — овертрейдинг и тяга к действию.
11. **Paper-Hands Poltergeist** — ранний выход из хорошего плана.
12. **Routine Rot** — старый шаблон в новом режиме.
13. **Anchor Golem** — фиксация на цене входа.
14. **Hubris Dragon** — чрезмерная уверенность после серии успехов.
15. **System Breaker** — сознательное нарушение протокола.
16. **Certainty Siren** — высокая уверенность при слабых доказательствах.

### Information & Narrative Threats

17. **Meme Mirage** — хайп заменяет факты.
18. **Headline Titan** — заголовок заменяет источник и реакцию рынка.
19. **Narrative Siren** — история заменяет доказательства.
20. **Confirmation Bias Cult** — поиск только подтверждений.
21. **Cycle Ouroboros** — механическое применение циклов.
22. **Social Echo** — пересказы одного источника кажутся независимыми фактами.

### Risk & Position Threats

23. **Leverage Goblin** — чрезмерное плечо, размер или слишком узкий стоп.
24. **Drawdown Leviathan** — рост риска и потеря системы в серии убытков.

## 8.2. Extended entities — 16

### Market & Technical Threats

25. **Correlation Spider** — конфликт с поведением связанных активов.
26. **Volatility Chimera** — разная волатильность меняет смысл одинакового паттерна.
27. **Regime Shifter** — рынок сменил режим.

### Risk & Position Threats

28. **Whale Syndicate** — крупный поток не раскрывает намерение участника.
29. **Expectancy Sphinx** — разовый исход принимается за качество стратегии.
30. **Risk Mirage** — маленький стоп ошибочно считается малым риском.
31. **Averaging Maw** — усреднение маскируется под улучшение цены.

### Web3 & Infrastructure Threats

32. **Rug Pull Phantom** — риск изъятия ликвидности/ценности.
33. **Honeypot Mimic** — покупка возможна, выход ограничен.
34. **Approval Leech** — опасные wallet approvals.
35. **Token Parasite** — зависимость токена от слабой инфраструктуры/контрагента.
36. **Unlock Titan** — предложение меняется из-за unlock.
37. **Insider Syndicate** — информационная асимметрия до события.
38. **Governance Golem** — концентрация контроля и governance-риски.
39. **Yield Chimera** — высокая APY скрывает риск/неустойчивость.
40. **Bridge Wraith** — отдельный риск мостовой инфраструктуры.

---

# 9. Academy, Exam, Arena

## 9.1. Academy

```text
Короткая теория
→ пример
→ контролируемая практика
→ разбор
→ тематический экзамен.
```

В Academy тема может быть названа:

```text
Example:
Topic: False Breakout.
Skill: confirmation, volume, retest, invalidation.
```

Сущность не должна находиться поверх графика во время действия. После упражнения допускается объяснение:

```text
This pattern was associated with Fake Breakout Phantom.
```

## 9.2. Exam

Экзамен проверяет тему без прямой маркировки сущности.

```text
Игрок знает область:
"levels and confirmation".

Игрок не знает:
будет ли ложный пробой, реальный пробой,
вынос ликвидности или качественный No Trade.
```

## 9.3. Arena

Arena проверяет перенос навыка:

```text
- темы смешаны;
- сущности скрыты;
- нет названия урока;
- несколько правдоподобных планов могут быть качественными;
- игрок выбирает инструменты без знания тестируемой угрозы.
```

По умолчанию после арены раскрывается поведенческий разбор, но не имя сущности.

---

# 10. Curriculum and unlock order

| Module | Subject | Main unlocks |
|---:|---|---|
| 0 | Decision Foundations | No Trade Is a Decision, Define Invalidation, Evidence Only |
| 1 | Price Structure | Market Structure, Define Entry Zone |
| 2 | Breakout Validation | Volume Confirmation, Wait for Retest, No Confirmation, No Trade |
| 3 | Multi-Timeframe Context | Higher Timeframe, Higher Timeframe Check |
| 4 | Risk and Invalidation | Volatility Context, Set Structural Stop, Risk Cap, Risk-First Mode |
| 5 | Targets and Liquidity | Liquidity Map, Target Liquidity, Minimum R-Multiple, Scale Out |
| 6 | Position Management | No Averaging Without a Plan, Preserve the System |
| 7 | Discipline | Do Not Chase, Avoid Revenge Trading, After a Loss, Out of Market Is Normal |
| 8 | Information Quality | News Context, Social Sentiment, Source Quality, News Is Not a Signal, Noise Quarantine |
| 9 | Market Regime & Intermarket | Correlation Check, Derivatives Pulse |
| 10 | Token & Web3 Risk | On-Chain Flow, Tokenomics Review, Unlock Calendar, Infrastructure Risk |
| 11 | Macro & Uncertainty | Macro Context, Confidence Check |
| 12 | Mastery & Personal System | Discipline Over Profit, verification of cross-skills |

---

# 11. Scoring engine

## 11.1. Post-scenario layers

```text
1. Market Fact
What historically happened.

2. Plan Consequence
What would happen to this exact player plan.

3. Decision Quality
How well the player used available information, controlled risk and followed process.
```

## 11.2. Default quality score — 0 to 100

| Dimension | Weight |
|---|---:|
| Context interpretation | 10 |
| Evidence quality | 10 |
| Hypothesis logic | 10 |
| Entry/condition quality | 10 |
| Stop/invalidation logic | 15 |
| Target/RR quality | 10 |
| Risk management | 10 |
| Discipline | 10 |
| Entity resistance | 10 |
| Protocol adherence | 5 |
| Confidence calibration | 10 |
| **Total** | **100** |

Weights can change by scenario format, but the evaluated dimensions must be disclosed after completion.

## 11.3. Non-negotiable rules

```text
Good process + bad market outcome = can receive high score.

Bad process + lucky profit = can receive low score.

No Trade + strong evidence = can receive high score.

A card click alone = no score.

Protocol violation can reduce score even if the trade wins.
```

---

# 12. Skill tree and player level

## 12.1. Three domains

```text
MARKET
What the player can see in data.

TRADE
How the player converts analysis into a plan.

DISCIPLINE
How the player prevents behavior from destroying the plan.
```

## 12.2. Cross-skills

Cross-skills require confirmed abilities from two or three domains.

Examples:

```text
Confirmed Entry
= Market Structure + Volume Confirmation + Wait for Retest.

Safe Stop
= Volatility Context + Set Structural Stop + Risk Cap.

Anti-FOMO Protocol
= Do Not Chase + No Trade Is a Decision + Out of Market Is Normal.

Verified Narrative
= Source Quality + News Context + Evidence Only + Noise Quarantine.
```

## 12.3. Player level

```text
Player level ≠ hours played.
Player level ≠ cards collected.
Player level ≠ virtual PnL.

Player level = verified stability of quality decisions.
```

Levels 0–99 are aggregate competence, based on:

```text
market reading;
plan quality;
risk control;
entity resistance;
process discipline;
confidence calibration;
transfer across contexts.
```

---

# 13. Mobile Decision Workspace

## 13.1. Do not use a browser metaphor

Do not implement a "browser widget" with many tabs.

Use **Decision Workspace / Рабочее поле решения**: компактная мобильная среда для исследования и принятия решения.

## 13.2. Mobile constraints

```text
- vertical layout;
- maximum 5 source groups per scenario;
- beginner scenarios use maximum 3 groups;
- no nested tabs;
- no required horizontal scrolling;
- no order book;
- no full broker order form;
- no dozens of indicators;
- no continuous realtime market.
```

## 13.3. Source groups

| Group | Content |
|---|---|
| **PRICE** | Chart, candles, structure, levels |
| **CONTEXT** | Higher TF, correlations, market regime |
| **FLOW** | Volume, liquidity, OI, funding, liquidations |
| **EVENT** | News, macro, sentiment, regulation |
| **PROJECT** | Tokenomics, unlocks, on-chain, infrastructure risk |

## 13.4. Screen composition

```text
1. Top Bar
Scenario, progress, protocol, pause.

2. Task Card
Asset/timeframe, short context, player task.

3. Main Scene
Compact interactive chart and only relevant market markers.

4. Source Tray
Up to five source icons; each opens a bottom sheet.

5. Skill Hand
Three to five available cards.

6. Decision Sheet
Action, entry condition, stop/invalidation, target/No Trade, evidence, confidence.
```

---

# 14. Telemetry and Personal Insight

## 14.1. Decision Trace fields

```text
scenario_id
available_sources
opened_sources
source_open_order
source_dwell_time
source_revisit_count
available_cards
selected_cards
completed_card_actions
card_relevance
active_protocols
initial_plan
plan_revisions
selected_evidence
entry_stop_target_invalidation
risk_profile
confidence
final_action
historical_outcome
quality_score
score_breakdown
hidden_entities
```

## 14.2. Analytics rule

Время не является самостоятельным доказательством ошибки.

Нельзя:

```text
"Ты потратил пять секунд на объём, значит ошибся."
```

Можно:

```text
"В сценариях, где объём противоречил цене,
ты редко использовал его в доказательствах;
в этой группе качество решений ниже твоего личного baseline."
```

## 14.3. Personal Insight output

После достаточного количества качественных данных система должна показывать:

```text
- 1 критическую слепую зону;
- 2 вторичных повторяющихся паттерна;
- 1 устойчивую сильную сторону;
- доказательства и уверенность каждого вывода;
- персональный 7-day Edge Plan;
- персональные rematch-сценарии.
```

---

# 15. Arena, Collection and Tournaments

## 15.1. Arena

```text
- темы и сущности смешаны;
- сущности скрыты;
- игрок не знает, что именно тестируется;
- карты выбираются без подсказки врага;
- возможны несколько качественных путей;
- прогресс строится на переносе навыка.
```

## 15.2. Collection

Collection содержит:

```text
- identified entities;
- mastery ranks;
- verified cards;
- cross-skills;
- history of encounters;
- personal weak patterns;
- unlocked explanations and examples.
```

## 15.3. Tournaments

```text
- одинаковая историческая ситуация для всех;
- одинаковый момент решения;
- одинаковые данные и правила;
- одинаковая версия scoring engine;
- скорость только tie-breaker.
```

Ranking order:

```text
1. Decision Quality.
2. Protocol adherence.
3. Evidence quality.
4. Follow-up decision quality.
5. Speed as tie-breaker.
```

---

# 16. Global acceptance checklist

```text
[ ] Игрок не может стабильно побеждать без реального аналитического действия.
[ ] Карты требуют действия, а не показывают ответ.
[ ] Сущность не отображается до решения в Arena.
[ ] Сущность не выдаётся за один правильный ответ.
[ ] No Trade может получить высокий балл.
[ ] Случайная прибыль может получить низкий балл.
[ ] Несколько качественных путей допустимы, где рынок действительно неоднозначен.
[ ] Мобильный сценарий содержит максимум 5 групп источников.
[ ] UI не похож на полноценный брокерский терминал.
[ ] UI не похож на абстрактный фэнтезийный бой.
[ ] Каждый сценарий создаёт полезный Decision Trace.
[ ] Прогресс отражает verified skill, а не время, клики, деньги или PnL.
```
