import { describe, expect, it } from "vitest"
import { processStageLayout } from "./processPhysics"
import { processVolumePolygons } from "./processVolumeGeometry"

describe("processVolumePolygons", () => {
  it("shares bowtie endpoints with the physical process boundaries", () => {
    const layout = processStageLayout({
      width: 700,
      height: 320,
      shape: "bowtie",
      stages: [{ id: "in" }, { id: "impact" }, { id: "out" }],
      centerStageIndex: 1,
      idPrefix: "adaptive"
    })

    const polygons = processVolumePolygons(layout)
    expect(polygons.map((polygon) => polygon.role)).toEqual([
      "incoming",
      "center",
      "outgoing"
    ])
    expect(polygons[0].points[1]).toEqual([
      layout.centerLeft,
      layout.pinchTop
    ])
    expect(polygons[1].points).toEqual([
      [layout.centerLeft, layout.pinchTop],
      [layout.centerRight, layout.pinchTop],
      [layout.centerRight, layout.pinchBottom],
      [layout.centerLeft, layout.pinchBottom]
    ])
    expect(polygons[2].points[3]).toEqual([
      layout.centerRight,
      layout.pinchBottom
    ])

    const centerTop = layout.colliders.find(
      (collider) => collider.id === "adaptive-center-top"
    )
    expect(centerTop?.shape).toMatchObject({
      type: "segment",
      x1: layout.centerLeft,
      y1: layout.pinchTop,
      x2: layout.centerRight,
      y2: layout.pinchTop
    })
  })

  it("returns one boundary polygon for lane and funnel volumes", () => {
    const stages = [{ id: "one" }, { id: "two" }]
    const lane = processStageLayout({
      width: 400,
      height: 220,
      shape: "lane",
      stages
    })
    const funnel = processStageLayout({
      width: 400,
      height: 220,
      shape: "funnel",
      stages
    })

    expect(processVolumePolygons(lane)).toEqual([
      {
        id: "volume",
        role: "volume",
        points: [
          [lane.left, lane.topY],
          [lane.right, lane.topY],
          [lane.right, lane.bottomY],
          [lane.left, lane.bottomY]
        ]
      }
    ])
    expect(processVolumePolygons(funnel)[0].points).toEqual([
      [funnel.left, funnel.topY],
      [funnel.right, funnel.pinchTop],
      [funnel.right, funnel.pinchBottom],
      [funnel.left, funnel.bottomY]
    ])
  })
})
