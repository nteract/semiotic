import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const nflx = [
  { date: "09/14/2018", open: 368, high: 371, low: 363, close: 364.56 },
  { date: "09/13/2018", open: 371, high: 374, low: 366, close: 368.15 },
  { date: "09/12/2018", open: 359, high: 370, low: 356, close: 369.95 },
  { date: "09/11/2018", open: 344, high: 356, low: 343, close: 355.93 },
  { date: "09/10/2018", open: 352, high: 352, low: 343, close: 348.41 },
  { date: "09/07/2018", open: 342, high: 355, low: 341, close: 348.68 },
  { date: "09/06/2018", open: 347, high: 356, low: 341, close: 346.46 },
  { date: "09/05/2018", open: 360, high: 363, low: 335, close: 341.18 },
  { date: "09/04/2018", open: 366, high: 368, low: 361, close: 363.6 },
  { date: "08/31/2018", open: 370, high: 376, low: 367, close: 367.68 },
  { date: "08/30/2018", open: 365, high: 376, low: 363, close: 370.98 },
  { date: "08/29/2018", open: 367, high: 369, low: 362, close: 368.04 },
  { date: "08/28/2018", open: 367, high: 369, low: 360, close: 368.49 },
  { date: "08/27/2018", open: 367, high: 374, low: 360, close: 364.58 },
  { date: "08/24/2018", open: 346, high: 359, low: 344, close: 358.82 },
  { date: "08/23/2018", open: 348, high: 350, low: 337, close: 339.17 },
  { date: "08/22/2018", open: 338, high: 346, low: 337, close: 344.44 },
  { date: "08/21/2018", open: 331, high: 341, low: 329, close: 338.02 },
  { date: "08/20/2018", open: 314, high: 331, low: 310, close: 327.73 },
  { date: "08/17/2018", open: 319, high: 324, low: 312, close: 316.78 },
  { date: "08/16/2018", open: 329, high: 331, low: 321, close: 322.44 },
  { date: "08/15/2018", open: 334, high: 335, low: 321, close: 326.4 },
  { date: "08/14/2018", open: 342, high: 342, low: 336, close: 337.49 },
  { date: "08/13/2018", open: 339, high: 347, low: 339, close: 341.31 },
  { date: "08/10/2018", open: 346, high: 349, low: 344, close: 345.87 },
  { date: "08/09/2018", open: 347, high: 352, low: 345, close: 349.36 },
  { date: "08/08/2018", open: 352, high: 352, low: 346, close: 347.61 },
  { date: "08/07/2018", open: 353, high: 357, low: 349, close: 351.83 },
  { date: "08/06/2018", open: 342, high: 365, low: 341, close: 347 },
  { date: "08/03/2018", open: 347, high: 347, low: 338, close: 343.09 },
  { date: "08/02/2018", open: 337, high: 345, low: 334, close: 344.5 },
  { date: "08/01/2018", open: 335, high: 344, low: 334, close: 338.38 },
  { date: "07/31/2018", open: 331, high: 342, low: 328, close: 337.45 },
  { date: "07/30/2018", open: 351, high: 352, low: 334, close: 334.96 },
  { date: "07/27/2018", open: 366, high: 367, low: 351, close: 355.21 },
  { date: "07/26/2018", open: 358, high: 365, low: 356, close: 363.09 },
  { date: "07/25/2018", open: 357, high: 363, low: 355, close: 362.87 },
  { date: "07/24/2018", open: 366, high: 367, low: 354, close: 357.32 },
  { date: "07/23/2018", open: 359, high: 363, low: 353, close: 362.66 },
  { date: "07/20/2018", open: 364, high: 370, low: 360, close: 361.05 },
  { date: "07/19/2018", open: 371, high: 375, low: 363, close: 364.23 },
  { date: "07/18/2018", open: 381, high: 383, low: 372, close: 375.13 },
  { date: "07/17/2018", open: 346, high: 385, low: 344, close: 379.48 },
  { date: "07/16/2018", open: 398, high: 403, low: 391, close: 400.48 },
  { date: "07/13/2018", open: 409, high: 410, low: 395, close: 395.8 },
  { date: "07/12/2018", open: 415, high: 416, low: 407, close: 413.5 },
  { date: "07/11/2018", open: 411, high: 419, low: 410, close: 418.65 },
  { date: "07/10/2018", open: 417, high: 419, low: 413, close: 415.63 },
  { date: "07/09/2018", open: 415, high: 419, low: 411, close: 418.97 },
  { date: "07/06/2018", open: 397, high: 408, low: 395, close: 408.25 },
  { date: "07/05/2018", open: 393, high: 399, low: 390, close: 398.39 },
  { date: "07/03/2018", open: 399, high: 399, low: 389, close: 390.52 },
  { date: "07/02/2018", open: 385, high: 398, low: 380, close: 398.18 },
  { date: "06/29/2018", open: 399, high: 401, low: 390, close: 391.43 },
  { date: "06/28/2018", open: 395, high: 396, low: 387, close: 395.42 },
  { date: "06/27/2018", open: 407, high: 411, low: 390, close: 390.39 },
  { date: "06/26/2018", open: 393, high: 404, low: 389, close: 399.39 },
  { date: "06/25/2018", open: 404, high: 405, low: 378, close: 384.48 },
  { date: "06/22/2018", open: 419, high: 420, low: 409, close: 411.09 },
  { date: "06/21/2018", open: 421, high: 423, low: 406, close: 415.44 },
  { date: "06/20/2018", open: 415, high: 419, low: 409, close: 416.76 },
  { date: "06/19/2018", open: 389, high: 405, low: 388, close: 404.98 },
  { date: "06/18/2018", open: 387, high: 393, low: 386, close: 390.4 },
  { date: "06/15/2018", open: 390, high: 398, low: 387, close: 391.98 },
  { date: "06/14/2018", open: 384, high: 395, low: 383, close: 392.87 }
]

