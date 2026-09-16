# SIGNAL ARENA — Interactive & Motion Specification

Status: REQUIRED
Scope: client interaction and motion behavior
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: conflicting local motion contracts and legacy Home/Lobby terminology
Required evidence: visual QA, responsive QA, accessibility QA, reduced-motion QA, state-transition tests
Canonical dependencies: `motion_interaction_system_spec.md`, `full_game_spec.md`, `../packages/contracts/src/scenario.ts`

## 1. Цель

Интерактив и анимация должны объяснять состояние решения, усиливать обучение и удерживать внимание без casino-like reward loops.

Правило:

```text
Если анимация не показывает изменение состояния,
обратную связь или причинно-следственную связь — удалить её.
```

## 2. Motion principles

Canonical duration tokens are defined in `motion_interaction_system_spec.md`:

```text
instant = 0–80 ms
fast = 120 ms
standard = 180 ms
emphasis = 240 ms
reveal = 400 ms
celebration = 600 ms maximum
```

Reduced-motion mode is mandatory. It removes camera travel, parallax, shake and decorative particles while preserving state order, text confirmation, focus and meaning. Required transitions should remain approximately within 100–150 ms in reduced-motion mode.

Animation must not hide data or delay access to an action. No coin showers, slot-machine flashes or loot-box presentation.

## 3. Arena Hub / boot

### Логотип

Буква S собирается из двух потоков свечей: bullish и bearish. Потоки сходятся в центральной точке решения.

### Idle

The Arena Hub remains visually stable at idle. Decorative motion is not used as a state signal; any pulse must be tied to a real status or interaction change.

### Доступность

Добавить `prefers-reduced-motion` и внутриигровой переключатель.

## 4. Scenario start

- Свечи появляются слева направо с небольшим stagger.
- Последняя доступная свеча получает мягкий highlight.
- Будущее — затемнённая зона с seal `HIDDEN FUTURE`.
- Не использовать направление blur или визуальные подсказки.

## 5. Source Tray

| Группа | Motion language |
|---|---|
| PRICE | тонкая бело-фиолетовая рамка |
| CONTEXT | концентрические кольца |
| FLOW | пульсация объёмных колонок |
| EVENT | короткий newsroom flash |
| PROJECT | network nodes |

Открытая группа получает halo до закрытия bottom sheet.

## 6. Evidence linking

Игрок соединяет evidence chip с гипотезой:

- сильная связь — цельная линия;
- неполная связь — пунктир;
- конфликт — две линии разных цветов и обязательное пояснение;
- недопустимая связь — спокойный shake и текстовое объяснение, без красного наказания.

## 7. Cards

- Карта вынимается из hand в центр workspace.
- Применение запускает `reveal` evidence animation (400 ms maximum, interruptible).
- Использованный слот становится stamp `APPLIED`.
- Лимит внимания показывается слотами, а не красной шкалой.

## 8. Decision Sheet

- Long — восходящая геометрия.
- Short — нисходящая геометрия.
- Wait — спокойная горизонтальная линия.
- No Trade — замыкающийся контур сохранения капитала.

Long и Short не должны иметь «победный» и «проигрышный» цвет. Цвет показывает действие, не качество.

## 9. Decision Seal

Canonical state flow:

```text
valid local decision
→ local validation feedback
→ controls enter pending/frozen state
→ POST Seal
→ server accepts immutable decision
→ Decision Recorded
→ resolving
→ server returns authorized reveal
→ historical future
→ outcome
→ Quality Score
→ debrief
```

Before server confirmation the client may show only:

```text
Sealing decision…
Проверяем и фиксируем решение…
```

Before confirmation it must not show `Decision Recorded`, historical future, outcome, score, Entity reveal or debrief conclusion. On an ambiguous network result, the client must query run state before unlocking controls:

```text
GET run state
→ sealed: continue Reveal
→ started: allow safe retry
→ unknown: show recovery state
```

## 10. Future reveal

Future появляется как архивная плёнка или развернувшийся графический слой.

- хороший процесс + плохой outcome: холодный blue;
- хороший процесс + favourable outcome: спокойный cyan;
- плохой процесс + favourable outcome: muted amber;
- плохой процесс + bad outcome: muted red без screen shake.

Сообщения:

```text
План выдержал проверку. Рынок не обязан платить.
Рынок временно спонсировал ошибку.
Решение принято до будущего. Именно это и считалось.
```

## 11. Score reveal

Оценка появляется по слоям:

```text
context
→ evidence
→ invalidation
→ risk
→ discipline
→ confidence
→ total
```

Каждый слой — forensic stamp. Никаких мгновенных 100/100 без breakdown.

## 12. Entity reveal

В Arena сначала показывать symptom card:

```text
Observed pattern: evidence ignored under pressure.
```

После статистического подтверждения открывать фрагмент сущности. Фрагменты не выпадают случайно и не покупаются.

## 13. Mastery

- UNKNOWN — шумный контур.
- EMERGING — контур стабилизируется.
- IDENTIFIED — печать имени.
- MASTERY — спокойная симметричная форма.

Визуальный прогресс не должен быть продаваемым.

## 14. Founder Pack

Founder Pack открывается как архивный dossier:

- точный preview состава;
- отсутствие случайности;
- спокойный metallic accent;
- trust copy рядом с CTA;
- animated badge reveal после подтверждённого платежа.

## 15. Rewarded Ads

Rewarded ad — добровольный contract with only canonical rewards:

```text
reward preview: +1 Energy or cosmetic fragment
→ user confirmation
→ ad
→ server callback
→ server-side cap and session validation
→ reward stamp
```

One completed rewarded ad grants `+1 Energy` by default. It grants no direct XP, direct Mastery Stars, Rating, tournament use, score modifier or hidden information. No automatic ad follows a failed decision.

## 16. Social sharing

После scenario создать share card:

```text
quality score
one insight
one weak pattern
challenge link
```

Не раскрывать будущий outcome и полный rubric до открытия ссылки.

## 17. Haptics / sound

- soft tick — появление свечи;
- low click — evidence selected;
- muted seal — decision lock;
- bass pulse — future reveal;
- soft stamp — score dimension;
- no gambling sounds.

## 18. Error states

```text
Loading: «Система проверяет доказательства».
Network: «Связь с архивом потеряна. Решение не списано».
Payment: «Платёж не подтверждён. Entitlement не выдан».
Refund: «Доступ возвращён в состояние до покупки».
```

## 19. Canonical MotionContract

Every important animation uses the same contract:

```text
motion_id
trigger
source_state
target_state
duration_token
easing_token
interruptible
blocking
reduced_motion_behavior
sound_cue
haptic_cue
analytics_event
```

## 20. Acceptance checklist

```text
[ ] Arena Hub is the only canonical root-screen name.
[ ] Decision Recorded is shown only after server-confirmed immutable Seal.
[ ] Ambiguous Seal requests recover through GET run state.
[ ] Rewarded ads grant only canonical rewards after server verification.
[ ] Motion uses the shared MotionContract and duration tokens.
```

```text
[ ] Анимация не выдаёт будущий outcome.
[ ] Анимация не скрывает evidence.
[ ] Reduced-motion работает.
[ ] Payment reward появляется только после server confirmation.
[ ] Score reveal показывает breakdown.
[ ] No Trade визуально не выглядит как проигрыш.
[ ] Founder Pack не похож на loot box.
[ ] Нет casino-like звуков.
[ ] Критическая кнопка не блокируется длинной анимацией.
```