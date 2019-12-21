import * as React from "react"
import { ResponsiveXYFrame } from "../../components"

import { randomNormal } from "d3-random"

const pointTestData = []
const nRando = randomNormal(0, 1000)
const pRando = randomNormal(0, 1000)

for (let x = 1; x < 100; x++) {
    pointTestData.push({
        x: nRando() * 2 - 3000,
        y: 2000 + nRando(),
        color: "#00a2ce"
    })
}
for (let x = 1; x < 100; x++) {
    pointTestData.push({
        x: 1000 + pRando(),
        y: 1000 + pRando() * 2,
        color: "#4d430c"
    })
}
for (let x = 1; x < 100; x++) {
    pointTestData.push({
        x: pRando() - 1000,
        y: pRando() * 2 - 1000,
        color: "#b3331d"
    })
}

for (let x = 1; x < 100; x++) {
    pointTestData.push({
        x: pRando() + 1000,
        y: pRando() * 2 - 2000,
        color: "#b6a756"
    })
}


export default () => {
    return (<div style={{ height: "100%", width: "100%", minHeight: "600px" }}>PUT A RESPONSIVE FRAME HERE
    <ResponsiveXYFrame
            points={pointTestData}
            xAccessor="x"
            yAccessor="y"
            responsiveWidth={true}
            pointStyle={d => ({ fill: d.color })}
            yExtent={[-8500, 8500]}
            areaStyle={{ stroke: "darkred" }}
            margin={d => d.size[0] / 20}
            axes={[
                {
                    orient: "top",
                    marginalSummaryType: {
                        filter: d => d.color === "#00a2ce",
                        type: "ridgeline",
                        showPoints: true,
                        summaryStyle: {
                            fill: "#00a2ce",
                            stroke: "#00a2ce",
                            fillOpacity: 0.25
                        },
                        pointStyle: {
                            fill: "#00a2ce",
                            r: 4,
                            fillOpacity: 0.05
                        }
                    }
                },
                {
                    orient: "left",
                    baseline: "under",
                    marginalSummaryType: {
                        filter: d => d.color === "#4d430c",
                        type: "ridgeline",
                        bins: 6,
                        summaryStyle: {
                            fill: "#4d430c",
                            stroke: "#4d430c",
                            fillOpacity: 0.25
                        }
                    }
                },
                {
                    orient: "right",
                    marginalSummaryType: {
                        filter: d => d.color === "#b3331d",
                        type: "ridgeline",
                        showPoints: true,
                        summaryStyle: {
                            fill: "#b3331d",
                            stroke: "#b3331d",
                            fillOpacity: 0.25
                        }
                    }
                },
                {
                    orient: "top",
                    marginalSummaryType: {
                        type: "ridgeline",
                        filter: d => d.color === "#b6a756",
                        summaryStyle: {
                            fill: "#b6a756",
                            stroke: "#b6a756",
                            fillOpacity: 0.25
                        },
                        showPoints: true,
                        pointStyle: {
                            fill: "#b6a756",
                            r: 4,
                            fillOpacity: 0.05
                        }
                    }
                },
                d => {
                    return {
                        orient: "bottom",
                        ticks: Math.ceil(d.size[0] / 150)
                    }
                }
            ]}
        />
    </div>)
}
