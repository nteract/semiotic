import * as React from "react"
import { ResponsiveXYFrame } from "../../components"
import { movies } from "../sampledata/movies"

const responsiveSettings = {
    responsiveWidth: true,
    title: "Two Movies",
    size: [700, 400],
    dataVersion: "fixed",
    lines: movies,
    lineType: {
        type: "line",
        y1: () => 0,
        interpolator: "monotonex"
    },
    annotations: [{
        type: "highlight",
        title: "Ex Machina",
        style: { fill: "red", stroke: "purple" }
    }],
    lineIDAccessor: "title",
    lineDataAccessor: "coordinates",
    xAccessor: ["week"],
    yAccessor: ["theaterCount"],
    lineStyle: d => ({
        stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
        fill: "none"
    }),
    pointStyle: d => ({
        fill: d.parentLine.title === "Ex Machina" ? "#00a2ce" : "red"
    }),
    margin: { left: 80, bottom: 50, right: 10, top: 40 },
    axes: [
        {
            orient: "left",
            jaggedBase: true,
            baseline: false
        },
        {
            orient: "bottom",
            jaggedBase: true,
            baseline: false
        }
    ],
    backgroundGraphics: ({ size, margin }) => (
        <g>
            <rect
                fill="#fffceb"
                stroke="#f8ffeb"
                width={size[0] - margin.right}
                height={size[1] - margin.top - margin.bottom}
                x={margin.left}
                y={margin.top}
            />
            <text>{JSON.stringify(margin)}</text>
        </g>
    ),
    foregroundGraphics: ({ size, margin }) => (
        <g>
            <line
                strokeWidth={3}
                stroke={"#fcebff"}
                x1={margin.left}
                x2={size[0] - margin.right}
                y1={size[1] - margin.bottom}
                y2={size[1] - margin.bottom}
            />
        </g>
    ),
    defined: d => d.theaterCount !== null,
    showLinePoints: "orphan"
}

export default () => {

    return (<div style={{ display: "flex", marginTop: "200px", minWidth: "0", overflow: "hidden" }}>
        <ResponsiveXYFrame
            {...responsiveSettings}
        />
        <ResponsiveXYFrame
            {...responsiveSettings}
        />
        <ResponsiveXYFrame
            {...responsiveSettings}
        />
    </div>)
}
