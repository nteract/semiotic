# Correct a chart after its source changes

The runnable browser example is `SourceCorrectionExample.tsx`; the public API workflow and synthetic
fixture are in `source-correction.ts`. The page route is `/tasks/correct-published-chart`.

- Data: one nonnegative total per region, in the same unit. North 12, South 30 and West 18 total 60.
  Correcting West to 36 changes the total to 78 and makes West the largest region.
- Fit: an existing React chart needs explicit source identity, claim revision and a portable
  correction history. An ordinary local value edit may not need a contract or a new dependency.
- Public imports: `BarChart` from `semiotic/ordinal`; `buildArtifactContract`,
  `prepareArtifactRevision`, `fingerprintValue`, `evaluateArtifact`, `createArtifactPacket`,
  `validateArtifactPacket` and `createAdjacentArtifactSidecar` from `semiotic/artifact`.
- Repair: changing data without transitions calls the real revision API and fails. Both old claims
  must be explicitly superseded; changed evidence gets a new ID. The successful revision preserves
  the original data/evidence, replaces the summary, changes identity and retains correction records.
- Review: claims are authored statements about a synthetic fixture. Arithmetic is checked
  independently by focused tests. The evaluation remains conditional and `publishable` remains
  false; no human approval is recorded. Hashes establish matching covered payloads, not source
  authenticity or arbitrary prose truth.
- Handoff: configuration includes the chart values; the separate sidecar contains the contract and
  transfer report. A readable project note is optional. A missing sidecar explicitly loses source
  identity and correction/review context; an image alone cannot restore those facts. Invalid or
  mismatched packets are refused. Removing the note or sidecar does not break chart rendering.
- Verification: `npx vitest run docs/src/pages/tasks/examples/source-correction.test.ts` covers
  actual refusals, immutable revisions, expected totals/ranking, three server-rendered marks, claim
  grounding, packet identity/tampering and the interactive correction/loss flow.
  `renderChartWithEvidence` from `semiotic/server` is imported only by tests, keeping server code
  outside the browser example.
- Limits: these tests do not authenticate external source data, establish editorial approval, or
  demonstrate assistive-technology usability. Fixed timestamps describe the authored scenario and
  are not recorded execution times. Package publication or deployed-site parity requires separate
  checks.
