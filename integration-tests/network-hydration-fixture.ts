import * as React from "react"
import { hydrateRoot } from "react-dom/client"
import type {
  StreamNetworkFrameHandle,
  StreamNetworkFrameProps
} from "../src/components/stream/networkTypes"

type FrameComponent = React.ComponentType<
  StreamNetworkFrameProps & React.RefAttributes<StreamNetworkFrameHandle>
>
const nodes = [
  { id: "A", name: "Measured node", value: 7 },
  { id: "B", value: 3 }
]
const edges = [
  { source: "A", target: "B", name: "Measured connection", value: 2 }
]

export function HydrationFixture({ Frame }: { Frame: FrameComponent }) {
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 })
  const [width, setWidth] = React.useState(500)
  const network = React.useRef<StreamNetworkFrameHandle>(null)
  const layout = React.useRef({ state: "initial", revision: 0 })
  React.useEffect(() => {
    Object.assign(window, {
      hydrationReviewLayout: () => layout.current,
      hydrationReviewPoint(edge: boolean) {
        const [a, b] = network.current!.getTopology().nodes
        const x = edge ? (a.x + b.x) / 2 : a.x
        const y = edge ? (a.y + b.y) / 2 : a.y
        return { x: x * view.k + view.x + 65, y: y * view.k + view.y + 45 }
      }
    })
  }, [view, width])
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "button",
      { onClick: () => setView({ x: 25, y: 15, k: 1.25 }) },
      "Pan and zoom network"
    ),
    React.createElement(
      "button",
      { onClick: () => setWidth(430) },
      "Resize network"
    ),
    React.createElement(
      "div",
      { "data-testid": "hydration-network" },
      React.createElement(Frame, {
        ref: network,
        chartType: "force",
        nodes,
        edges,
        size: [width, 320],
        margin: { top: 45, left: 65, right: 30, bottom: 30 },
        nodeSize: 10,
        iterations: 10,
        seed: 1,
        viewTransform: view,
        title: "Measured network",
        description: "Network measurements",
        accessibleTable: true,
        animate: false,
        layoutExecution: "worker",
        onLayoutStateChange: (state) => {
          layout.current = {
            state,
            revision: layout.current.revision + (state === "pending" ? 0 : 1)
          }
        },
        tooltipContent: (hover) => {
          const mark = (hover.data ?? hover) as Record<string, unknown>
          const datum = (mark.data ?? mark) as Record<string, unknown>
          return React.createElement(
            "div",
            { "data-testid": "hydration-tooltip" },
            `${String(datum.name ?? mark.id)}: measured value ${String(datum.value)}`
          )
        }
      })
    )
  )
}

export function hydrate(
  container: HTMLElement,
  library: { StreamNetworkFrame: FrameComponent }
) {
  const originalFrame = container.querySelector(".stream-network-frame")
  Object.assign(window, {
    hydrationReviewRootRetained: () =>
      container.querySelector(".stream-network-frame") === originalFrame
  })
  return hydrateRoot(
    container,
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(HydrationFixture, {
        Frame: library.StreamNetworkFrame
      })
    ),
    {
      identifierPrefix: "review-",
      onRecoverableError: (error) => {
        throw error
      }
    }
  )
}
