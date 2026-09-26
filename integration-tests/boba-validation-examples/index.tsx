import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { OrdinalCustomChart } from "../../dist/ordinal.module.min.js"
import { bobaLayout } from "../../dist/semiotic-recipes.module.min.js"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"

const pushed =
  new URLSearchParams(window.location.search).get("mode") === "pushed"

function App() {
  const [width, setWidth] = useState(440)
  const [row, setRow] = useState({
    name: "Cup",
    bobaRadius: 0,
    bobaVolume: 110
  })
  const ref = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    if (pushed) ref.current?.replace([row])
  }, [row])

  return (
    <>
      <button onClick={() => setWidth(340)}>Resize</button>
      <button onClick={() => setRow({ ...row, bobaRadius: -1 })}>
        Negative radius
      </button>
      <button onClick={() => setRow({ ...row, bobaRadius: 1e-6 })}>
        Tiny radius
      </button>
      <button onClick={() => setRow({ ...row, bobaVolume: 0 })}>
        No pearls
      </button>
      <div data-testid="boba-chart">
        <OrdinalCustomChart
          ref={ref}
          {...(pushed ? {} : { data: [row] })}
          categoryAccessor="name"
          layout={bobaLayout}
          width={width}
          height={360}
          margin={{ left: 20, right: 20, top: 20, bottom: 44 }}
          title="Validated boba cup"
          description="A cup with bounded pearl geometry and unchanged quantity metadata."
          animate={false}
          enableHover
          tooltip={(datum) => (
            <span>
              {datum.name}: {datum.numBobas} pearls; {datum.renderedBobas} shown
            </span>
          )}
        />
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
