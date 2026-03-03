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
  pointStyle: (d) => ({ fill: d.color, fillOpacity: 0.9 }),
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
        <p>Price: ${d.value}</p>
        <p>Carat: {d.time}</p>
      </div>
    )
  },
}

const overrideProps = {
  tooltipContent: `d => {
    return (
      <div className="tooltip-content">
        <p>Price: \${d.value}</p>
        <p>Carat: {d.time}</p>
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
            size: +d.table,
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
This page uses the classic diamond dataset of nearly 54,000 diamonds source from the [ggplot2](https://github.com/tidyverse/ggplot2/blob/master/data-raw/diamonds.csv) project.

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
