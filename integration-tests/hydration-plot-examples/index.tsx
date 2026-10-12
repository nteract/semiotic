import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { StreamXYFrame, registerBuiltInXYPlugins } from "semiotic/xy"
import { unwrapDatum } from "semiotic/utils"

registerBuiltInXYPlugins()
const chart = (
  <StreamXYFrame
    chartType="scatter"
    size={[300, 200]}
    margin={{ left: 60, right: 50, top: 40, bottom: 70 }}
    background="#abcdef"
    data={[
      { id: "edge", x: 0, y: 0.5 },
      { id: "center", x: 0.5, y: 0.5 },
      { id: "outside", x: 2, y: 0.5 }
    ]}
    xAccessor="x"
    yAccessor="y"
    xExtent={[0, 1]}
    yExtent={[0, 1]}
    showAxes={false}
    enableHover
    pointStyle={() => ({ fill: "#ff0000", opacity: 1, r: 6 })}
    tooltipContent={(hover) => (
      <span>Point {String(unwrapDatum(hover).id)}</span>
    )}
  />
)
const host = document.getElementById("chart")!
host.innerHTML = renderToString(chart)
document.getElementById("hydrate")!.onclick = () => hydrateRoot(host, chart)
