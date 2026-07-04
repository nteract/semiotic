import React, { useState, useEffect } from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame } from "semiotic"
import { csvParse } from "d3-dsv"

import theme from "../theme"
import MarkdownText from "../MarkdownText"

const diamondsCsvUrl = new URL("../../public/data/diamonds.csv", import.meta.url)

const cutHash = {
  Ideal: theme[0],
  // Premium: theme[1],
  Good: theme[2],
  "Very Good": theme[3],
  Fair: theme[4],
  Premium: theme[5],
}

const frameProps = {
  chartType: "scatter",
  size: [700, 500],
  xAccessor: "x",
  yAccessor: "y",
  pointStyle: (d) => ({ fill: d.color, fillOpacity: 0.9, r: d.size }),
  margin: { top: 60, bottom: 50, left: 60, right: 60 },
  enableHover: true,
  showAxes: true,
  xLabel: "Carat",
  yLabel: "Price",
  yFormat: (d) => `$${d / 1000}k`,
  title: "Diamonds: Carat vs Price",
  tooltipContent: (d) => {
    return (
      <div className="tooltip-content" data-testid="tooltip-content">
        <p>Price: ${d.data?.y != null ? Number(d.data.y).toLocaleString() : "–"}</p>
        <p>Carat: {d.data?.x != null ? Number(d.data.x).toFixed(2) : "–"}</p>
      </div>
    )
  },
}

const overrideProps = {
  tooltipContent: `d => {
    return (
      <div className="tooltip-content">
        <p>Price: \${d.data?.y != null ? Number(d.data.y).toLocaleString() : "–"}</p>
        <p>Carat: {d.data?.x != null ? Number(d.data.x).toFixed(2) : "–"}</p>
      </div>
    );
  }
  `,
}

const CanvasInteraction = () => {
  const [points, setPoints] = useState(null)

  useEffect(() => {
    fetch(diamondsCsvUrl)
      .then((response) => response.text())
      .then((data) => {
        const parsedDiamonds = []
        csvParse(data).forEach((d) => {
          parsedDiamonds.push({
            y: +d.price,
            x: +d.carat,
            size: 1,
            color: cutHash[d.cut],
            clarity: d.clarity,
          })
        })
        setPoints(parsedDiamonds)
      })
      .catch((err) => console.error(err))
  }, [])

  return (
    <div>
      <MarkdownText
        text={`
This page uses the classic diamond dataset of nearly 54,000 diamonds from the [ggplot2](https://github.com/tidyverse/ggplot2/blob/master/data-raw/diamonds.csv) project.

StreamXYFrame uses the same streaming architecture for both live and static data. When a large bounded dataset is passed via the \`data\` prop, the frame automatically chunks it and renders progressively across animation frames — the first batch appears immediately and the rest fill in over subsequent frames. No special configuration is needed; just pass your data and the frame handles the rest.

`}
      />
      {!points ? (
        <div>Loading...</div>
      ) : (
        <DocumentFrame
          frameProps={{ ...frameProps, data: points }}
          overrideProps={overrideProps}
          type={StreamXYFrame}
          useExpanded
        />
      )}
    </div>
  )
}

export default CanvasInteraction
