# Signal Arena — Motion and Interaction System Specification

Status: REQUIRED
Scope: motion tokens, interaction state transitions and motion QA
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: conflicting motion duration and interaction contracts
Required evidence: visual regression, responsive QA, accessibility QA, reduced-motion QA, state-transition tests
Canonical dependencies: `interactive_motion_spec.md`, `full_game_spec.md`, `asset_provenance_and_workflow.md`

> Human planning document. This specification defines motion behavior, interaction rhythm, animation tokens, and implementation routing. It is not an automatic startup prompt for agents.

## 1. Purpose

Signal Arena should feel as responsive and emotionally satisfying as a polished mobile game, while keeping motion functional, readable, interruptible, and compatible with learning.

The target feeling is:

```text
clear action
→ immediate response
→ readable consequence
→ satisfying completion
→ fast return to the next meaningful decision
```

Motion communicates state, hierarchy, causality, progress, and reward. It must never hide evidence, delay a decision unnecessarily, or turn the learning interface into visual noise.

## 2. Motion hierarchy

### Layer A — Instant feedback

Use for input acknowledgement: button press, Card selection, source opening, evidence selection, confidence change, and invalidation acceptance.

Target token: `fast` (120 ms), with `instant` for non-essential acknowledgement.

### Layer B — State transition

Use for stage changes, source trays, Decision Sheet expansion, result reveal, progress updates, and screen navigation.

Target token: `standard` (180 ms), `emphasis` (240 ms) or `reveal` (400 ms) according to the state transition.

### Layer C — Rare celebration

Use for scenario completion, Entity identification, mastery milestone, tournament result, seasonal reward, and level-up.

Target token: `celebration` (600 ms maximum), skippable. The celebration must not block the next meaningful action unnecessarily.

## 3. Easing vocabulary

### `ease-out`

Fast start, slow finish. Use for entrances and landing:

```text
screen entrance
bottom sheet opening
Card appearing
reward badge landing
progress value settling
```

### `ease-in`

Slow start, fast finish. Use for exits and dismissal:

```text
screen exit
Card leaving
toast dismissing
old stage removed
```

### `ease-in-out`

Slow start, fast middle, slow finish. Use when an object moves between meaningful positions or a scene changes continuously:

```text
shared-axis screen transition
progress marker movement
chart viewport panning
Card moving from hand to workspace
```

### `emphasized`

Use only for rare reveal, completion, mastery, or major reward moments.

## 4. Motion tokens

```ts
type MotionTokens = {
  instant: 0-80;
  fast: 120;
  standard: 180;
  emphasis: 240;
  reveal: 400;
  celebration: 600;
};

type Easings = {
  standard: "cubic-bezier(0.2, 0, 0, 1)";
  enter: "cubic-bezier(0, 0, 0.2, 1)";
  exit: "cubic-bezier(0.4, 0, 1, 1)";
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)";
  emphasized: "cubic-bezier(0.2, 0.8, 0.2, 1)";
};
```

These are canonical tokens. A transition must use one of these tokens rather than inventing a separate duration range in another document. Celebration is skippable and never exceeds 600 ms. Reduced-motion behavior removes travel, parallax, shake and decorative particles, preserves state order and text/focus confirmation, and keeps mandatory transitions approximately within 100–150 ms.

## 5. Canonical MotionContract

Every animation uses the same contract:

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

`purpose`, causal intent and visual state change are documented by the motion definition; they are not a second schema. Canonical names:

```text
screen_enter_fade
screen_exit_fade
shared_axis_forward
shared_axis_back
card_select_pulse
card_deselect_settle
evidence_open_sheet
step_auto_advance
decision_seal_lock
outcome_reveal
score_count_up
progress_fill
coin_reward_fly
entity_identify
scenario_complete
rematch_ready
```

## 6. Screen transitions and preloader

### Preloader

Use a preloader only when work is actually happening:

```text
boot
→ asset manifest
→ fonts
→ essential UI textures
→ audio readiness
→ initial API/bootstrap
```

