// @vitest-environment node

import { describe, expect, it } from "vitest"
import {
  createSemioticVACPBridge,
  installSemioticVACPBridge,
} from "./vacpAdapter"

describe("VACP server installation boundary", () => {
  it("refuses an implicit process-global installation", () => {
    const processGlobal = globalThis as Record<string, unknown>
    const previous = processGlobal.__vacp
    const bridge = createSemioticVACPBridge({
      appId: "server",
      charts: [],
    })

    const installation = installSemioticVACPBridge(bridge)

    expect(installation).toMatchObject({
      installed: false,
      globalKey: "__vacp",
      reason: expect.stringContaining("without a browser window"),
    })
    expect(processGlobal.__vacp).toBe(previous)
    expect(installation.cleanup()).toBe(false)
  })
})
