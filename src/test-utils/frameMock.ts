import { vi } from "vitest"
import * as React from "react"

/**
 * Creates a vi.mock factory for a Stream Frame module that captures
 * the props passed to the frame component.
 *
 * The mock renders a simple div with the appropriate CSS class and
 * an inner <svg /> element, matching the real frame's DOM structure.
 *
 * @param className - The CSS class the mock div should use
 *   (e.g., "stream-ordinal-frame", "stream-network-frame", "stream-xy-frame").
 * @returns An object with:
 *   - `factory` — the mock module factory to pass to `vi.mock(path, factory)`
 *   - `getLastProps()` — returns the most recent props passed to the frame
 *   - `reset()` — clears captured props (call in beforeEach)
 */
export function createFrameMock(className: string) {
  let lastProps: any = null

  const factory = () => ({
    __esModule: true,
    default: (props: any) => {
      lastProps = props
      return React.createElement("div", { className }, React.createElement("svg"))
    },
  })

  return {
    factory,
    getLastProps: () => lastProps,
    reset: () => {
      lastProps = null
    },
  }
}

/**
 * Pre-built mock for StreamOrdinalFrame.
 *
 * Usage:
 * ```ts
 * import { ordinalFrameMock } from "../../test-utils/frameMock"
 *
 * vi.mock("../../stream/StreamOrdinalFrame", ordinalFrameMock.factory)
 *
 * beforeEach(() => ordinalFrameMock.reset())
 *
 * it("passes correct props", () => {
 *   render(<BarChart data={data} />)
 *   expect(ordinalFrameMock.getLastProps().chartType).toBe("bar")
 * })
 * ```
 */
export const ordinalFrameMock = createFrameMock("stream-ordinal-frame")

/**
 * Pre-built mock for StreamNetworkFrame.
 */
export const networkFrameMock = createFrameMock("stream-network-frame")

/**
 * Pre-built mock for StreamXYFrame.
 */
export const xyFrameMock = createFrameMock("stream-xy-frame")
