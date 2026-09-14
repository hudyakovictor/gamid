# Signal Arena assets

All runtime artwork is grouped by product role:

```text
assets/
  entities/       canonical Entity portraits; names and IDs remain English
  skill-cards/    Skill Card artwork keyed by the canonical card IDs
  ui/             shared UI and curriculum artwork
  asset-manifest.json
```

The manifest is the source of truth for stable `assetId`, path, origin, provenance, rights, fallback/replacement plan, and release status.

The Entity portraits and Skill Card artwork were created specifically for Signal Arena by the project owner. They are recorded as `original` project assets with proprietary project rights. They remain `draft` and `releaseEligible: false` until visual, responsive, accessibility and final release QA pass the gates in `docs/asset_provenance_and_workflow.md`.

Canonical Entity names are not translated, transliterated, or renamed. `Entity` is the only product category; these assets are not an `Enemy`/`Boss` hierarchy.
