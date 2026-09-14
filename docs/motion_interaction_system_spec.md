# Signal Arena — Motion and Interaction System Specification

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

Target duration: 100–180 ms.

### Layer B — State transition

Use for stage changes, source trays, Decision Sheet expansion, result reveal, progress updates, and screen navigation.

Target duration: 200–400 ms.

### Layer C — Rare celebration

Use for scenario completion, Entity identification, mastery milestone, tournament result, seasonal reward, and level-up.

Target duration: 500–900 ms, skippable. The celebration must not block the next meaningful action unnecessarily.

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
  instant: 100;
  micro: 160;
  responsive: 220;
  standard: 300;
  transition: 380;
  celebration: 650;
  maximumBlocking: 900;
};

type Easings = {
  standard: "cubic-bezier(0.2, 0, 0, 1)";
  enter: "cubic-bezier(0, 0, 0.2, 1)";
  exit: "cubic-bezier(0.4, 0, 1, 1)";
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)";
  emphasized: "cubic-bezier(0.2, 0.8, 0.2, 1)";
};
```

These are starting tokens. Tune them through playtests and visual QA. Frequent interactions should be shorter; rare transitions can be more expressive.

## 5. Animation naming

Every animation declares:

```text
purpose
trigger
from state
through state
end state
direction
easing
duration
interruptibility
reduced-motion fallback
sound, if any
```

Canonical names:

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
pip_reward_fly
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
Lobby → Academy
Academy → Scenario Brief
Scenario Brief → Decision Workspace
Decision Workspace → Debrief
Debrief → Rematch
```

Use 250–380 ms. Do not combine full-screen fade, large slide, scale, blur, and particles in one ordinary transition.

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
→ selection feedback 100–160 ms
→ comprehension pause 350–700 ms
→ automatic transition 220–300 ms
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
highlight: 120–160 ms
settle: 120 ms
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
→ 120–180 ms local feedback
→ concise explanation
→ focus remains on failing field
```

## 9. Decision seal

Decision seal is a critical irreversible state:

```text
final action
→ brief anticipation
→ seal lock
→ controls freeze
→ resolving state
```

Recommended sequence:

1. Decision button receives press feedback.
2. Decision Sheet compresses slightly and shows the chosen action.
3. Seal icon closes in 220–300 ms.
4. Editable controls become visibly locked.
5. Resolver begins.

Do not use a long cinematic animation before seal.

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

- future chart segment: 350–500 ms;
- key marker: 180–250 ms;
- outcome label: 220–300 ms;
- score count-up: 500–700 ms and skippable;
- debrief rows: 80–120 ms stagger, maximum four rows at once.

Do not animate every candle or paragraph independently. Stage the causal event first, then explain it.

## 11. Scenario completion celebration

The completion moment should feel satisfying while remaining specific to learning:

```text
1. Result locks in.
2. Primary outcome settles.
3. Decision Quality stamp appears.
4. Entity state updates if applicable.
5. Skill progress fills.
6. PipGem reward travels to Top Bar.
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

## 12. Progress and Pip animation

### Counter

```text
start value
→ count/interpolate
→ settle with 100–160 ms pulse
```

Keep count-up under 700 ms. If the number is not central, update immediately with a short highlight.

### Progress

Use `ease-out` for bar/ring fill. Keep the endpoint visible.

### PipGem

```text
reward source
→ shard travels along short arc
→ Top Bar PipGem pulses
→ counter increments
```

Duration: 450–650 ms, with instant reduced-motion fallback.

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

```ts
type InteractionSpec = {
  id: string;
  trigger: "tap" | "click" | "selection" | "drag" | "timer" | "api_success";
  stateBefore: string;
  stateAfter: string;
  feedbackAnimation: string;
  autoAdvance?: {
    enabled: boolean;
    delayMs: number;
    cancellable: boolean;
  };
  nextAction: string;
  canUndo: boolean;
  interruptionPolicy: "queue" | "cancel" | "pause" | "ignore";
  reducedMotionBehavior: string;
};
```

## 15. Motion state machine

```text
idle
→ hovered/focused
→ pressed
→ selected
→ confirmed
→ advancing
→ resolving
→ revealed
→ rewarded
→ ready_for_next
```

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
- [ ] Progress and Pip rewards are understandable.
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
