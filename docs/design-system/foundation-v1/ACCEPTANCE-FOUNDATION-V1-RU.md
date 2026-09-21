# Acceptance — Design System Integration Foundation v1

## Обязательные критерии

- [x] Пять самостоятельных root pages.
- [x] Для каждой страницы определён page kit.
- [x] Для каждой страницы есть минимум два preset.
- [x] Единый конфиг цветов, shape families, typography, spacing, motion и grid.
- [x] Компоненты собираются через registry/typed specs.
- [x] Bento footprints ограничивают допустимую геометрию.
- [x] Генератор переключает только валидные presets.
- [x] Есть desktop и mobile preview.
- [x] Есть reduced-motion fallback.
- [x] Есть layout validation.
- [x] Typecheck — `tsc --noEmit` пройден.
- [x] Production build — Vite build пройден.
- [x] Visual QA desktop — проверены все пять page kits, overflow/overlay ошибок нет.
- [x] Visual QA mobile — проверен viewport 390×844, горизонтального overflow нет.

## Что сознательно не входит

- server Seal и Reveal;
- реальные ScenarioPackage data;
- Coins ledger;
- product authentication;
- все 20 interaction primitives;
- окончательные Entity/Skill Card assets;
- production routes.

Они не блокируют приёмку Foundation v1, потому что относятся к следующим самостоятельным этапам.
