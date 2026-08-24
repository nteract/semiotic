import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"

function expectOrderedLayers(
  container: HTMLElement,
  solidSelector: string,
): void {
  const solid = container.querySelector(solidSelector)
  const custom = container.querySelector('[data-testid="custom-background"]')
  const marks = container.querySelector("canvas")

  expect(solid).toBeTruthy()
  expect(custom).toBeTruthy()
  expect(marks).toBeInstanceOf(HTMLCanvasElement)
  expect(
    solid!.compareDocumentPosition(custom!) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
  expect(
    custom!.compareDocumentPosition(marks!) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
}

describe("Stream Frame background composition", () => {
  let restoreCanvas: () => void

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    restoreCanvas()
  })

  it("composes XY solid background, graphics, then marks", () => {
    const { container } = render(
      <StreamXYFrame
        chartType="scatter"
        background="#112233"
        backgroundGraphics={<rect data-testid="custom-background" />}
      />
    )
    expectOrderedLayers(container, ".stream-frame-background__backdrop")
  })

  it("composes ordinal solid background, graphics, then marks", () => {
    const { container } = render(
      <StreamOrdinalFrame
        chartType="bar"
        background="#112233"
        backgroundGraphics={<rect data-testid="custom-background" />}
      />
    )
    expectOrderedLayers(container, ".semiotic-canvas-background--combined")
  })

  it("composes geo solid background, graphics, then marks", () => {
    const { container } = render(
      <StreamGeoFrame
        projection="equalEarth"
        background="#112233"
        backgroundGraphics={<rect data-testid="custom-background" />}
      />
    )
    expectOrderedLayers(container, ".stream-frame-background__backdrop")
  })

  it("composes network solid background, graphics, then marks", () => {
    const { container } = render(
      <StreamNetworkFrame
        chartType="sankey"
        nodes={[]}
        edges={[]}
        background="#112233"
        backgroundGraphics={<rect data-testid="custom-background" />}
      />
    )
    expectOrderedLayers(container, ".stream-frame-background__backdrop")
  })

  it("composes a custom network layout background below the canvas", async () => {
    const { container } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }]}
        edges={[]}
        customNetworkLayout={() => ({
          sceneNodes: [],
          backgrounds: <path data-testid="layout-background" d="M0,0 L10,0 L10,10 Z" />,
        })}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('[data-testid="layout-background"]')).toBeTruthy()
    })
    const background = container.querySelector('[data-testid="layout-background"]')!
    const canvas = container.querySelector("canvas")!
    expect(
      background.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
