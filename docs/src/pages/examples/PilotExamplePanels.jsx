import React from "react"
import "./PilotExamplePanels.css"

function listOrFallback(values, fallback) {
  return Array.isArray(values) && values.length > 0 ? values : [fallback]
}

/**
 * A lazy, metadata-driven companion for every ExampleDefinition. Its
 * unassessed branch deliberately names missing review instead of borrowing
 * concrete imports, fixtures, or compatibility claims from another page.
 */
export default function PilotExamplePanels({ definition }) {
  const contract = definition?.contract ?? {}
  const sourceFile = definition?.sourceFile ?? "ExamplePage.jsx"
  const title = definition?.title ?? "this example"
  const isDeclared = contract.assessment === "declared"
  const imports = listOrFallback(contract.publicImports, "semiotic")
  const dataStates = listOrFallback(contract.data?.states, "snapshot")
  const fixture = contract.data?.fixture
  const provenance = contract.provenance

  if (!isDeclared) {
    return (
      <section className="pilot-example-panels" aria-label={`${title} implementation guidance`}>
        <div className="pilot-example-panel">
          <h2>Copy this pattern</h2>
          <p>
            This route has source code and a route entry, but its reusable implementation pattern
            has not been reviewed yet.
          </p>
          <ul>
            <li>Public imports: not assessed.</li>
            <li>Data fixture and lifecycle: not assessed.</li>
            <li>Use Full Code as the current reference before adapting this page into an application.</li>
          </ul>
        </div>
        <div className="pilot-example-panel">
          <h2>Production concerns</h2>
          <ul>
            <li>Accessibility, motion, responsive behavior, and SSR support: not assessed.</li>
            <li>Performance status: unmeasured.</li>
            <li>Record route-specific provenance and review before treating this page as production guidance.</li>
          </ul>
        </div>
        <div className="pilot-example-panel">
          <h2>Page source</h2>
          <p>
            <code>{sourceFile}</code> is the source mapped to this route. It loads only when Full
            Code is selected; the mapping does not establish a compatibility or production guarantee.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="pilot-example-panels" aria-label={`${title} implementation guidance`}>
      <div className="pilot-example-panel">
        <h2>Copy this pattern</h2>
        <p>
          Start with public package imports and a deterministic fixture, then keep page controls and
          chart state in one page-level model.
        </p>
        <ul>
          <li>
            Public import{imports.length === 1 ? "" : "s"}: {imports.map((entry) => (
              <code key={entry}>{entry}</code>
            ))}
          </li>
          <li>
            Fixture: <code>{fixture?.kind ?? "local fixture"}</code>
            {fixture?.replay ? " (replayable)" : ""}
          </li>
          <li>Declared data states: {dataStates.join(", ")}</li>
        </ul>
      </div>
      <div className="pilot-example-panel">
        <h2>Production concerns</h2>
        <ul>
          <li>Keep fixture provenance and freshness ownership with the example metadata.</li>
          <li>
            Freshness owner: {provenance?.freshnessOwner ?? "not yet assigned"}; review cadence: {" "}
            {provenance?.reviewCadence ?? "not yet assigned"}.
          </li>
          <li>Make reduced-motion, visibility, responsive, and performance status explicit before release.</li>
          <li>Keep source mapping metadata in sync so Full Code stays lazy and accurate.</li>
        </ul>
      </div>
      <div className="pilot-example-panel">
        <h2>Page source</h2>
        <p>
          Edit <code>{sourceFile}</code> for this page. Keep the definition, source loader, fixture,
          and page behavior scoped together while the full registry migration is in progress.
        </p>
      </div>
    </section>
  )
}
