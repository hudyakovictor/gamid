# Top Bar Currency UI Specification

## Canonical pair

- `Stars`: gold five-point star; purchased premium access.
- `Pips`: cyan-blue faceted `PipGem`; earned progress resource.

Top Bar examples:

```text
⭐ 799   ◆ 128
```

## PipGem requirements

- One compact silhouette, readable at 16, 20, and 24 px.
- Faceted shard/diamond outline, not a coin.
- One bright vertical core line for market-signal identity.
- Dark navy outline, cyan fill, restrained glow.
- No plus sign inside the small icon; plus notation is reserved for rewards: `+4 ◆`.
- No five-point star, `$`, chain logo, or tradable-asset cues.

Suggested tokens:

```text
pip.primary = #19D9FF
pip.glow = #0A8EBD
pip.core = #E6FBFF
pip.outline = #071C2A
stars.primary = #FFD54A
```

## Usage

- Top Bar: icon + numeric balance only.
- Reward toast: `+N ◆` with a 400-600 ms pulse.
- Store: Pip Shop balance pinned beside the title.
- Profile: Earned Pips and lifetime spend shown separately.
- Accessibility: never communicate balance by color alone; provide text label in tooltip and screen reader metadata.

## Animation rule

A reward shard may travel to the Top Bar counter, then the counter increments. Avoid coin showers, casino sounds, or aggressive light bursts.
