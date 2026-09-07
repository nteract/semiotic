# Reservoir field guide · E03

The factual edition uses CDEC daily storage sensor 15 (acre-feet) for Shasta,
Oroville, Folsom, New Melones, Don Pedro and Trinity. Water years 1991–2025 span
October 1, 1990 through September 30, 2025. It is a historical snapshot, not a
live water-supply service or statewide drought assessment.

Acquire and reproduce from the repository root with Node 22 and its existing
development dependencies:

```sh
node --import tsx scripts/reservoir-guide/acquire.ts /path/to/new-raw-directory
node --import tsx scripts/reservoir-guide/build-edition.ts --source /path/to/raw-directory --output /path/to/empty-output
```

Acquisition records actual retrieval timestamps, byte counts and SHA-256 hashes.
`--resume` verifies and retains earlier downloads and their original retrieval
times. Reproduction reads only pinned inputs and refuses to overwrite a changed
file in an existing edition. Omitting `--output` writes the public edition and
regenerates the opening bootstrap and offline host. Refreshes need a new edition
identity; update the transform version when its semantics change.
The identity hashes the transform version and sorted source inventory, including
actual retrieval timestamps. A new retrieval cannot silently reuse an identity
whose recorded dates differ; merely reordering the inventory changes no values.

The snapshot packs each station's complete calendar grid as
`[storageAF|null, OBS DATE offset in minutes|null, optional flag]`. The dictionary
documents unpacking, stable station/date identities and source record lines.
The six raw CSVs retain all 76,704 source records. Estimated values and missing
records remain inspectable. Blank and revised (`r`) readings are eligible;
estimated (`e`) and unknown flags are excluded. No interpolation or zero filling.
DATE TIME assigns the reporting day. OBS DATE is a distinct source timestamp,
not a publication time. CDEC documents fixed Pacific Standard Time output.

Capacity is supported by the archived report named `RES.20250731`, whose heading
is **Ending at midnight - 07/30/2025**. The build verifies that heading and all six
storage values against the CSVs. Supplying a `date` query to the current report
does not select an archive. The undated reservoir-information table differs and
is retained only as investigated source context. Capacity records apply to July
30, 2025 alone; other dates explicitly compare against that reference. They do
not reconstruct historical fullness. Values above 100% are not clamped.

The historical beeswarm draws exactly one dot per eligible baseline reading;
capacity, the selected reading and the mean are separate reference lines, not
additional observations. Horizontal displacement encodes stored volume;
vertical displacement only prevents overlap. The same chart is embedded in
the offline HTML and rendered by the independent consumer. No dots are drawn
when the selected measurement regime has no compatible baseline. Fewer than
20 eligible years still withholds the percentile.

The seasonal baseline is the mean of eligible same-month/day readings in water
years 1991–2020, using the selected observation's documented measurement regime.
Oroville's metadata says storage from July 1, 2024 uses a recalculated rating
curve. Its recent readings therefore have no compatible baseline in this window.
This conservative policy withholds both seasonal ratios and percentiles.
Elsewhere the absence of a documented change is not proof of no historical
measurement changes. Our fixed baseline is not CDEC's published historical mean.

Percentile is `100 * (lower + ties / 2) / N`, with at least 20 eligible years.
February 29 has eight possible baseline years and no displayed percentile.
Nonleap years have no such date, a different condition from missing readings.
Shasta has seven eligible leap-day samples: February 29, 1992 is explicitly
missing. Don Pedro's July 30 baseline excludes 1993, 1994, 1996 and 2000.
Collection fullness is a ratio of matched sums, with named missing members.

The portable adapter uses only `semiotic/artifact`; it has no docs/router/DOM
dependency. With a compatible Semiotic checkout/package available, run the
independent consumer from any directory:

```sh
node /path/to/consumer.mjs /path/to/edition /path/to/consumer-output
```

It verifies source checksums and snapshot integrity, recomputes the packet, and
produces a self-contained HTML edition. Saved HTML contains the selected years,
calendar date, chart, full two-year table, selected-date baseline samples,
collection membership, dictionary, source timestamps and links. It uses system
fonts and has no external assets or scripts. It is a fixed view; changing its
selection or checking updates requires reopening the online guide. The packet
contains the selected view; full raw history is a separate pinned download.

The browser's explicit save action stores the same document at a selection- and
edition-specific URL. Its service worker controls only the dedicated offline
directory. Unsaved addresses return a clear unavailable document. Browser storage
can be cleared or evicted; downloaded HTML is the independent fallback.
Refresh is explicit: a new edition offers changed values/dates and metadata,
then preserves compatible identities on acceptance. Failures retain the previous
date and edition. Test-only revisions are synthetic and never published as facts.
Edition downloads are limited to 5 MB and 20 seconds; the explicit refresh has
a 25-second deadline. Serialized temporal audits omit absent optional fields so
packets can be verified after a JSON round trip.

Source terms are preserved in `raw/conditions-of-use.html`; California DWR
provides data without warranty and may revise it. Links do not imply endorsement.
Computational verification does not replace independent editorial review,
five-reader testing, manual assistive technology or measurements on real Android
hardware; those release gates remain pending.
