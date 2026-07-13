import React from "react"
import "./PilotExamplePanels.css"

function listOrFallback(values, fallback) {
  return Array.isArray(values) && values.length > 0 ? values : [fallback]
}

/**
 * A lazy, metadata-driven companion for pages participating in the incremental
 * ExampleDefinition migration. It deliberately reports declaration status
 * rather than implying that an unmeasured budget or compatibility promise has
 * already been verified.
 */
export default function PilotExamplePanels({ definition }) {
  const contract = definition?.contract ?? {}
  const sourceFile = definition?.sourceFile ?? "ExamplePage.jsx"
  const title = definition?.title ?? "this example"
  const imports = listOrFallback(contract.publicImports, "semiotic")
  const dataStates = listOrFallback(contract.data?.states, "snapshot")
  const fixture = contract.data?.fixture
  const provenance = contract.provenance

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
