# The jobs report has a second draft

This local briefing kit compares **January 2024–December 2025** U.S. nonfarm
payroll changes. It reconstructs historical estimates from BLS data distributed
by the St. Louis Fed's ALFRED archive. It does not report today's labor market.

Keep `raw`, `tools`, `edition-a` and `edition-b` together. Edition A selects
January 9, 2026; B selects March 6, 2026. Both were reconstructed during the
retrieval recorded in `raw/retrieval.json`; neither claims to be an article
published on those historical dates. Original source bytes are checksummed.

## Reproduce in a clean consumer

Use Node 22 or later. This example is tested against a **locally packed build**
of the accompanying checkout, whose package version is 3.9.2. It includes the
waterfall audit fix; the existing registry release may not. Build the library
and run `npm pack --ignore-scripts` in the checkout, then install that tarball,
React, React DOM and the optional Sharp exporter in a new project. No
documentation-site imports are required:

```sh
npm init -y
npm install /path/to/semiotic-3.9.2.tgz react react-dom sharp
tar -xzf briefing-kit.tar.gz
node tools/cli.mjs build --source raw --month 2025-06 --vintage 2026-01-09 --output rebuilt-a
node tools/cli.mjs build --source raw --month 2025-06 --vintage 2026-03-06 --output rebuilt-b --json
node tools/cli.mjs compare --source raw --month 2025-06 --before 2026-01-09 --after 2026-03-06 --output comparison
npx semiotic-ai --audit-artifact --json < rebuilt-b/audit-input.json
node tools/cli.mjs check --source raw --output rebuilt-b --json
```

The `build`, `compare` and `check` commands belong to this example adapter.
`--audit-artifact` belongs to Semiotic's public CLI. The adapter imports only
public `semiotic/artifact` and `semiotic/server` APIs, Node built-ins and Sharp.

The bundle includes accessible SVG, 2× PNG, a printable briefing, an email HTML
preview with an ordinary table, canonical CSV, source snapshot, render evidence,
artifact/grounding packet, review template, and file inventory. HTML and email
need no JavaScript. Sending email is your action; the kit never sends anything.
Change `--month` to any reference month in the window. The October 2025 graphic
shows only the dated estimate because no first preliminary value exists.

An existing output directory is compared byte-for-byte and cannot be replaced.
Use a new directory for changed inputs or software. Font/rasterizer differences
can affect PNG bytes across operating systems; canonical values and artifact
identities must still reproduce. Generated artifacts must be rebuilt through
this adapter, not edited to make their checksums match.

## A successful process is not publication approval

Building a **conditional** export can exit zero. The public artifact CLI can
also exit zero for `conditional`; inspect `status` in JSON or terminal output.
The example's `check` exits 2 for conditional, 1 for refusal, and 0 only for a
complete, matching **demonstration** review. It always reports `publishable:
false`: authentication and real editorial sign-off belong to a publishing host.

`review-template.json` is deliberately pending. A demonstration receipt must
name its reviewer, review and expiry times, preserve the exact subject hash,
and explicitly check every outstanding item with a rationale. Save it outside
the immutable bundle, then pass `--review receipt.json` to `check`. A matching
receipt yields `ready-for-demo`; it does not assert a real person's approval.
Unknown findings cannot be closed this way. Changed data, prose, rendering or
requirements change the review subject. Edition A's receipt cannot authorize B.
The subject also binds the actual SVG, PNG, HTML, CSV and packet bytes, so a
changed caption or rasterized graphic requires another review even if its
underlying chart configuration is unchanged.
The comparison retains original and replacement claims with different identities.

The briefing can emphasize estimated direction (`--reading direction`, the
default) or the size of the revision (`--reading size`). These are bounded,
computed readings, not an unrestricted prose evaluator. An editorial change
with the same source gets a different reason and new claim identities:

```sh
node tools/cli.mjs compare --source raw --month 2025-06 --before 2026-03-06 --after 2026-03-06 --reading size --reason editorial-interpretation --output editorial-change
```

Its values and graphic can remain identical while the accompanying explanation
changes. The previous receipt still cannot authorize it. A changed source must
use the `source-update` reason; the report separately records a changed reading.

## Sources and calculations

- [CES vintage documentation](https://www.bls.gov/web/empsit/cesvininfo.htm)
- [BLS first/second/third revision table](https://www.bls.gov/web/empsit/cesnaicsrev.htm)
- [February 11 benchmark release, Table A](https://www.bls.gov/news.release/archives/empsit_02112026.htm)
- [March 6 release](https://www.bls.gov/news.release/archives/empsit_03062026.htm)
- [BLS release calendar archive](https://www.bls.gov/bls/news-release/empsit.htm)
- [CES revisions methodology](https://www.bls.gov/opub/hom/ces/presentation.htm#revisions)

The BLS XLSX/ZIP endpoints returned HTTP 403 during acquisition. These raw files
are **ALFRED dated CSVs**, not a copy of that workbook. `source-checks.json`
contains separately transcribed BLS release-table values for independent checks;
workbook-cell verification remains pending. Accepting this source substitution
requires an explicit editorial decision. Do not present the original workbook
acceptance criterion as passed.

ALFRED's CSV header must identify the requested vintage. The ordinary FRED graph
download ignored the vintage parameter during acquisition and was excluded.
The source unit is thousands of jobs. Monthly changes subtract the preceding
month's level **within the same CSV**, then multiply by 1,000. Levels and changes
have separate `measure` values in the CSV. Annual changes use December minus
the prior December in one vintage; summing first estimates mixes vintages.

First and third dates follow the BLS release sequence. The 2025 shutdown means
August's third value arrived December 16; October has no first estimate. Later
first-available October data is classified second preliminary by BLS. No zeros
are substituted for missing estimates. January 2025 and January 2026 releases
incorporate annual benchmark/seasonal updates; a revision spanning these cannot
be attributed solely to late survey responses. No estimate is labeled final.

## Repository regeneration

```sh
node scripts/jobs-report/acquire.mjs /path/to/new-raw-directory
TSX_TSCONFIG_PATH=scripts/jobs-report/tsconfig.json node --import tsx scripts/jobs-report/build-edition.ts /path/to/raw-directory
npx vitest run scripts/jobs-report/jobs.test.ts
npx tsc --project scripts/jobs-report/tsconfig.json
```

Acquisition uses atomic downloads and refuses an existing destination. It never
silently substitutes current data. New captures have new retrieval identities.
BLS data are public domain; retain BLS and ALFRED credit. No endorsement implied.
