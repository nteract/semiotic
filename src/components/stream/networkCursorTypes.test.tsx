import type { CSSProperties } from "react"
import { describe, expectTypeOf, it } from "vitest"
import type { StreamNetworkFrameProps } from "./networkTypes"

type NodeStyle = NonNullable<StreamNetworkFrameProps["nodeStyle"]>
type EdgeStyle = NonNullable<StreamNetworkFrameProps["edgeStyle"]>

// Published 3.x callbacks returned arbitrary Datum objects. Keep even values
// that conflict with a newly typed paint key assignable in this minor release.
const legacyNodeStyle: NodeStyle = () => ({ fill: 123, pluginPaint: true })
const legacyEdgeStyle: EdgeStyle = () => ({ strokeWidth: "plugin-defined" })
const cursorNodeStyle: NodeStyle = () => ({ cursor: "pointer" })

// @ts-expect-error — cursor is a rendered CSS field, not arbitrary datum data.
const invalidCursorStyle: NodeStyle = () => ({ cursor: 123 })

describe("network cursor callback types", () => {
  it("types cursor as a CSS cursor while preserving permissive datum keys", () => {
    expectTypeOf<ReturnType<NodeStyle>["cursor"]>()
      .toEqualTypeOf<CSSProperties["cursor"]>()
    expectTypeOf<ReturnType<EdgeStyle>["cursor"]>()
      .toEqualTypeOf<CSSProperties["cursor"]>()
    expectTypeOf(legacyNodeStyle).toMatchTypeOf<NodeStyle>()
    expectTypeOf(legacyEdgeStyle).toMatchTypeOf<EdgeStyle>()
    expectTypeOf(cursorNodeStyle).toMatchTypeOf<NodeStyle>()
    expectTypeOf(invalidCursorStyle).toMatchTypeOf<NodeStyle>()
  })
})
