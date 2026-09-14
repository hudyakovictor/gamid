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

The imported repository artwork is currently marked `placeholder` and `draft` because its origin, license, commercial-use rights, and modification rights have not been verified. It must not be treated as production-approved until the provenance gates in `docs/asset_provenance_and_workflow.md` pass.

Canonical Entity names are not translated, transliterated, or renamed. `Entity` is the only product category; these assets are not an `Enemy`/`Boss` hierarchy.
