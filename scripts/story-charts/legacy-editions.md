# Reproducing the original story editions

The original plane and grocery builders use the affected presentation sources
under `scripts/plane-day/v1/` and `scripts/grocery-receipt/v1/`. These preserve
the original timeline default, accepted plane views and HTML templates from
commit `490302b8`. The live stories and `reading-v2` use the current docs sources.

`scripts/lib/pinned-story-sources.ts` substitutes these original modules while
bundling the legacy adapters. It keeps their original emitted source paths, so
the adapters themselves remain byte-identical. The builders still regenerate
source data, packets, calculations and documents; they do not copy expected
output artifacts as their implementation.

Keep presentation revisions out of these original sources. A changed live
default or even an empty template line can alter packets, links, HTML, adapter
bytes and manifest checksums. The original build instructions still apply;
`scripts/story-charts/build-previews.ts` owns the separate `reading-v2` output.

Run the focused regression checks with:

```sh
npx vitest run scripts/story-charts/legacy-editions.test.ts
```

The tests compare both rebuilt adapters and all original HTML selections with
their checked-in artifacts, verify the plane packets remain usable, and check
that the live/v2 default still opens the time–space view. Full plane reproduction
also requires the documented Node 22.22.1 / ICU timezone database 2025c runtime.
