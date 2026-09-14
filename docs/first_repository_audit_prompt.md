# Signal Arena — First Repository Audit Prompt

> This prompt is intended for the first agent run. It performs an audit only and must not modify code.

```text
Ты работаешь над Signal Arena. Перед кодом прочитай AGENTS.md, docs/README.md, full_game_spec.md, academy_plan_99.md и только релевантные документы. Используй общий game-development skill как оркестратор и выбери нужные sub-skills: web-games, 2d-games, game-design, game-art или game-audio.

Сначала проведи аудит репозитория: определи runtime, package scripts, client/server, тесты, migrations, API contracts и CI. Не меняй код до отчёта.

Соблюдай canonical rules: единая группа Entity с exact English names; никаких Enemy/Boss split; Cards и Protocols ограничиваются режимом Academy/Exam/Arena; beginner-сценарии не перегружены Source Groups. Различай scenario level 1–99 и player level 0–99. Scenario использует point-in-time t0, hidden entities и historical reveal. Score server-authoritative, disclosed, учитывает process quality, risk, evidence, discipline и calibration; Pips/Stars не влияют на score. No Trade допустим. Не добавляй NFT, wallet, real trading или P2E.

Проверь также:
- максимум 5 Source Groups и минимум достаточных источников для beginner;
- Academy Guided Loadout, Exam Curated Loadout, Arena Base/Personal Loadout;
- Long, Short, Wait, No Trade;
- good process/bad outcome и bad process/lucky outcome;
- quality score 0–100 и disclosed score breakdown;
- Entity progression: UNKNOWN PATTERN → EMERGING PATTERN → IDENTIFIED → MASTERY I–V;
- virtual PnL только как educational output, не как реальные деньги и не как единственный критерий mastery.

Верни:
1. структуру;
2. реализованное;
3. P0/P1 gaps;
4. порядок итераций;
5. изменяемые файлы;
6. тесты и acceptance gates;
7. asset/source risks.

Не исправляй код. Статус: PASS, BLOCKED или REJECTED.
```

## Acceptance checklist

- [ ] Agent reads `AGENTS.md` and `docs/README.md`.
- [ ] Agent reads canonical product and curriculum documents.
- [ ] No code is modified.
- [ ] Runtime, scripts, client/server, tests, migrations, contracts, and CI are inventoried.
- [ ] Scenario level and player level are kept separate.
- [ ] Entity model is checked against the canonical English catalog.
- [ ] Card/loadout and Source Group limits are checked.
- [ ] Scoring and No Trade rules are checked.
- [ ] P0/P1 findings include evidence and impact.
- [ ] Final status is PASS, BLOCKED, or REJECTED.
