import React from "react"
import XYFrame from "semiotic/lib/XYFrame"

import { scaleLinear } from "d3-scale"

const velocityScale = scaleLinear()
  .domain([95.1, 118.2])
  .range(["#9fd0cb", "#E0488B"])

const frameProps = {
  points: [
    {
      game_date: "2017-05-08",
      bx: -16.29,
      by: 419.09,
      distance: 419,
      exit_velocity: 111.2
    },
    {
      game_date: "2017-08-25",
      bx: 118.41,
      by: 377.24,
      distance: 395,
      exit_velocity: 104.8
    },
    {
      game_date: "2017-08-25",
      bx: -307.27,
      by: 345.6,
      distance: 462,
      exit_velocity: 118.2
    },
    {
      game_date: "2017-04-12",
      bx: -206.88,
      by: 337.17,
      distance: 396,
      exit_velocity: 115.6
    },
    {
      game_date: "2017-04-12",
      bx: -133.63,
      by: 373.61,
      distance: 397,
      exit_velocity: 110.1
    },
    {
      game_date: "2017-08-27",
      bx: -2.53,
      by: 424.59,
      distance: 425,
      exit_velocity: 112.2
    },
    {
      game_date: "2017-08-24",
      bx: 39.59,
      by: 422.28,
      distance: 424,
      exit_velocity: 115.7
    },
    {
      game_date: "2017-08-20",
      bx: -130.96,
      by: 355.06,
      distance: 378,
      exit_velocity: 96.3
    },
    {
      game_date: "2017-08-14",
      bx: -229.63,
      by: 305.19,
      distance: 382,
      exit_velocity: 95.1
    },
    {
      game_date: "2017-08-12",
      bx: -226,
      by: 404.67,
      distance: 463,
      exit_velocity: 114
    },
    {
      game_date: "2017-08-15",
      bx: -124.53,
      by: 413.44,
      distance: 432,
      exit_velocity: 107.1
    },
    {
      game_date: "2017-08-13",
      bx: 240.66,
      by: 265.96,
      distance: 359,
      exit_velocity: 99.6
    },
    {
      game_date: "2017-08-08",
      bx: -103.74,
      by: 425.63,
      distance: 438,
      exit_velocity: 113.8
    },
    {
      game_date: "2017-08-11",
      bx: -215.02,
      by: 375.54,
      distance: 433,
      exit_velocity: 111.2
    },
    {
      game_date: "2017-08-10",
      bx: -229.2,
      by: 354.69,
      distance: 422,
      exit_velocity: 104.1
    },
    {
      game_date: "2017-08-07",
      bx: -125.08,
      by: 390.75,
      distance: 410,
      exit_velocity: 107.3
    },
    {
      game_date: "2017-08-05",
      bx: -158.04,
      by: 416.79,
      distance: 446,
      exit_velocity: 110.6
    },
    {
      game_date: "2017-08-04",
      bx: -163.5,
      by: 391.37,
      distance: 424,
      exit_velocity: 107.3
    },
    {
      game_date: "2017-08-04",
      bx: -47.72,
      by: 474.73,
      distance: 477,
      exit_velocity: 115.5
    },
    {
      game_date: "2017-07-26",
      bx: -192.16,
      by: 426.81,
      distance: 468,
      exit_velocity: 112
    },
    {
      game_date: "2017-06-29",
      bx: -221.86,
      by: 323.76,
      distance: 392,
      exit_velocity: 97.3
    },
    {
      game_date: "2017-06-23",
      bx: -60.07,
      by: 453.66,
      distance: 458,
      exit_velocity: 112.4
    },
    {
      game_date: "2017-05-26",
      bx: -21.21,
      by: 459.29,
      distance: 460,
      exit_velocity: 111.9
    },
    {
      game_date: "2017-05-30",
      bx: 163.17,
      by: 351.5,
      distance: 388,
      exit_velocity: 107.2
    },
    {
      game_date: "2017-07-24",
      bx: 195.8,
      by: 330.79,
      distance: 384,
      exit_velocity: 105.7
    },
    {
      game_date: "2017-07-24",
      bx: -246.44,
      by: 350.65,
      distance: 429,
      exit_velocity: 110.5
    },
    {
      game_date: "2017-07-17",
      bx: -167.38,
      by: 347.68,
      distance: 386,
      exit_velocity: 110
    },
    {
      game_date: "2017-07-17",
      bx: -325.15,
      by: 298.32,
      distance: 441,
      exit_velocity: 115.1
    },
    {
      game_date: "2017-07-19",
      bx: -54.44,
      by: 433.36,
      distance: 437,
      exit_velocity: 112.9
    },
    {
      game_date: "2017-07-07",
      bx: 213.77,
      by: 306.52,
      distance: 374,
      exit_velocity: 102.4
    },
    {
      game_date: "2017-06-19",
      bx: 162.7,
      by: 363.76,
      distance: 398,
      exit_velocity: 105.9
    },
    {
      game_date: "2017-06-13",
      bx: -156.06,
      by: 366.54,
      distance: 398,
      exit_velocity: 108.1
    },
    {
      game_date: "2017-05-28",
      bx: -141.39,
      by: 375.01,
      distance: 401,
      exit_velocity: 105.5
    },
    {
      game_date: "2017-06-09",
      bx: -12.13,
      by: 448.72,
      distance: 449,
      exit_velocity: 110.6
    },
    {
      game_date: "2017-06-02",
      bx: 228.61,
      by: 266.23,
      distance: 351,
      exit_velocity: 99.6
    },
    {
      game_date: "2017-05-07",
      bx: -323.08,
      by: 338.17,
      distance: 468,
      exit_velocity: 113.4
    },
    {
      game_date: "2017-05-07",
      bx: -225.11,
      by: 373.51,
      distance: 436,
      exit_velocity: 113.1
    },
    {
      game_date: "2017-05-06",
      bx: 134.58,
      by: 379.62,
      distance: 403,
      exit_velocity: 109.4
    },
    {
      game_date: "2017-04-22",
      bx: -268.33,
      by: 319.71,
      distance: 417,
      exit_velocity: 114.1
    },
    {
      game_date: "2017-04-22",
      bx: -243.96,
      by: 293.17,
      distance: 381,
      exit_velocity: 107.1
    },
    {
      game_date: "2017-08-29",
      bx: -181.59,
      by: 400.82,
      distance: 440,
      exit_velocity: 112.8
    },
    {
      game_date: "2017-04-19",
      bx: -86.38,
      by: 437.03,
      distance: 445,
      exit_velocity: 114.1
    },
    {
      game_date: "2017-04-21",
      bx: 165.54,
      by: 377.1,
      distance: 412,
      exit_velocity: 112.1
    },
    {
      game_date: "2017-04-15",
      bx: -6.49,
      by: 442.31,
      distance: 442,
      exit_velocity: 111.9
    },
    {
      game_date: "2017-08-22",
      bx: 232.55,
      by: 256.5,
      distance: 346,
      exit_velocity: 97.3
    },
    {
      game_date: "2017-07-18",
      bx: -133.27,
      by: 420.97,
      distance: 442,
      exit_velocity: 111.4
    },
    {
      game_date: "2017-07-05",
      bx: -62.86,
      by: 410.64,
      distance: 415,
      exit_velocity: 105.2
    },
    {
      game_date: "2017-07-05",
      bx: -177.63,
      by: 366.69,
      distance: 407,
      exit_velocity: 114
    },
    {
      game_date: "2017-07-09",
      bx: -143.2,
      by: 364.05,
      distance: 391,
      exit_velocity: 100.8
    },
    {
      game_date: "2017-07-09",
      bx: -34.63,
      by: 441.54,
      distance: 443,
      exit_velocity: 108.4
    },
    {
      game_date: "2017-06-25",
      bx: -241.93,
      by: 281.04,
      distance: 371,
      exit_velocity: 105.9
    }
  ],
  margin: { left: 35, right: 15, top: 50, bottom: 45 },
  xAccessor: "distance",
  yAccessor: "exit_velocity",
  pointStyle: { fill: "#E0488B", r: 6 },
  axes: [
    {
      orient: "top",
      baseline: false,
      marginalSummaryType: {
        type: "ridgeline",
        bins: 8,
        summaryStyle: { fill: "#e0d33a", fillOpacity: 0.5, stroke: "#e0d33a" }
      }
    },
    {
      orient: "right",
      baseline: false,
      marginalSummaryType: {
        type: "heatmap",
        summaryStyle: { fill: "#e0d33a" },
        flip: true
      }
    },
    { orient: "left" },
    { orient: "bottom" }
  ],
  hoverAnnotation: true,
  tooltipContent: d => (
    <div className="tooltip-content">
      <p>Date: {d.game_date}</p>
      <p>Distance: {d.distance}</p>
      <p>Velocity: {d.exit_velocity}</p>
    </div>
  )
}

export default () => {
  return <XYFrame {...frameProps} />
}
