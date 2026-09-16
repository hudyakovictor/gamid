# Top Bar Currency UI Specification

Status: REQUIRED
Scope: client display and accessibility
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: responsive screenshots, accessibility checks, reduced-motion QA, balance-config fixture validation
Canonical dependencies: `economy_monetization_referrals.md`, `game_balance_spec.md`, `catalog_sku_spec.md`

## Layout

Desktop and wide screens:

```text
[Account Level + XP] [Energy] [Mastery Stars] [Coins] [Notifications] [Settings]
```

Illustrative visual example only — values are not canonical balance fixtures:

```text
LVL 07 · 420/600 XP    ⚡ 5/5    ★ 48    🪙 320    🔔³    ⚙
```

Mobile:

```text
[LVL 07] [⚡5] [★48] [🪙320] [🔔] [⚙]
```

On narrow screens show compact values; full values appear in tooltips and screen reader metadata. Tapping a slot opens its screen: progression, Energy rules, Mastery map, store/refill, notification center, settings.

## Slots

### 1. Account Level + XP

- Shows Account Level and progress to the next level using `{level}`, `{currentLevelXp}` and `{requiredLevelXp}` from the versioned balance configuration. The `LVL 07 · 420/600 XP` string above is illustrative only.
- XP is never purchasable; Coins, Premium, and tournament tickets never grant XP.
- Backend is the source of truth for Account Level and XP.

### 2. Energy

- Shows available energy (`⚡ 5/5`); value never exceeds the current cap.
- Tapping opens spend rules and time-to-refill.
- Energy never affects Quality Score or tournament results.
- Backend is the source of truth for balance and regen.

### 3. Mastery Stars

- Shows total Mastery Stars (`★ 48`); per scenario 0–3, best result kept, improvable on replay.
- Stars are never spent and never purchased; they gate chapters, exams, and difficulties.
- Mastery Stars are not Telegram Stars. Confusing the two in copy or icons is forbidden.
- Backend is the source of truth for grants.

### 4. Coins

- Shows premium balance (`🪙 320`); tapping opens the store or refill.
- All Coins operations are server-side ledger transactions.
- Backend is the single source of truth.

### 5. Notifications

- Bell button with unread badge: count up to 99, `99+` above.
- Opens the in-app notification center (Energy refills, Rematch availability, tournaments, rewards, system events).
- Device push and in-app notifications are separate mechanisms; push permission lives in Settings.
- In English UI use "Notifications".

### 6. Settings

- Gear button opening: language, sound and music, haptics, reduced motion, push notifications, privacy, support, legal info, logout.
- Settings has no permanent slot in the main navigation.

## Canonical pair

- `Coins`: gold coin; premium in-game currency bought via Telegram Stars Coin Packs.
- `Telegram Stars`: platform payment rail; appears only in the Coin Pack payment flow, never in the Top Bar, never as a gameplay reward.

## Coin icon requirements

- One compact silhouette, readable at 16, 20, and 24 px.
- Coin outline, distinct from the Telegram five-point star at a glance.
- No `$`, chain logo, or tradable-asset cues.
- No plus sign inside the small icon; plus notation is reserved for rewards: `+25 🪙`.
- Never communicate balance by color alone; provide text label in tooltip and screen reader metadata.

## Usage

- Top Bar: icon + numeric balance only.
- Reward toast: `+N 🪙` with a 400-600 ms pulse.
- Store: Coins balance pinned beside the title.
- Profile: lifetime earned/spent shown separately.
- Accessibility: text label in tooltip and screen reader metadata for every slot.

## Animation rule

A reward coin may travel to the Top Bar counter, then the counter increments. Avoid coin showers, casino sounds, or aggressive light bursts.
