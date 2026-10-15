import * as React from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider, useTheme } from "../src/components/ThemeProvider"
import StreamGeoFrame from "../src/components/stream/StreamGeoFrame"
import StreamNetworkFrame from "../src/components/stream/StreamNetworkFrame"
import type { StreamGeoFrameHandle } from "../src/components/stream/geoTypes"
import type { StreamNetworkFrameHandle } from "../src/components/stream/networkTypes"

function Palette() {
  const theme = useTheme()
  return (
    <output
      data-testid="palette"
      data-text={theme.colors.text}
      data-background={theme.colors.background}
    >
      Active palette
    </output>
  )
}

export function mount(container: HTMLElement) {
  const root = createRoot(container)
  function Fixture() {
    const [view, setView] = React.useState({ x: 0, y: 0, k: 1 })
    const [width, setWidth] = React.useState(500)
    const geo = React.useRef<StreamGeoFrameHandle>(null)
    const network = React.useRef<StreamNetworkFrameHandle>(null)
    React.useEffect(() => {
      Object.assign(window, {
        grooming: {
          geoPoint() {
            const p = geo.current!.getProjection()!([0, 0])!
            return { x: p[0] + 65, y: p[1] + 45 }
          },
          networkEdgePoint() {
            const [a, b] = network.current!.getTopology().nodes
            return {
              x: ((a.x + b.x) / 2) * view.k + view.x + 65,
              y: ((a.y + b.y) / 2) * view.k + view.y + 45
            }
          },
          networkPoint() {
            const n = network
              .current!.getTopology()
              .nodes.find((n) => n.id === "A")!
            return {
              x: n.x * view.k + view.x + 65,
              y: n.y * view.k + view.y + 45
            }
          }
        }
      })
    }, [view, width])
    const tooltip = (hover: Record<string, unknown>) => {
      const mark = (hover.data ?? hover) as Record<string, unknown>
      const datum = (mark.data ?? mark) as Record<string, unknown>
      return (
        <div data-testid="grooming-tooltip">
          {String(datum.name ?? mark.id)}: measured value {String(datum.value)}
        </div>
      )
    }
    return (
      <ThemeProvider theme={{ mode: "auto" }}>
        <Palette />
        <button onClick={() => setView({ x: 25, y: 15, k: 1.25 })}>
          Pan and zoom network
        </button>
        <button onClick={() => setWidth(430)}>Resize charts</button>
        <div data-testid="grooming-network">
          <StreamNetworkFrame
            ref={network}
            chartType="force"
            nodes={[
              { id: "A", name: "Measured node", value: 7 },
              { id: "B", value: 3 }
            ]}
            edges={[
              {
                source: "A",
                target: "B",
                name: "Measured connection",
                value: 2
              }
            ]}
            size={[width, 320]}
            margin={{ top: 45, left: 65, right: 30, bottom: 30 }}
            nodeSize={10}
            iterations={10}
            seed={1}
            viewTransform={view}
            title="Measured network"
            description="Network measurements"
            accessibleTable={false}
            animate={false}
            tooltipContent={tooltip}
          />
        </div>
        <div data-testid="grooming-geo">
          <StreamGeoFrame
            ref={geo}
            projection="mercator"
            fitPadding={0.12}
            points={[
              { lon: 0, lat: 0, name: "Measured site", value: 7 },
              { lon: 10, lat: 10, name: "Other site", value: 3 },
              { lon: -10, lat: -10, name: "Third site", value: 4 }
            ]}
            size={[width, 320]}
            margin={{ top: 45, left: 65, right: 30, bottom: 30 }}
            pointStyle={() => ({ r: 8 })}
            zoomable
            showZoomControls
            title="Measured map"
            description="Geographic measurements"
            accessibleTable={false}
            animate={false}
            tooltipContent={tooltip}
          />
        </div>
      </ThemeProvider>
    )
  }
  root.render(<Fixture />)
}
