import React, { useState } from "react"
import { Scatterplot } from "../../dist/xy.module.min.js"

export function LazyTransitionExample() {
  const [updated, setUpdated] = useState(false)
  const [width, setWidth] = useState(400)
  return <div>
    <button onClick={() => setUpdated(true)}>Enable transition and update</button>
    <button onClick={() => setWidth(300)}>Resize transition chart</button>
    <div data-testid="lazy-transition-chart">
      <Scatterplot
        data={[{ x: 5, y: updated ? 8 : 2, label: updated ? "Updated point" : "Original point" }]}
        xAccessor="x" yAccessor="y" xExtent={[0, 10]} yExtent={[0, 10]}
        width={width} height={300}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        color="#d02040" pointRadius={8}
        animate={updated ? { duration: 1500, easing: "linear", intro: false } : false}
        tooltip={datum => <span>{String(datum.label)}</span>}
      />
    </div>
  </div>
}
