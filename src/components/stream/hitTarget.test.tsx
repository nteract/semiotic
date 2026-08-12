import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  geoAreaHitTarget,
  geoHitTarget,
  hitTargetPoint,
  hitTargetRect,
  networkEdgeHitTarget,
  networkHitTarget
} from "./hitTarget"
import {
  geoSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkSceneNodeToSVG,
  ordinalSceneNodeToSVG,
  xySceneNodeToSVG
} from "./SceneToSVG"

describe("custom-layout hit target cursors", () => {
  it("threads a presentation-only cursor through every helper", () => {
    const datum = { id: "datum" }
    const marks = [
      hitTargetPoint({ x: 1, y: 2, datum, cursor: "pointer" }),
      geoHitTarget({ x: 1, y: 2, datum, cursor: "pointer" }),
      geoAreaHitTarget({
        pathData: "M0,0L10,0L10,10Z",
        centroid: [5, 5],
        bounds: [[0, 0], [10, 10]],
        datum,
        cursor: "pointer"
      }),
      hitTargetRect({
        x: 1,
        y: 2,
        width: 10,
        height: 20,
        datum,
        cursor: "pointer"
      }),
      networkHitTarget({ x: 1, y: 2, datum, cursor: "pointer" }),
      networkHitTarget({
        x: 1,
        y: 2,
        width: 10,
        height: 20,
        datum,
        cursor: "pointer"
      }),
      networkEdgeHitTarget({
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        datum,
        cursor: "pointer"
      }),
      networkEdgeHitTarget({
        type: "curved",
        pathD: "M0,0Q5,10,10,0",
        datum,
        cursor: "pointer"
      })
    ]

    expect(marks.every(mark => mark.style.cursor === "pointer")).toBe(true)
    // Cursor authorship does not manufacture activation handlers or button
    // semantics; those remain owned by the frame interaction API.
    expect(marks.every(mark => !("onClick" in mark))).toBe(true)
  })

  it("reaches XY, ordinal, Geo, and network SVG/SSR conversion", () => {
    const datum = { id: "datum" }
    const html = renderToStaticMarkup(
      <svg>
        {xySceneNodeToSVG(
          hitTargetPoint({ x: 1, y: 2, datum, cursor: "pointer" }),
          0
        )}
        {ordinalSceneNodeToSVG(
          hitTargetRect({
            x: 1,
            y: 2,
            width: 10,
            height: 20,
            datum,
            cursor: "pointer"
          }),
          1
        )}
        {geoSceneNodeToSVG(
          geoHitTarget({ x: 1, y: 2, datum, cursor: "pointer" }),
          2
        )}
        {networkSceneNodeToSVG(
          networkHitTarget({ x: 1, y: 2, datum, cursor: "pointer" }),
          3
        )}
        {networkSceneEdgeToSVG(
          networkEdgeHitTarget({
            x1: 0,
            y1: 0,
            x2: 10,
            y2: 10,
            datum,
            cursor: "pointer"
          }),
          4
        )}
      </svg>
    )

    expect(html.match(/data-semiotic-mark-cursor="pointer"/g)).toHaveLength(5)
  })
})
