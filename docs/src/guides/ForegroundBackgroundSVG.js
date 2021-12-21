import React from "react"

import { Link } from "react-router-dom"

const style = {
  width: "100%",
  maxWidth: 400
}

export default function CreateALineChart() {
  return (
    <div>
      <p>
        In each Frame, there is a svg behind the data visualization,{" "}
        <code>backgroundGraphics</code>, and one in front,{" "}
        <code>foregroundGraphics</code>. You can pass any svg elements you want
        to those layers to be rendered.
      </p>
      <img
        alt="layers in semiotic"
        style={style}
        src="/assets/img/layers.png"
      />

      <p>
        See the <Link to="/examples/homerun-map">Homerun Map</Link> example for
        liberal use of <code>backgroundGraphics</code>, and the{" "}
        <Link to="/examples/radar-plot">Radar Plot</Link> example for use of{" "}
        <code>foregroundGraphics</code>.
      </p>
    </div>
  )
}
