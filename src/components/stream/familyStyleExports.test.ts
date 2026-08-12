import type { CSSProperties } from "react"
import { describe, expect, expectTypeOf, it } from "vitest"
import type {
  NetworkMarkStyle as RootNetworkMarkStyle,
  Style as RootStyle
} from "../semiotic"
import type { Style as GeoStyle } from "../semiotic-geo"
import type {
  NetworkMarkStyle,
  Style as NetworkStyle
} from "../semiotic-network"
import type { Style as OrdinalStyle } from "../semiotic-ordinal"
import type { Style as PhysicsStyle } from "../semiotic-physics"
import type { Style as RealtimeStyle } from "../semiotic-realtime"
import type { Style as XYStyle } from "../semiotic-xy"

type CSSCursor = CSSProperties["cursor"]

const familyStyles: [
  XYStyle,
  OrdinalStyle,
  NetworkStyle,
  GeoStyle,
  RealtimeStyle,
  PhysicsStyle
] = [
  { cursor: "crosshair" },
  { cursor: "pointer" },
  { cursor: "grab" },
  { cursor: "zoom-in" },
  { cursor: "cell" },
  { cursor: "wait" }
]

const networkMarkStyle: NetworkMarkStyle = {
  cursor: "pointer",
  pluginPaint: true
}

// @ts-expect-error — retained mark cursors use the CSS cursor value type.
const invalidFamilyStyle: XYStyle = { cursor: 123 }

describe("family entry Style exports", () => {
  it("exposes CSS cursor typing from every chart family", () => {
    expectTypeOf<XYStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<OrdinalStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<NetworkStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<GeoStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<RealtimeStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<PhysicsStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<NetworkMarkStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<RootStyle["cursor"]>().toEqualTypeOf<CSSCursor>()
    expectTypeOf<RootNetworkMarkStyle>().toEqualTypeOf<NetworkMarkStyle>()
    expectTypeOf(networkMarkStyle).toMatchTypeOf<NetworkMarkStyle>()
    expectTypeOf(invalidFamilyStyle).toMatchTypeOf<XYStyle>()
    expect(familyStyles).toHaveLength(6)
  })
})
