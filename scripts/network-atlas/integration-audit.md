# Network Atlas integration audit — September 13, 2026

Scope: the delivered Motif Braid, Dependency X-Ray and Flow Circuit readers,
their shared custom-chart hosts, current public preparation/layout facades,
documentation examples, static SVG/evidence and generated consumer contracts.
This sweep does not publish the NA5 reader APIs or serialized chart names.

## Findings and fixes

| Surface | Result |
| --- | --- |
| Accessible text | All three wrappers preserve authored title, description, summary and accessible-table settings. Flow Circuit exposes exact arrivals, completions, installed capacity, queue stock, status, units, edition/time and every original pipe; missing values remain unmeasured. |
| Keyboard and pointer | Canonical IDs and current tape readings reach both input channels. Semantic focus survives replay and display changes; Escape clears linked hover. Pipes can be read/activated without being mistaken for modules. Network Space activation and Enter traversal keep the existing network contract. |
| Spoken readings | Network focus uses its accessible datum instead of reciting serialized analysis revisions. Physics focus has one semantic announcement; pointer readings use the current authored description. |
| Theme | Dependency roles and all Flow Circuit chrome resolve semantic theme colors, with explicit role overrides. Braid honors signature color maps. Matrix cells and buttons use theme variables. Light, dark and high-contrast React/SSR checks preserve evidence counts. Contrast diagnostics now recommend checking the actual background rather than implying that a color-vision-safe palette guarantees contrast. |
| Observation | Identified NetworkCustomChart instances publish without requiring an inline callback. Physics pointer and keyboard events reach the nearest observation store once, including the legacy click vocabulary used by DetailsPanel. Current module readings carry canonical identity and provenance. Native physics simulation telemetry continues through the existing physics callback contract; it is separate from analytical tape values. |
| Linked views | Canonical nodeId fields connect atlas readers. Braid and Dependency provide retained-mark restyling; Flow dims module chrome, pipes, particles and physical bodies together. Prepared analyses and tape values remain unchanged. |
| Annotations | Source wrappers forward annotations and frame options; server tests anchor callouts to canonical module/dependency IDs. |
| Static rendering | Network SVG now forwards selection into the layout context and applies its restyle callbacks. The related renderer audit fixed Geo selection forwarding, initial restyling of newly built Geo marks, and area opacity in SVG; XY and Ordinal already forward selection. Evidence retains all data marks when selection changes styling. |
| Diagnostics | Programmatic custom-chart configurations are recognized by diagnoseConfig, with callback/shape/dimension/annotation checks across XY, Ordinal, Network, Geo and Physics. Serialized validation still rejects executable layouts and unpublished atlas reader names. |
| Documentation | Both source examples use ThemeProvider and LinkedCharts, demonstrate ObservationReadout, and export SVG in the active theme. The docs Vite cache is separate from package examples so concurrent servers cannot invalidate lazy server-renderer imports. |
| Public boundary | Existing async preparation and motifBraidLayout facades remain compatible. Source preview imports remain on the exact allowlist. Per-form package exports, schemas, recipe/navigation registration and independent consumer gates remain NA5 work. |

## Verification

Focused integration tests exercise real frame hit testing, keyboard activation,
callback composition, observer scoping and duplicate prevention, replay without
body remounts, accessible tables, linked selections, theme role overrides,
annotations, diagnostics and static render evidence. Related physics/custom
chart tests cover the shared frame and selection changes.

Browser coverage includes both interactive docs studies, their grammar forms,
mobile accessibility in both themes, reduced motion, theme switching, shared
observation readouts and evidence/SVG downloads. CSR/SSR fixtures retain all
original topology/count assertions. Reviewed color changes update the visual
baselines without changing comparison tolerances.

Completed checks:

- Focused Vitest suites: 92 files, 869 tests passed across Atlas, physics,
  custom charts, diagnostics, transit diagrams, server rendering and observation.
- `npm run typescript`, `npm run typescript:tests`, ESLint for changed source
  files, `npm run check:custom-lints` and `git diff --check` passed.
- `npm run check:website-build` passed: 316 documentation routes and 32 blog
  entries prerendered; asset budgets and protected source boundaries passed.
- The nine focused Atlas documentation browser tests passed, including mobile
  axe checks and the new theme/observation/export checks.
- All 33 Atlas CSR/SSR cases passed in Chromium, Firefox and WebKit on macOS
  and pinned Linux Playwright after reviewing and generating theme baselines;
  final comparisons also passed on both platforms without snapshot updates.
- Chart specs, AI schemas, behavior contracts, reference/example coverage,
  the portable agent skill, Context7, docs example integrity and the 14-fixture
  Atlas evidence gate passed.
- `npm run dist:prod`, `npm run check:api-surface`, `npm run check:pack` and
  `npm run size` passed. Entry-graph and combined-import budgets are unchanged.
  Bundle housekeeping reuses transit label/selection logic and removes repeated
  sorting of already prepared nodes/edges; the existing transit tests passed.
- The owning generators refreshed cold-consumer measurements, bundle-size
  documentation, LLM reference, task verification receipts and adoption inputs.
  `check:cold-consumer` (35 public exports), `check:bundle-sizes`,
  `check:ai-instructions`, `check:llms`, `check:ai-tasks` and
  `check:adoption-evals` passed. Task receipt verification ran 14 source unit
  tests and six browser tests; adoption preparation records inputs for 24 jobs,
  not model runs or adoption outcomes.

Automated accessibility checks cover semantics, keyboard interactions and axe
findings; this audit does not claim a manual assistive-technology review.

## Review follow-up: network edge announcements

The network live-region lookup now selects the node or edge collection from
the hit type before resolving `accessibleDatum`. This also prevents a node's
reading from masking an edge's reading when both reuse one render datum.
Authored node readings, raw-data fallbacks, pointer-leave clearing and callback
payloads are preserved.

Related-surface audit: network edge shapes share the same hover metadata path;
keyboard navigation explicitly identifies node focus; accessible network tables
already resolve semantic rows for nodes and edges. Static rendering has no
hover live region. Regression tests exercise real canvas hit testing, both
distinct/shared node-edge data, keyboard focus and the outside-image live region.
All 263 tests across the network frame, hit tester, keyboard navigation,
accessible tables, custom chart and Atlas integration suites passed, as did
changed-file ESLint and `typescript:tests`.
