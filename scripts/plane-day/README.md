# Rebuild “Your plane has had a day”

This is a historical edition of BTS Reporting Carrier On-Time Performance,
reporting code HA, July 2025. The comparison window is July 2–30. July 1 and 31
are retained as boundary context; aircraft-days use scheduled origin-local dates.
The data cannot predict a flight or establish causes from a sequence.

Use the repository's pinned Node 22.22.1 (ICU timezone database 2025c).
The build requires existing development dependencies, no new packages.

```sh
node --import tsx scripts/plane-day/build-edition.ts --source docs/public/stories/plane-day/EDITION_ID/raw
```

Replace `EDITION_ID` with the directory containing this README. The source
checksums are verified before transformation. Existing outputs must match byte
for byte; the builder refuses to rewrite an edition. `--output /tmp/e02-rebuild`
builds to a separate directory without switching the page snapshot. A refresh
must explicitly update the edition and transform version, retaining prior files.

The repository includes all 7,066 original HA CSV records with every original
column, the original archive readme, and original CSV record line references.
The 32 MB upstream ZIP is held in an external cache, not the web bundle. Its URL,
SHA-256 and actual retrieval timestamp are in `raw/retrieval.json`. Download it
from that URL to reproduce the carrier extraction:

```sh
curl -fL --max-time 180 -o /tmp/2025-07.zip 'https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_7.zip'
node --import tsx scripts/plane-day/extract-source.ts /tmp/2025-07.zip ACTUAL_RETRIEVAL_ISO_TIME /tmp/e02-raw
```

Use the actual retrieval completion timestamp; a fresh fetch is a new retrieval,
even if the checksum matches. The selected CSV must match the pinned checksum.
No synthetic flight rows enter the public edition. Fault fixtures live in tests.

`manifest.json` records retained-field meanings, exclusions, pattern thresholds,
case-selection rules, time-zone mapping and output checksums. `cohort.csv` names
every comparison-window aircraft-day, including excluded days. `days/DATE.json`
contains its checked flights and immediate before/after context. The full raw
extract includes records without tails, which cannot form aircraft-days.

Three authored cases are selected mechanically by fewest flights, then earliest
date and tail, within each pattern. They are not random or representative. The
near-schedule rule uses signed departure deviations strictly between -15 and 15;
recovery requires a 60+ minute departure and a final departure below 15; persistence
requires a 60+ minute departure followed by another leg and all departures from
that point at least 30 minutes late. All other checked chains are shown separately.

The portable event identity combines date, reporting code, flight number, origin
and destination airport IDs, and scheduled departure. Notes target that identity
and edition; pixels and array positions never identify a flight. Unknown versions
are rejected; unavailable editions/selections are explicit, not silently reset.
Reader notes remain unreviewed and unauthenticated, including after import.

## Independent reader

Copy `adapter.mjs`, `consumer.mjs`, `snapshot.json`, and a packet into a separate
Node project with Semiotic installed (or the locally built package linked).
The adapter imports only `semiotic/artifact`; it has no React or DOM dependency.

```sh
node consumer.mjs default.packet.json recovered-day.html
```

It validates the packet against the supplied pinned snapshot, writes its selected
flight and notes as plain JSON, and optionally produces printable accessible HTML.
The snapshot is the reader's trusted edition input; fingerprints check consistency,
not publisher authentication. Local tests also render the chart configs through
`semiotic/server` with evidence and accessibility diagnostics.

Editorial review, actual-device performance and independent reader/assistive-
technology sessions remain release gates. The story's source notes describe the
current implementation and its limitations.