function formatDate(d) {
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const frameProps = {
  chartType: "candlestick",
  data: nflx,
  xAccessor: d => new Date(d.date).getTime(),
  openAccessor: "open",
  highAccessor: "high",
  lowAccessor: "low",
  closeAccessor: "close",
  candlestickStyle: {
    upColor: theme[2],
    downColor: theme[1],
    wickColor: "#333",
  },
  size: [700, 400],
  margin: { left: 80, bottom: 50, right: 10, top: 40 },
  showAxes: true,
  xFormat: formatDate,
  yLabel: "Price ($)",
  enableHover: true,
  tooltipContent: d => {
    const datum = d.data || {}
    return (
      <div className="tooltip-content">
        <p style={{ fontWeight: 600 }}>{datum.date}</p>
        <p>Open: ${datum.open}</p>
        <p>High: ${datum.high}</p>
        <p>Low: ${datum.low}</p>
        <p>Close: ${datum.close}</p>
      </div>
    )
  },
  title: "Netflix Stock Price (NFLX)"
}

const overrideProps = {
  tooltipContent: `d => {
    const datum = d.data || {}
    return (
      <div className="tooltip-content">
        <p style={{ fontWeight: 600 }}>{datum.date}</p>
        <p>Open: \${datum.open}</p>
        <p>High: \${datum.high}</p>
        <p>Low: \${datum.low}</p>
        <p>Close: \${datum.close}</p>
      </div>
    )
  }`,
  xAccessor: `d => new Date(d.date).getTime()`,
  candlestickStyle: `{
    upColor: theme[2],  // green for up days
    downColor: theme[1], // red for down days
    wickColor: "#333",
  }`
}

const CandlestickChart = () => {
  return (
    <div>
      <MarkdownText
        text={`

The Candlestick Chart is a financial chart that summarizes the open, close, high, and low for a stock.

Standard candlestick charts have two colors
- one color denotes a day where the stock closed higher than it opened
- the other color denotes when it closed lower than it opened.

StreamXYFrame supports candlestick charts as a first-class chart type with dedicated accessors for \`open\`, \`high\`, \`low\`, and \`close\` values:

\`\`\`jsx
<StreamXYFrame
  chartType="candlestick"
  data={data}
  xAccessor={d => new Date(d.date).getTime()}
  openAccessor="open"
  highAccessor="high"
  lowAccessor="low"
  closeAccessor="close"
  candlestickStyle={{
    upColor: "#4daf4a",   // close > open
    downColor: "#e41a1c", // close < open
    wickColor: "#333",
  }}
/>
\`\`\`
`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={StreamXYFrame}
        useExpanded
      />
    </div>
  )
}

export default CandlestickChart
