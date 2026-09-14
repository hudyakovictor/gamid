# SIGNAL ARENA — File Replacement Map

## Replace

```text
full_game_spec.md
→ full_game_spec_v3.md

monetization.txt
→ monetization_v2.md
```

## Add

```text
docs/system_architecture_v4.md
docs/crm_stack_spec.md
docs/interactive_motion_spec.md
docs/multichain_readiness_assessment.md
docs/repository_migration_map.md
docs/signal_arena_readiness_score.md
```

## Keep unchanged

```text
brand.md
competitors.md
academy_plan_99.md
style-tone.txt
```

## Recommended repository layout

```text
apps/
  game-client/
  landing/
  api-server/
  admin-crm/

packages/
  domain/
  contracts/
  db/
  content/
  adapters/
  analytics/
  config/
  ui-game/
  ui-crm/
  agent-runtime/

workers/
  payments/
  content/
  localization/
  analytics/
  ai/

docs/
  full_game_spec.md
  monetization.md
  system_architecture.md
  crm_stack.md
  interactive_motion.md
  academy.md
  brand.md
  competitors.md
  style-tone.md
```

## Important

`full_game_spec_v3.md` now contains the client stack, CRM boundary, public profiles, cosmetics, Shop, tournaments, localization, AI integration and feature flags. `system_architecture_v4.md` remains the system-level source of truth, while `crm_stack_spec.md` is the CRM-specific implementation reference.
