import { describe, expect, it } from "vitest"
import * as root from "../semiotic"
import * as xy from "../semiotic-xy"
import * as ordinal from "../semiotic-ordinal"
import * as network from "../semiotic-network"
import * as geo from "../semiotic-geo"
import * as realtime from "../semiotic-realtime"
import * as physics from "../semiotic-physics"
import * as utils from "../semiotic-utils-core"
import type { MultiTooltipConfig as OrdinalMultiTooltipConfig } from "../semiotic-ordinal"
import type { MultiTooltipConfig as NetworkMultiTooltipConfig } from "../semiotic-network"
import type { MultiTooltipConfig as GeoMultiTooltipConfig } from "../semiotic-geo"
import type { MultiTooltipConfig as PhysicsMultiTooltipConfig } from "../semiotic-physics"

describe("tooltip public entry points", () => {
  it.each([
    ["root", root],
    ["xy", xy],
    ["ordinal", ordinal],
    ["network", network],
    ["geo", geo],
    ["realtime", realtime],
    ["physics", physics],
  ])("exports the custom chrome primitive from %s", (_name, entry) => {
    expect(entry.TooltipRoot).toBeTypeOf("function")
    expect(entry.Tooltip).toBeTypeOf("function")
    expect(entry.markTooltipChrome).toBeTypeOf("function")
  })

  it("exports normalization and ownership helpers from the utility subpath", () => {
    expect(utils.normalizeTooltip).toBeTypeOf("function")
    expect(utils.resolveTooltipContent).toBeTypeOf("function")
    expect(utils.resolveMultiCapableTooltip).toBeTypeOf("function")
    expect(utils.hasOwnTooltipChrome).toBeTypeOf("function")
  })

  it("exposes the named multi-tooltip config type from every chart-family subpath", () => {
    const configs: [
      OrdinalMultiTooltipConfig,
      NetworkMultiTooltipConfig,
      GeoMultiTooltipConfig,
      PhysicsMultiTooltipConfig,
    ] = [
      { mode: "multi" },
      { mode: "multi" },
      { mode: "multi" },
      { mode: "multi" },
    ]

    expect(configs.every((config) => config.mode === "multi")).toBe(true)
  })
})
