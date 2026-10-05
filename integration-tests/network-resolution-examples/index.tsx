import { useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  BoundaryLoomChart,
  ResolutionAtlasChart,
  ComponentCutaway,
  resolutionChartProps
} from "semiotic/experimental/network-resolution/react"
import { defaultResolutionView } from "semiotic/experimental/network-resolution"
import {
  flagship,
  resolveFixture
} from "../../scripts/network-resolution/fixtures"

const resolution = flagship()
const ghost = resolveFixture(
  ["A", "x1", "x2", "D"],
  [
    ["a", "A", "x1"],
    ["b", "x2", "x1"],
    ["c", "x2", "D"]
  ],
  { rules: [{ kind: "group-authored", version: "1", hierarchyRef: "h" }] },
  {
    edgeSemantics: [],
    authoredHierarchies: [
      {
        id: "h",
        groups: [
          {
            id: "x",
            label: "False quotient route",
            sourceNodeIds: ["x1", "x2"]
          }
        ]
      }
    ]
  }
)
const mode =
  new URLSearchParams(location.search).get("mode") === "loom"
    ? "boundary-loom"
    : "resolution-atlas"

function App() {
  const [width, setWidth] = useState(1100),
    [zoomed, setZoomed] = useState(false)
  const camera = zoomed ? { x: -100, y: -35, k: 1.1 } : { x: 0, y: 0, k: 1 }
  const view = useMemo(
    () => ({
      ...defaultResolutionView(resolution, mode),
      pageIds: resolution.pages
        .slice(0, mode === "resolution-atlas" ? 4 : 5)
        .map((p) => p.id)
    }),
    []
  )
  const props = {
    resolution,
    width,
    height: 660,
    view,
    frameProps: { viewTransform: camera }
  }
  const chart = resolutionChartProps(props, mode)
  const probe = chart.layout({
    nodes: [],
    edges: [],
    dimensions: {
      width,
      height: 660,
      plot: { x: 12, y: 15, width: width - 24, height: 635 }
    },
    config: chart.layoutConfig,
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "#176b87"
  })
  Object.assign(window, {
    resolutionProbe: {
      scene: probe,
      camera,
      width,
      revision: resolution.analysisRevision
    }
  })
  const Component =
    mode === "resolution-atlas" ? ResolutionAtlasChart : BoundaryLoomChart
  return (
    <main>
      <h1>Network Resolution — synthetic acceptance fixtures</h1>
      <p>
        <button onClick={() => setWidth(width === 1100 ? 850 : 1100)}>
          Resize reader
        </button>{" "}
        <button onClick={() => setZoomed(!zoomed)}>Zoom and pan</button>
      </p>
      <div data-testid="reader">
        <Component {...props} />
      </div>
      <ComponentCutaway
        resolution={ghost}
        pageId={ghost.pages[1].id}
        groupId={ghost.pages[1].nodeOwner.x1}
      />
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
