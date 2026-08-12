# DHQ Thunderdome data pipeline

Regenerates the large **Digital Humanities Quarterly** example corpus used by
`docs/src/pages/examples/data/dhqThunderdome.generated.js` and the Thunderdome
example page. Generated modules are **docs/examples only** — they must never
enter cold-path library entry graphs (`semiotic`, `semiotic/network`,
`semiotic/ai`, …).

## When to regenerate

- After updating TEI sources, editorial event mappings, or review packets.
- After changing ingest filters that affect article counts or graph edges.
- Before a release that claims parity with the audited DHQ corpus.

## Commands

From the repo root (Node 22+):

```bash
# Full rebuild of example data (writes dhqThunderdome.generated.js)
node scripts/dhq/build-example-data.mjs

# TEI ingest (intermediate artifacts)
node scripts/dhq/ingest-tei.mjs

# Editorial events + review packets (when editing those stages)
node scripts/dhq/build-editorial-events.mjs
node scripts/dhq/build-review-packets.mjs
```

Optional analysis / capture helpers:

| Script | Role |
|--------|------|
| `analyze-baseline.mjs` | Baseline stats for strategy docs |
| `repository-evidence.mjs` | Evidence table for claim ledger |
| `capture-mastheads.mjs` / `capture-issue-indexes.mjs` | Asset capture for the example |

## Verification

```bash
# Corpus integrity (IDs, conservation, non-empty graphs)
npx vitest run docs/src/pages/examples/data/dhqThunderdome.generated.test.js

# Pipeline unit tests
npx vitest run scripts/dhq/
```

Do **not** import `dhqThunderdome.generated.js` from `src/` or package
entry points. Docs routes load it only from example pages.

## Related

- US history river compact source:
  `node docs/src/pages/examples/data/unitedStatesHistoryRiver.build.mjs <source-json-path>`
  → `unitedStatesHistoryRiver.source.generated.js`
