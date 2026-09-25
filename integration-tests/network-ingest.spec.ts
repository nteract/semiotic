import { expect, test } from "@playwright/test"
import type { StreamNetworkFrameHandle } from "../src/components/stream/networkFrameHandleTypes"

declare global {
  interface Window {
    networkIngestRef: { current: StreamNetworkFrameHandle }
  }
}

test("pushed network preserves accessors, values and tooltip identity", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/network-examples/?network-ingest")
  const frame = page.locator(".stream-network-frame")
  const tooltip = frame.locator(".stream-network-tooltip")
  const readTargets = () =>
    page.evaluate(() => {
      const { nodes, edges } = window.networkIngestRef.current.getTopology()
      const edge = edges[0]
      const source = nodes.find((node) => node.id === "0")!
      const target = nodes.find((node) => node.id === "1")!
      return {
        ids: nodes.map((node) => node.id),
        value: edge.value,
        payload: edge.data,
        source: { x: source.x, y: source.y },
        edge: { x: (source.x1 + target.x0) / 2, y: (edge.y0 + edge.y1) / 2 }
      }
    })
  await expect
    .poll(() =>
      page.evaluate(
        () => window.networkIngestRef?.current?.getTopology().edges.length
      )
    )
    .toBe(1)
  const hover = async (point: { x: number; y: number }, text: string) => {
    await frame.hover({ position: { x: 20 + point.x, y: 20 + point.y } })
    await expect(tooltip).toContainText(text)
    const bounds = (await frame.boundingBox())!
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
  }
  for (const resized of [false, true]) {
    if (resized)
      await page.getByRole("button", { name: "Resize pushed graph" }).click()
    const targets = await readTargets()
    expect(targets.ids).toEqual(["0", "1"])
    expect(targets.value).toBe(5)
    expect(targets.payload).toMatchObject({
      from: 0,
      to: 1,
      key: "flow",
      category: "edge-only",
      label: "latest row"
    })
    await hover(targets.source, "Total: 5")
    await expect(tooltip).not.toContainText("edge-only")
    await hover(targets.edge, "Value: 5")
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
  }
  await frame.focus()
  await frame.press("Home")
  await frame.press("End")
  await expect(tooltip).toContainText("Total: 5")
  const readFocusedNode = () =>
    page.evaluate(
      () =>
        window.networkIngestRef.current
          .getTopology()
          .nodes.find((node) => node.id === "1")!.x
    )
  const previousX = await readFocusedNode()
  // Resize without moving the pointer or pressing another navigation key.
  await page
    .getByRole("button", { name: "Resize pushed graph" })
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect.poll(readFocusedNode).not.toBe(previousX)
  const focusedX = await readFocusedNode()
  const ring = frame.locator('rect[stroke-dasharray="4,2"]')
  await expect
    .poll(() =>
      ring.evaluate(
        (element) =>
          Number(element.getAttribute("x")) +
          Number(element.getAttribute("width")) / 2
      )
    )
    .toBeCloseTo(20 + focusedX)
  await expect(tooltip).toContainText("Total: 5")
  const targets = await readTargets()
  await hover(targets.edge, "Value: 5")
  await expect(ring).toHaveCount(0)
  // Remove without moving the pointer: the currently visible edge tooltip
  // must disappear when its retained raw ID removes that edge.
  expect(
    await page.evaluate(() =>
      window.networkIngestRef.current.removeEdge("flow")
    )
  ).toBe(true)
  await expect(tooltip).toHaveCount(0)
  expect(
    await page.evaluate(
      () => window.networkIngestRef.current.getTopology().edges.length
    )
  ).toBe(0)
  expect(errors).toEqual([])
})
