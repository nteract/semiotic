# E01 receipt edition

The receipt compares fixed quantities at BLS U.S. city average prices, in USD
per pound, dozen, or gallon. These are illustrative calculations, not local
store quotes, household inflation estimates, or the official CPI.

The default comparison is June 2019 to June 2025. All 504 displayed item/month
positions are compared with the downloaded BLS selected-item table. The 2018
rows provide prior-year context for the first 12-month changes. Missing API rows
and dash values remain unavailable, including chicken in May 2020 and all six
items in October 2025. The source's missing observations are not synthetic test
fixtures.

Rebuild from this edition's pinned inputs in a Semiotic source checkout:

```sh
npx tsx scripts/grocery-receipt/build-edition.ts --source docs/public/stories/grocery-bill/EDITION_ID/raw
```

Replace `EDITION_ID` with the identifier in `manifest.json`. This checks raw
SHA-256 checksums, admits the dictionary, cross-checks the two BLS formats,
prepares canonical rows, and generates the downloadable outputs. It refuses to
replace a changed immutable output. The snapshot import and `current.json` are
current-edition pointers. Refreshing source data requires a new retrieval record
and edition; do not edit old files or invent retrieval timestamps. The manifest
documents the source URLs, API request, retrieval times, terms, transform
version, field dictionary, and exclusion counts. Source publication or revision
time is unknown, and is not replaced with retrieval time.

For an independent consumer, place `consumer.mjs`, `adapter.mjs`, and
`default.packet.json` in a directory with this source revision of Semiotic
installed. The adapter is documented example host code. It only imports
`semiotic/artifact`; the consumer additionally uses `semiotic/server`.

```sh
node consumer.mjs default.packet.json
```

This validates the packet, independently recomputes the totals, and writes
`reproduced-receipt.svg`, `reproduced-contributions.svg`, and
`render-evidence.json`. A source link alone is not arithmetic verification.
Numerical bindings live in a named example extension; existing Artifact Contract
reference checks do not interpret that extension. Human editorial review remains
pending even when all available numerical checks pass.

Quantities range from 0 to 100 in quarter-unit steps. Prices retain three
decimals, and calculations use exact integer units of 1/4000 USD. A percentage
requires a positive baseline. Comparable-subset membership is chosen once from
both selected months and held fixed throughout the timeline. Rows are identified
by BLS series ID and observation month, never array position.

The five prepared states are default, meat-free, high-egg, missing-price, and
comparable-subset. Each has exact packet values, accessible HTML, phone and
print SVG, and PNG. PNG is rasterized from its SVG and contains visible source,
edition, scope, and correction text; the packet preserves machine-readable
precision. A saved image cannot update itself. No edition claims human review,
real-phone performance, screen-reader usability, or reader-study completion.
