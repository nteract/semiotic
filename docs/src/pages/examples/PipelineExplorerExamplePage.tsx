import * as React from "react"
import { Link } from "react-router-dom"
import ExamplePageLayout from "./ExamplePageLayout"
import PipelineExplorer from "./pipeline-explorer/PipelineExplorer"

export default function PipelineExplorerExamplePage() {
  return (
    <ExamplePageLayout title="Pipeline Explorer">
      <p className="pipeline-example-intro">
        Follow six data pipelines from source to warehouse. Pull back to see their structure, then
        zoom in to read individual steps. Payments has a validation issue; Inventory has a slow
        lookup. Select either step to investigate and leave a note.
      </p>
      <PipelineExplorer />
      <div className="pipeline-example-guide">
        <section>
          <h2>A map, at any scale</h2>
          <p>
            Start with Fit to see all six pipelines. Zoom in around your pointer, drag to explore,
            or select any step and use Focus step. The minimap follows the same visible window.
          </p>
        </section>
        <section>
          <h2>Detail when it helps</h2>
          <p>
            At a distance, text gives way to silhouettes and skeletons. Summaries appear as cards
            grow; full detail returns when movement settles. A focused editor keeps its detail.
          </p>
        </section>
        <section>
          <h2>Keep your place</h2>
          <p>
            A selected card stays mounted. Notes also live outside the virtualized cards, so they
            survive a trip across the graph. They are local to this page and are cleared on reload.
          </p>
        </section>
      </div>
      <p>
        This is an illustrative snapshot, not a live monitoring service. The Full Code view includes
        the data, layout, cards, minimap and styles. See the{" "}
        <Link to="/custom-charts/custom-layouts">custom-layout guide</Link> for the optional{" "}
        <code>semiotic/network/zoom</code> API, camera constraints and projected-size hooks.
      </p>
    </ExamplePageLayout>
  )
}
