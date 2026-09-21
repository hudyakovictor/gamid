# Интеграция Foundation v1

Файлы итерации подключены без замены корневого `package.json`, `pnpm-lock.yaml` и существующих приложений.

Команды:

```bash
pnpm install
pnpm design-system:typecheck
pnpm design-system:build
pnpm design-system:dev
```

`apps/design-system-lab` импортирует `@signal-arena/ui-game` через pnpm workspace. Production-клиент пока не изменён.