Rules:

- show measurable progress or a skeleton when progress is unknown;
- do not fake a long progress bar;
- allow network retry;
- preload critical assets only;
- lazy-load optional Entity art, audio, and advanced scenario assets;
- keep the first meaningful screen fast.

### Between screens

Use `shared_axis_forward` when going deeper and `shared_axis_back` when returning:

```text
Arena Hub → Academy
Arena Hub → Scenario Brief
Scenario Brief → Decision Workspace
Decision Workspace → Debrief
Debrief → Rematch
```

Use the `standard`, `emphasis` or `reveal` token according to the state change. Do not combine full-screen fade, large slide, scale, blur and particles in one ordinary transition.

### Within one screen

Prefer local movement for:

```text
Task stage 1 → stage 2
Source Tray opening
Skill Card expansion
confidence change
score row reveal
```

This preserves spatial continuity.

## 7. Four-step task auto-advance

When a task has four sequential decisions, do not require a redundant bottom `Next` button after every valid selection.

```text
Player selects answer
→ selection feedback `fast`
→ comprehension pause 350–700 ms (a comprehension pause, not a transition token)
→ automatic transition `standard`
```

Rules:

- auto-advance only after a valid selection;
- no auto-advance after ambiguous or destructive action without confirmation;
- visible step indicator such as `2 / 4`;
- back action when changing the previous answer is allowed;
- tap/click can skip the pause;
- pause auto-advance if details are opened;
- keyboard and screen-reader users receive an equivalent announcement;
- reduced-motion mode removes travel but preserves state and focus.

The pause is a comprehension window, not dead time.

## 8. Input feedback

### Click/tap

```text
press scale: 0.97
highlight: `fast`
settle: `fast`
```

Use sound only for meaningful confirmation, not every navigation click.

### Selection

- selected Card gets a border and restrained glow;
- other Cards remain readable;
- selected state persists until changed or sealed;
- no layout-shifting bounce;
- selection does not imply correctness.

### Evidence opening

```text
source icon press
→ active state
→ bottom sheet enters with ease-out
→ source content receives focus
```

### Invalid action

Use local shake or edge pulse, not a full-screen red flash:

```text
invalid input
→ `fast` local feedback
→ concise explanation
→ focus remains on failing field
```

## 9. Decision Seal

Decision Seal is a critical irreversible state:

```text
valid local decision
→ local validation feedback
→ controls enter pending/frozen state
→ POST Seal
→ server accepts immutable decision
→ Decision Recorded
→ resolving
→ server returns authorized reveal
```

Before server confirmation, show only a pending/sealing state. Do not show `Decision Recorded`, historical future, outcome, score, Entity reveal or debrief conclusion. If the request is ambiguous, query run state before unlocking controls:

```text
GET run state
→ sealed: continue Reveal
→ started: allow safe retry
→ unknown: show recovery state
```

Do not use a long cinematic animation before the server-confirmed Seal.

## 10. Reveal choreography

```text
resolver complete
→ future segment reveals
→ key event marker lands
→ outcome timeline draws
→ score dimensions appear
→ debrief becomes actionable
```

Suggested timing:

- future chart segment: `reveal`;
- key marker: `emphasis`;
- outcome label: `standard`;
- score count-up: `celebration` maximum and skippable;
- debrief rows: `instant`/`fast` stagger, maximum four rows at once.

Do not animate every candle or paragraph independently. Stage the causal event first, then explain it.

## 11. Scenario completion celebration

The completion moment should feel satisfying while remaining specific to learning:

```text
1. Result locks in.
2. Primary outcome settles.
3. Decision Quality stamp appears.
4. Entity state updates if applicable.
5. Skill progress fills.
6. Coin reward travels to Top Bar.
7. Rematch action becomes available.
```

Use controlled particles and a clear next action. Never use casino-like coin showers or imply financial profit.

Celebrate learning behavior:

```text
Strong evidence
Good invalidation
Disciplined Wait
Successful recovery
Improved rematch
```

Do not celebrate lucky outcome as excellent process.

