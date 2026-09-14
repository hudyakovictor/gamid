# SIGNAL ARENA — Interactive & Motion Specification

## 1. Цель

Интерактив и анимация должны объяснять состояние решения, усиливать обучение и удерживать внимание без casino-like reward loops.

Правило:

```text
Если анимация не показывает изменение состояния,
обратную связь или причинно-следственную связь — удалить её.
```

## 2. Motion principles

- 200–500 ms для критических переходов.
- 700–1200 ms для полноценных reveal-сцен.
- Reduced-motion mode обязателен.
- Анимация не должна скрывать данные.
- Анимация не должна задерживать доступ к действию.
- Никаких coin showers, slot-machine flashes и случайных loot-box эффектов.

## 3. Home / boot

### Логотип

Буква S собирается из двух потоков свечей: bullish и bearish. Потоки сходятся в центральной точке решения.

### Idle

Фоновая сетка едва заметно дышит. Один акцентный pulse раз в 4–8 секунд.

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
- Применение запускает 300–500 ms evidence animation.
- Использованный слот становится stamp `APPLIED`.
- Лимит внимания показывается слотами, а не красной шкалой.

## 8. Decision Sheet

- Long — восходящая геометрия.
- Short — нисходящая геометрия.
- Wait — спокойная горизонтальная линия.
- No Trade — замыкающийся контур сохранения капитала.

Long и Short не должны иметь «победный» и «проигрышный» цвет. Цвет показывает действие, не качество.

## 9. Decision lock

```text
pause 250 ms
→ seal Decision Recorded
→ freeze input
→ reveal future
```

До server confirmation нельзя показывать окончательный результат.

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

## 15. Ads

Rewarded ad — добровольный контракт:

```text
reward preview
→ ad duration
→ user confirmation
→ ad
→ server callback
→ reward stamp
```

Награда появляется только после подтверждения сервера.

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

## 19. Implementation contracts

Каждая важная анимация должна иметь:

```text
motion_id
trigger
precondition
visual_state_change
duration_ms
sound_id
haptic_id
reduced_motion_variant
analytics_event
```

## 20. Acceptance checklist

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