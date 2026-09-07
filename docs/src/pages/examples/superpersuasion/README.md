# The art of being worth choosing

Public route: `/examples/superpersuasion`. The magazine article is authored in
`../SuperpersuasionExamplePage.tsx`; its shared paper palette and typography live
in the matching CSS file. The example registry owns its card, order, source map,
route metadata and generated social preview.

The article has three working exhibits:

- `DecisionFlow` reads the 24 public scenarios in `evals/adoption/fixtures.json`.
  Each scenario contributes one unit on each of two Sankey stages. A case with
  several acceptable decisions goes to “Judgment required”; it is never divided
  into invented probabilities. Group filters, individual tracing and an exact
  table preserve the original prompts, constraints and accepted alternatives.
- `FieldGuide` reads the actual generated files in `docs/public/tasks/`. Its
  download and plain-text links point to those same records. The displayed check
  status follows the packet; the article does not manufacture a verification
  result. Regenerate and reverify through the task tooling when inputs change.
- `CorrectionDesk` reuses the task example's real Artifact Contract revision and
  handoff helpers. Synthetic regional values change from 12/30/18 to 12/30/36.
  A data-only change is refused; the completed revision updates both claims,
  retains earlier claims and evidence, and leaves review pending. The published
  bars stay hatched and the axis stays at 0–40. A downloaded chart works with or
  without its optional correction context; only the latter carries the history.

These are public development scenarios and working fixtures, not measured agent
decisions or conversion rates. The separately cited Salvi et al. human-debate
study is background reading, with its September 2026 correction consulted. It
does not establish that these software guides improve adoption.

## Verification

```sh
npx vitest run docs/src/pages/examples/superpersuasion
npx playwright test --config playwright.docs-examples.config.ts integration-tests/docs-examples-superpersuasion.spec.ts
npx tsc -p scripts/superpersuasion/tsconfig.json
npm run check:docs-example-integrity
npm run check:website-build
```

The browser spec checks filtered case membership and actual canvas changes,
downloaded guide contents, correction refusal and revision, context-bearing and
bare downloads, keyboard interaction, 390px layout and automated accessibility.
Manual assistive-technology reception remains unassessed. Responsive flow
scrolling is local to a focusable region; the article itself does not overflow.
Control colors change immediately so intermediate animation frames do not
introduce low-contrast selected states.

## Renderer learnings and related-surface audit

The one-unit Sankey ribbons exposed a missing server edge identity: several
rows with the same endpoints collapsed onto one layout edge. `staticNetwork`
now assigns the same row-specific `_edgeKey` as bounded browser ingestion.
Regression tests compare all ribbons and path geometry across standalone chart
rendering, direct network SVG, React chart SSR and StreamNetworkFrame SSR, in
both orientations. Existing network and coloring coverage also passes. This
does not change the Sankey plugin's existing square-root transformation of
unequal weights; all article ribbons have equal unit weight.

The correction desk exposed missing `valueExtent` forwarding in the BarChart,
StackedBarChart, GroupedBarChart, DotPlot and RidgelinePlot server configs. All
five now preserve the extent. The other seven ordinal components exposing that
prop already forwarded it. Numeric bounds are now available through the owning
chart specs and generated schema for all twelve; React's automatic-bound
behavior remains intact. Tests cover changing data on a fixed scale, chart/frame
SVG parity, schema validation, and existing style-rule/hatching behavior.

The completed production website check includes the example's metadata and
architecture profile, readable prerendered article and exact scenario rows,
generated social card, asset budgets and protected boundaries. The library and
MCP builds and clean npm consumer also pass. Source task receipts and the
adoption inventory were refreshed after the renderer changes. No publication,
deployment or paid adoption evaluation is part of these checks.