## 12. Progress and reward animation

### Counter

```text
start value
→ count/interpolate
→ settle with a `fast` pulse
```

Keep count-up within the `celebration` token. If the number is not central, update immediately with a short highlight.

### Progress

Use `ease-out` for bar/ring fill. Keep the endpoint visible.

### Coin reward

```text
reward source
→ coin travels along short arc
→ Top Bar coin counter pulses
→ counter increments
```

Duration: `celebration` (600 ms maximum), with `instant` reduced-motion fallback.

## 13. Motion hierarchy rules

Animate:

- accepted input;
- focus;
- state change;
- causal reveal;
- progress gain;
- important reward;
- related-stage transition;
- Entity identification;
- debrief emphasis.

Do not animate heavily:

- every hover;
- every source opening;
- every paragraph;
- every candle;
- ordinary navigation;
- long theory reading;
- accessibility announcements;
- urgent errors.

If everything moves, nothing has priority.

## 14. Interaction contract

Motion and interaction behavior use the canonical `MotionContract` from §5. Auto-advance, undo, focus and interruption behavior are documented as behavior of the source and target states; they do not introduce a second incompatible contract schema.

Every interaction definition must reference:

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

## 15. Motion state machine

```text
idle
→ hovered/focused
→ pressed
→ locally_validated
→ pending_seal
→ frozen
→ server_confirmed_seal
→ resolving
→ revealed
→ rewarded
→ ready_for_next
```

`server_confirmed_seal` is the only state that may transition to authorized future, outcome, score, Entity reveal or debrief conclusion. Ambiguous network results enter recovery and query run state before returning to `frozen` or `ready_for_next`.

Test invalid transitions.

## 16. Reduced motion and accessibility

When `prefers-reduced-motion` is enabled:

- replace travel with opacity or instant state change;
- remove particles, camera shake, and bounce;
- retain focus, labels, status text, and progress;
- never rely on motion alone;
- announce and make auto-advance cancellable where needed;
- preserve keyboard/touch parity.

## 17. Performance

- animate transforms and opacity where possible;
- avoid layout-triggering width/height animations;
- pool particles and repeated effects;
- cap decorative particles;
- pause nonessential animation when the tab is hidden;
- never block API or asset loading on decoration;
- test target mobile viewports;
- follow general game-development and web-games performance budgets.

## 18. Motion QA checklist

- [ ] Every animation has a purpose.
- [ ] Trigger and end state are named.
- [ ] Enter uses ease-out or approved emphasized enter.
- [ ] Exit uses ease-in.
- [ ] In-scene movement uses ease-in-out where appropriate.
- [ ] Frequent interactions finish quickly.
- [ ] No transition blocks the next meaningful action unnecessarily.
- [ ] Four-step auto-advance is tested.
- [ ] Auto-advance interruption is tested.
- [ ] Seal is visibly irreversible.
- [ ] Reveal emphasizes cause before decoration.
- [ ] Progress and coin rewards are understandable.
- [ ] Completion celebration rewards process quality.
- [ ] No casino-like reward presentation.
- [ ] Reduced motion works.
- [ ] Keyboard, touch, and screen-reader behavior match.
- [ ] No layout shift or clipping.
- [ ] Performance and mobile QA pass.

## 19. Implementation prompt

```text
Implement the assigned Signal Arena motion task using motion_interaction_system_spec.md.

First identify purpose, trigger, before/after states, animation name, easing,
duration, interruption policy, reduced-motion fallback, and sound behavior.
Use the archive game-development skills for browser/game constraints and only
relevant Signal Arena documents.
Do not add decorative motion without a functional purpose.
Do not block the next meaningful action unnecessarily.
For multi-step tasks, auto-advance only after valid selection, with a visible
step indicator, comprehension pause, skip/cancel behavior, and accessibility announcement.
Add component/interaction tests and visual regression coverage.
Run typecheck, lint, tests, build, responsive QA, accessibility QA, and reduced-motion QA.
Return evidence and acceptance status.
```
