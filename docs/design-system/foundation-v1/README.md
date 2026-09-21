# Signal Arena Design System Integration Foundation v1

Закрытый этап: monorepo-ready foundation для подключения текущей дизайн-системы.

## Что завершено

- единый типизированный `designSystemConfig`;
- semantic colors, typography, shapes, motion, breakpoints и grid;
- `ComponentRegistry` и валидатор preset;
- пять root page kits: Hub, Academy, Arena, Tournaments, Shop;
- по два layout preset на каждую страницу;
- Bento Composer с footprints;
- desktop/mobile preview;
- кнопка генерации альтернативного валидного preset;
- responsive CSS и reduced-motion fallback;
- production guardrails;
- самостоятельная Vite-сборка.

## Запуск

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Границы закрытого этапа

Этот этап закрывает интеграционный фундамент и preview-компоновки. Он не реализует server Seal, backend, economy ledger, реальные API и production game routes. Они являются следующими этапами и не должны смешиваться с приёмкой Foundation v1.

## Структура

```text
apps/design-system-lab/
packages/ui-game/
```

Production-клиент должен импортировать только `packages/ui-game`, а не Lab.
