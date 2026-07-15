
import * as React from "react"
import type { StreamXYFrameProps } from "../components/stream/types"
import type { StreamOrdinalFrameProps } from "../components/stream/ordinalTypes"
import type { StreamNetworkFrameProps } from "../components/stream/networkTypes"

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
export function createFrameMock<TProps extends object>(className: string) {
  let lastProps: TProps | null = null

  const factory = () => ({
    __esModule: true,
    default: (props: TProps) => {
      lastProps = props
      return React.createElement("div", { className }, React.createElement("svg"))
    },
  })

  return {
    factory,
    getLastProps: () => {
      if (!lastProps) throw new Error(`No ${className} props have been captured`)
      return lastProps
    },
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
export const ordinalFrameMock = createFrameMock<StreamOrdinalFrameProps>("stream-ordinal-frame")

/**
 * Pre-built mock for StreamNetworkFrame.
 */
export const networkFrameMock = createFrameMock<StreamNetworkFrameProps>("stream-network-frame")

/**
 * Pre-built mock for StreamXYFrame.
 */
export const xyFrameMock = createFrameMock<StreamXYFrameProps>("stream-xy-frame")
