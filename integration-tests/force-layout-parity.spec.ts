import { expect, test } from "@playwright/test"

test("force worker and sync keep equivalent geometry, spacing and hover after radius/size updates", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const workers: string[] = []
  page.on("worker", (worker) => workers.push(worker.url()))
  await page.goto("/network-examples/?force-layout-parity")
  const readGeometry = () => page.evaluate(() => {
    const frames = (window as unknown as { forceFrames: Record<string, { current: {
      getTopology(): { nodes: Array<{ id: string; x: number; y: number }> }
    } }> }).forceFrames
    return Object.fromEntries(Object.entries(frames).map(([key, ref]) => [key,
      ref.current.getTopology().nodes.map(({ id, x, y }) => ({ id, x, y })),
    ]))
  })
  const checkGeometryAndHover = async (radius: number, width: number) => {
    for (const execution of ["worker", "sync"]) {
      const status = page.getByTestId(`force-${execution}`).getByRole("status")
      await expect(status).toHaveAttribute("data-layout-inputs", `${radius}:${width}`)
      await expect(status).toHaveText(`${execution}: ready`)
    }
    const geometry = await readGeometry()
    expect(geometry.worker).toEqual(geometry.sync)
    for (let i = 0; i < geometry.sync.length; i++) {
      for (let j = i + 1; j < geometry.sync.length; j++) {
        const a = geometry.sync[i], b = geometry.sync[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * radius - 1)
      }
    }
    for (const execution of ["sync", "worker"]) {
      const frame = page.getByTestId(`force-${execution}`).locator(".stream-network-frame")
      await frame.scrollIntoViewIfNeeded()
      const bounds = (await frame.boundingBox())!
      const point = geometry[execution][0]
      await frame.hover({ position: { x: 20 + point.x + radius - 1, y: 20 + point.y } })
      const tooltip = frame.locator(".stream-network-tooltip")
      await expect(tooltip).toContainText(point.id)
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
    return geometry.sync
  }

  const original = await checkGeometryAndHover(4, 600)
  expect(workers.some((url) => url.includes("forceLayoutWorker"))).toBe(true)
  await page.getByRole("button", { name: "Enlarge nodes" }).click()
  const enlarged = await checkGeometryAndHover(20, 600)
  expect(enlarged).not.toEqual(original)
  await page.getByRole("button", { name: "Narrow graphs" }).click()
  const resized = await checkGeometryAndHover(20, 420)
  expect(resized).not.toEqual(enlarged)
  expect(errors).toEqual([])
})
