import { expect, test } from "@playwright/test"

test.describe("talk demos stay browser-local and deterministic", () => {
  test("runs the hardened beats while every external request is blocked", async ({
    page,
  }, testInfo) => {
    const configuredBaseURL = testInfo.project.use.baseURL
    if (typeof configuredBaseURL !== "string") {
      throw new Error("The talk-demo suite requires a configured baseURL")
    }

    const localURL = new URL(configuredBaseURL)
    const localOrigin = localURL.origin
    const externalRequests: string[] = []
    const externalSockets: string[] = []
    const pageErrors: string[] = []

    page.on("pageerror", (error) => pageErrors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text())
    })
    await page.routeWebSocket(/.*/, (socket) => {
      const url = new URL(socket.url())
      if (url.hostname === localURL.hostname && url.port === localURL.port) {
        socket.connectToServer()
        return
      }
      externalSockets.push(url.href)
      socket.close({ code: 1008, reason: "External socket blocked by talk-demo contract" })
    })
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url())
      if (
        url.protocol === "data:" ||
        url.protocol === "blob:" ||
        url.origin === localOrigin
      ) {
        await route.continue()
        return
      }
      externalRequests.push(url.href)
      if (url.hostname === "fonts.googleapis.com") {
        await route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "/* offline talk-demo font fallback */",
        })
        return
      }
      await route.abort("blockedbyclient")
    })

    await page.goto("/interoperability/generative-ui", {
      waitUntil: "domcontentloaded",
    })
    await expect(page.getByRole("heading", { name: "Generative-UI Trust Layer" })).toBeVisible()
    await page.getByRole("button", { name: "Missing a required prop" }).click()
    await expect(page.getByText("blocked · do not paint")).toBeVisible()
    await page.getByRole("button", { name: "Wrong chart for the data" }).click()
    await expect(page.getByText("blocked · do not paint")).toBeVisible()
    await page.getByRole("button", { name: "An invented component" }).click()
    await expect(page.getByText("blocked · do not paint")).toBeVisible()
    await page.getByRole("button", { name: "A valid bar chart" }).click()
    await expect(page.getByText("ok · safe to render")).toBeVisible()

    await page.goto("/intelligence/variant-discovery", {
      waitUntil: "domcontentloaded",
    })
    const variantFixture = page.locator("[data-demo-variant-source]")
    await expect(variantFixture).toHaveAttribute("data-demo-variant-source", "model")
    await page.getByRole("button", { name: "Render proposed RidgelinePlot" }).click()
    await expect(page.getByRole("button", { name: "Show BoxPlot baseline" })).toBeVisible()

    await page.goto("/intelligence/conversation-arc", {
      waitUntil: "domcontentloaded",
    })
    await page.getByRole("button", { name: "Replay fixture" }).click()
    await expect(page.getByText(/Loaded 14 events from .*conference-arc\.json/)).toBeVisible()
    await expect(page.getByText("proposal-refused · 1").first()).toBeVisible()
    await expect(page.getByText("render-evidence · 2").first()).toBeVisible()

    await page.goto("/intelligence/temporal-lifecycle", {
      waitUntil: "domcontentloaded",
    })
    await page.getByRole("button", { name: "Reset fixture" }).click()
    const freshness = page.locator("[data-demo-freshness]")
    const renderedAnnotation = page.locator(
      '[data-demo="stale-note-stream"] g.annotation'
    )
    await expect(freshness).toHaveAttribute("data-demo-freshness", "fresh")
    await expect(renderedAnnotation).toHaveCount(1)
    const advance = page.getByRole("button", { name: "Advance one tick" })
    await advance.click()
    await advance.click()
    await expect(freshness).toHaveAttribute("data-demo-freshness", "aging")
    await expect(renderedAnnotation).toHaveAttribute("opacity", "0.55")
    await advance.click()
    await expect(freshness).toHaveAttribute("data-demo-freshness", "stale")
    await expect(renderedAnnotation).toHaveAttribute("opacity", "0.35")
    await expect(renderedAnnotation).toHaveAttribute("stroke-dasharray", "4 4")
    await advance.click()
    await advance.click()
    await advance.click()
    await expect(freshness).toHaveAttribute("data-demo-freshness", "expired")
    await expect(renderedAnnotation).toHaveCount(0)

    await page.goto("/intelligence/reader-grounding", {
      waitUntil: "domcontentloaded",
    })
    await expect(page.getByRole("heading", { name: "Agent-Reader Grounding" })).toBeVisible()
    await page.getByRole("button", { name: "Error rate (alerting)" }).click()
    await expect(page.getByText("intent · alerting")).toBeVisible()
    await expect(page.getByText(/grounding\.text/).first()).toBeVisible()

    await page.goto("/intelligence/conference-demo", {
      waitUntil: "domcontentloaded",
    })
    await expect(
      page.getByRole("heading", {
        name: "From a Question to a Chart You Can Defend",
        exact: true,
      })
    ).toBeVisible()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 350,
      downloadThroughput: 750_000,
      uploadThroughput: 250_000,
    })
    const stage = page.locator('[data-demo="conference-stage"]')
    await expect(stage).toHaveAttribute("data-demo", "conference-stage")

    // Load the only lazy demo chunk under throttling, then prove the complete
    // decision arc still runs after the browser is taken fully offline.
    await stage.getByRole("button", { name: /Keep the custom-chart exit/ }).click()
    await expect(stage.getByRole("button", { name: /Morph to snapshot/ })).toBeVisible()
    await stage.getByRole("button", { name: /Question → candidates/ }).click()
    await page.context().setOffline(true)

    await stage.getByRole("button", { name: "Choose BoxPlot baseline" }).click()

    await stage.getByRole("button", { name: /Refuse the bad proposal/ }).click()
    await stage.getByRole("button", { name: "Run deterministic refusal" }).click()
    await expect(stage.getByText("blocked · do not paint")).toBeVisible()
    await expect(stage.getByText("DEGENERATE_EXTENT", { exact: true })).toBeVisible()

    await stage.getByRole("button", { name: /Declare production reality/ }).click()
    await stage.getByRole("button", { name: "Apply production declaration" }).click()
    await expect(stage.getByText("scale decision recorded")).toBeVisible()

    await stage.getByRole("button", { name: /Name the reader/ }).click()
    await stage.getByRole("button", { name: "Target this reader" }).click()
    await expect(stage.getByText("audience applied")).toBeVisible()

    await stage.getByRole("button", { name: /Reveal the second mode/ }).click()
    await stage.getByRole("button", { name: "Render proposed RidgelinePlot" }).click()
    await expect(stage.getByText("variant admitted")).toBeVisible()

    await stage.getByRole("button", { name: /Keep the custom-chart exit/ }).click()
    await expect(stage.getByRole("button", { name: /Morph to snapshot/ })).toBeVisible()

    await stage.getByRole("button", { name: /Attach render evidence/ }).click()
    await stage.getByRole("button", { name: "Attach proof to live arc" }).click()
    await expect(stage.getByText("proof attached")).toBeVisible()

    await stage.getByRole("button", { name: /Ground the reader/ }).click()
    await stage.getByRole("button", { name: "Inspect grounding replay" }).click()
    await expect(stage.getByText("offline-grounding-replay · pixelsSeen: false")).toBeVisible()
    await expect(stage.getByText(/Ingest and export each split/)).toBeVisible()

    await stage.getByRole("button", { name: /Export defensible JSX/ }).click()
    await stage.getByRole("button", { name: "Mark JSX exported" }).click()
    await expect(stage.getByText("handoff recorded")).toBeVisible()
    await expect(stage.getByText(/Recovery is the typed, Playwright-recorded/)).toBeVisible()

    await page.context().setOffline(false)
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
    await cdp.send("Network.disable")

    for (const [route, heading] of [
      ["/choose", "Choose a Chart"],
      ["/intelligence/suggestions", "Chart Suggestions"],
      ["/intelligence/scale", "Scale-Aware Suggestions"],
      ["/recipes/kstreams", "Kafka Streams Topology"],
      ["/server/chart-clinic", "Chart Clinic (Beta)"],
      ["/intelligence/serialization", "Chart State Serialization"],
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" })
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible()
    }

    // The docs shell still advertises an optional Google Fonts stylesheet.
    // Fulfill it with empty local CSS so the system-font fallback is part of
    // the proof without accepting a network request or a browser console error.
    expect(
      externalRequests.filter(
        (href) => new URL(href).hostname !== "fonts.googleapis.com"
      )
    ).toEqual([])
    expect(externalSockets).toEqual([])
    expect(pageErrors).toEqual([])
  })
})
