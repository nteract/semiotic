import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const moduleURL = `/@fs/${process.cwd()}/src/components/semiotic-wordcloud.ts`
const shapesURL = `/@fs/${process.cwd()}/docs/src/pages/examples/word-cloud/shapes.ts`

test("invalid, empty and unreadable masks fail descriptively; oversized words are omitted", async ({
  page
}) => {
  await page.goto("/examples/word-cloud")
  const results = await page.evaluate(async (moduleURL) => {
    const { prepareWordCloudLayout } = await import(
      /* @vite-ignore */ moduleURL
    )
    const base = { data: [{ text: "care", value: 1 }], width: 200, height: 200 }
    const codes = []
    for (const mask of [
      { type: "svgPath", path: "M0 0H1V1Z", viewBox: [0, 0, 0, 0] },
      { type: "svgPath", path: "M0 0", viewBox: [0, 0, 200, 200] },
      {
        type: "svgPath",
        path: "M0 0H200V200H0Z",
        viewBox: [0, 0, 200, 200],
        mode: "outside"
      },
      { type: "image", src: "data:image/png;base64,broken" }
    ]) {
      try {
        await prepareWordCloudLayout({ ...base, mask })
        codes.push("unexpected success")
      } catch (error) {
        codes.push(error.code)
      }
    }
    const taintedCanvas = () => {
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d")!
      ctx.getImageData = () => {
        throw new DOMException("Tainted Canvas", "SecurityError")
      }
      return canvas
    }
    try {
      await prepareWordCloudLayout(
        {
          ...base,
          mask: {
            type: "svgPath",
            path: "M0 0H100V100H0Z",
            viewBox: [0, 0, 200, 200]
          }
        },
        { canvas: taintedCanvas }
      )
    } catch (error) {
      codes.push(error.code)
    }
    const crowded = await prepareWordCloudLayout({
      ...base,
      width: 20,
      height: 20,
      fontSizeRange: [100, 100]
    })
    return { codes, words: crowded.words, omitted: crowded.omitted }
  }, moduleURL)
  expect(results.codes).toEqual([
    "INVALID_MASK",
    "INVALID_MASK",
    "INVALID_MASK",
    "MASK_LOAD",
    "MASK_LOAD"
  ])
  expect(results.words).toEqual([])
  expect(results.omitted).toEqual([
    { id: "care", sourceIndex: 0, reason: "no-space" }
  ])
})

test("browser Canvas, browser SVG and server PNG retain the same bundled-font ink", async ({
  page
}) => {
  await page.goto("/examples/word-cloud")
  await ready(page)
  const prepared = await page.evaluate(async (moduleURL) => {
    const { prepareWordCloudLayout } = await import(
      /* @vite-ignore */ moduleURL
    )
    const options = {
      data: [
        { text: "care", value: 12 },
        { text: "trust", value: 8 },
        { text: "wonder", value: 3 }
      ],
      width: 320,
      height: 200,
      fontFamily: "Crimson Text",
      fontSizeRange: [12, 36],
      seed: 42
    }
    const layout = await prepareWordCloudLayout(options)
    const canvas = document.createElement("canvas")
    canvas.width = 320
    canvas.height = 200
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, 320, 200)
    ctx.fillStyle = "#333"
    for (const word of layout.words) {
      ctx.save()
      ctx.translate(word.x + 160, word.y + 100)
      ctx.rotate((word.rotate * Math.PI) / 180)
      ctx.font = `${word.fontStyle} ${word.fontWeight} ${word.fontSize}px ${word.fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "alphabetic"
      ctx.fillText(word.text, 0, 0)
      ctx.restore()
    }
    return { options, layout, png: canvas.toDataURL() }
  }, moduleURL)
  const directory = await mkdtemp(join(tmpdir(), "semiotic-wordcloud-parity-"))
  try {
    const input = join(directory, "input.json"),
      output = join(directory, "server"),
      fonts = join(directory, "fonts.conf")
    await writeFile(input, JSON.stringify(prepared))
    const fontDirectory = `${process.cwd()}/docs/public/fonts/wordcloud`
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
    await writeFile(
      fonts,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${fontDirectory}</dir><cachedir>${directory}/font-cache</cachedir></fontconfig>`
    )
    await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "scripts/wordcloud/render-parity.ts", input, output],
      {
        env: {
          ...process.env,
          FONTCONFIG_FILE: fonts,
          PANGOCAIRO_BACKEND: "fc"
        },
        timeout: 30_000
      }
    )
    const svg = await readFile(`${output}.svg`, "utf8")
    const evidence = JSON.parse(await readFile(`${output}.json`, "utf8"))
    expect(evidence.markCountByType).toEqual({ text: 3 })
    expect(evidence.wordCloud.placedCount).toBe(3)
    const fontBase64 = (
      await readFile("docs/public/fonts/wordcloud/CrimsonText-Regular.ttf")
    ).toString("base64")
    const withFont = svg.replace(
      /(<svg\b[^>]*>)/,
      `$1<style>@font-face{font-family:'Crimson Text';src:url(data:font/ttf;base64,${fontBase64})}</style>`
    )
    const result = await page.evaluate(
      async ({ canvasPNG, svg, serverPNG }) => {
        async function ink(src: string) {
          const image = new Image()
          image.src = src
          await image.decode()
          const canvas = document.createElement("canvas")
          canvas.width = 320
          canvas.height = 200
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(image, 0, 0)
          const rgba = ctx.getImageData(0, 0, 320, 200).data
          return Array.from(
            { length: 320 * 200 },
            (_, i) => rgba[i * 4 + 3] > 128 && rgba[i * 4] < 160
          )
        }
        const a = await ink(canvasPNG),
          b = await ink(`data:image/svg+xml;base64,${btoa(svg)}`),
          c = await ink(serverPNG)
        const overlap = (other: boolean[]) => {
          let intersection = 0,
            union = 0
          a.forEach((value, i) => {
            if (value && other[i]) intersection++
            if (value || other[i]) union++
          })
          return { intersection, ratio: intersection / union }
        }
        const withinPixel = (source: boolean[], target: boolean[]) => {
          let matched = 0,
            count = 0
          source.forEach((value, i) => {
            if (!value) return
            count++
            const x = i % 320,
              y = Math.floor(i / 320)
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (
                  x + dx >= 0 &&
                  x + dx < 320 &&
                  y + dy >= 0 &&
                  y + dy < 200 &&
                  target[(y + dy) * 320 + x + dx]
                ) {
                  matched++
                  return
                }
              }
            }
          })
          return matched / count
        }
        const wrongFont = await ink(
          `data:image/svg+xml;base64,${btoa(svg.replaceAll('font-family="Crimson Text"', 'font-family="monospace"'))}`
        )
        const shifted = c.map((_, i) => i % 320 >= 3 && c[i - 3])
        return {
          svg: overlap(b),
          png: overlap(c),
          browserCoverage: withinPixel(a, c),
          serverCoverage: withinPixel(c, a),
          wrongFontCoverage: withinPixel(a, wrongFont),
          shiftedCoverage: withinPixel(a, shifted)
        }
      },
      {
        canvasPNG: prepared.png,
        svg: withFont,
        serverPNG: `data:image/png;base64,${(await readFile(`${output}.png`)).toString("base64")}`
      }
    )
    await test.info().attach("wordcloud-server", {
      body: await readFile(`${output}.png`),
      contentType: "image/png"
    })
    await test.info().attach("wordcloud-browser", {
      body: Buffer.from(prepared.png.split(",")[1], "base64"),
      contentType: "image/png"
    })
    expect(result.svg.intersection).toBeGreaterThan(500)
    expect(result.svg.ratio).toBeGreaterThan(0.95)
    // CoreText/WebKit and FreeType/Pango threshold edges differently: raw IoU
    // is 0.748 despite every ink pixel matching within one physical pixel.
    // Require 99% coverage in BOTH directions, and prove that this metric
    // rejects a substituted font and a three-pixel placement shift.
    expect(result.png.intersection).toBeGreaterThan(500)
    expect(result.browserCoverage).toBeGreaterThan(0.99)
    expect(result.serverCoverage).toBeGreaterThan(0.99)
    expect(result.wrongFontCoverage).toBeLessThan(0.9)
    expect(result.shiftedCoverage).toBeLessThan(0.9)
    await test.info().attach("raster-parity-metrics", {
      body: JSON.stringify(result),
      contentType: "application/json"
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

async function ready(page: Page) {
  await expect(page.locator("[data-wordcloud-state]")).toHaveAttribute(
    "data-wordcloud-state",
    "ready"
  )
  await expect(page.locator("[data-wordcloud-state]")).not.toHaveAttribute(
    "data-placed-count",
    "0"
  )
}

test("shaped reading exposes original values through marks, keyboard, omissions and exports", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/word-cloud")
  await ready(page)
  const alice = page.locator('g[role="button"][data-word-id="alice"]')
  const rect = alice.locator("rect")
  await rect.hover({ force: true })
  const tooltip = page.locator(".stream-wordcloud-tooltip")
  await expect(tooltip).toContainText("397 occurrences")
  await expect(tooltip).toContainText("Characters")
  const tooltipBox = (await tooltip.boundingBox())!
  expect(tooltipBox.x).toBeGreaterThanOrEqual(0)
  expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  await page.mouse.move(0, 0)
  await expect(tooltip).not.toBeVisible()
  await alice.focus()
  await expect(tooltip).toContainText("397 occurrences")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(page.getByLabel("Selected word passage")).toContainText("queen")
  await page.keyboard.press("Escape")
  await expect(tooltip).not.toBeVisible()
  const before = await page
    .locator('g[role="button"][data-word-id]')
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        node.getAttribute("data-word-id"),
        node.getAttribute("data-word-x"),
        node.getAttribute("data-word-y")
      ])
    )
  await page.getByLabel("Word cloud renderer").selectOption("canvas")
  await ready(page)
  await expect(page.locator(".stream-wordcloud-frame canvas")).toBeVisible()
  await rect.hover({ force: true })
  await expect(tooltip).toContainText("397 occurrences")
  expect(
    await page
      .locator('g[role="button"][data-word-id]')
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("data-word-id"),
          node.getAttribute("data-word-x"),
          node.getAttribute("data-word-y")
        ])
      )
  ).toEqual(before)
  await page.getByLabel("Word cloud renderer").selectOption("svg")
  const downloadPromise = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Placement JSON", exact: true })
    .click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  const exported = JSON.parse(Buffer.concat(chunks).toString())
  expect(
    exported.props.layout.words.length + exported.props.layout.omitted.length
  ).toBe(120)
  expect(
    exported.props.layout.words.find(
      (word: { id: string }) => word.id === "alice"
    ).value
  ).toBe(397)
  expect(exported.props.data).toHaveLength(120)
  for (const format of ["SVG", "PNG"]) {
    const nextDownload = page.waitForEvent("download")
    await page.getByRole("button", { name: format, exact: true }).click()
    const stream = await (await nextDownload).createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    const body = Buffer.concat(chunks)
    if (format === "SVG") {
      expect(body.toString()).toContain("data:font/ttf;base64,")
      expect(body.toString()).toContain("SIL OPEN FONT LICENSE")
      expect(body.toString()).toContain('data-word-id="alice"')
      expect(body.toString()).not.toContain('role="button"')
    } else {
      expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
      expect(body.readUInt32BE(16)).toBe(exported.props.width * 2)
      expect(body.readUInt32BE(20)).toBe(exported.props.height * 2)
    }
  }
  await page.getByLabel("Cloud shape").selectOption("ring")
  await page.getByLabel("Term count").selectOption("300")
  await ready(page)
  await page.getByLabel("Only omitted terms", { exact: false }).check()
  await expect(
    page.getByTestId("ranked-words").locator("li").first()
  ).toContainText("Omitted")
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page)
  await expect
    .poll(async () =>
      page.locator(".stream-wordcloud-frame svg").getAttribute("width")
    )
    .not.toBe(String(exported.props.width))
  await page.locator('g[role="button"][data-word-id]').first().focus()
  await expect(tooltip).toBeVisible()
  const mobileBox = (await tooltip.boundingBox())!
  expect(mobileBox.x).toBeGreaterThanOrEqual(0)
  expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(391)
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await expect(
    page.locator(".stream-wordcloud-frame text[data-word-id]").first()
  ).toHaveAttribute("fill", "CanvasText")
  await page.keyboard.press("Escape")
  await expect(tooltip).not.toBeVisible()
  expect(errors).toEqual([])
})

test("real raster placements are deterministic and respect holes, concavities, islands, portraits and corridors", async ({
  page
}) => {
  await page.goto("/examples/word-cloud")
  const results = await page.evaluate(
    async ({ moduleURL, shapesURL }) => {
      const { prepareWordCloudLayout, validateWordCloudLayout } = await import(
        /* @vite-ignore */ moduleURL
      )
      const { cloudMask } = await import(/* @vite-ignore */ shapesURL)
      const data = Array.from({ length: 100 }, (_, i) => ({
        text: `term${i}`,
        value: 100 - i
      }))
      const base = {
        data,
        width: 600,
        height: 400,
        seed: 71,
        fontFamily: "Crimson Text",
        fontSizeRange: [7, 24],
        rotate: "orthogonal",
        padding: 1
      }
      const unmasked = await prepareWordCloudLayout(base)
      validateWordCloudLayout(base, JSON.parse(JSON.stringify(unmasked)))
      const checks = []
      for (const shape of [
        "heart",
        "ring",
        "crescent",
        "islands",
        "portrait",
        "corridor"
      ]) {
        for (const mode of ["inside", "outside"]) {
          const mask = cloudMask(shape, mode)
          const options = { ...base, width: 400, mask }
          const layout = await prepareWordCloudLayout(options)
          validateWordCloudLayout(options, layout)
          const repeated = await prepareWordCloudLayout(options)
          const canvas = document.createElement("canvas")
          canvas.width = canvas.height = 400
          const ctx = canvas.getContext("2d")!
          ctx.scale(2, 2)
          ctx.fill(new Path2D(mask.path), mask.fillRule)
          const shapePixels = ctx.getImageData(0, 0, 400, 400).data
          const occupied = new Uint8Array(400 * 400)
          let outside = 0,
            overlaps = 0,
            ink = 0
          for (const word of layout.words) {
            ctx.resetTransform()
            ctx.clearRect(0, 0, 400, 400)
            ctx.save()
            ctx.translate(word.x + 200, word.y + 200)
            ctx.rotate((word.rotate * Math.PI) / 180)
            ctx.font = `${word.fontStyle} ${word.fontWeight} ${word.fontSize}px ${word.fontFamily}`
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"
            ctx.fillText(word.text, 0, 0)
            ctx.restore()
            const pixels = ctx.getImageData(0, 0, 400, 400).data
            for (let i = 0; i < occupied.length; i++) {
              if (pixels[i * 4 + 3] < 128) continue
              ink++
              const inside = shapePixels[i * 4 + 3] >= 128
              if (mode === "inside" ? !inside : inside) outside++
              if (occupied[i]) overlaps++
              occupied[i] = 1
            }
          }
          checks.push({
            shape,
            mode,
            placed: layout.words.length,
            total: layout.words.length + layout.omitted.length,
            outside,
            overlaps,
            ink,
            stable: JSON.stringify(layout) === JSON.stringify(repeated)
          })
        }
      }
      // Image-alpha masks use the same containment contract as path masks.
      const image = document.createElement("canvas")
      image.width = image.height = 200
      const imageCtx = image.getContext("2d")!
      imageCtx.fillRect(20, 20, 160, 160)
      imageCtx.clearRect(70, 70, 60, 60)
      const imageOptions = {
        ...base,
        width: 401,
        height: 301,
        mask: { type: "image", src: image.toDataURL() }
      }
      const imageLayout = await prepareWordCloudLayout(imageOptions)
      validateWordCloudLayout(imageOptions, imageLayout)
      const smallOptions = {
        data: [
          { text: "care", value: 12 },
          { text: "trust", value: 8 },
          { text: "wonder", value: 3 }
        ],
        width: 320,
        height: 200,
        fontFamily: "Crimson Text",
        fontSizeRange: [12, 36],
        seed: 42
      }
      const fixture = {
        options: smallOptions,
        layout: await prepareWordCloudLayout(smallOptions)
      }
      return {
        unmasked: unmasked.words.length,
        checks,
        imageCount: imageLayout.words.length,
        imageResolution: imageLayout.maskResolution,
        fixture
      }
    },
    { moduleURL, shapesURL }
  )
  expect(results.unmasked).toBe(100)
  for (const check of results.checks) {
    expect(check.total, `${check.shape} ${check.mode}`).toBe(100)
    expect(check.placed, `${check.shape} ${check.mode}`).toBeGreaterThan(0)
    expect(check.ink).toBeGreaterThan(0)
    expect(check.stable).toBe(true)
    expect(check.outside, `${check.shape} ${check.mode} outside`).toBe(0)
    expect(check.overlaps, `${check.shape} ${check.mode} collisions`).toBe(0)
  }
  expect(results.imageCount).toBeGreaterThan(0)
  expect(results.imageResolution).toEqual([402, 302])
  // Opt-in fixture refresh retains actual engine output for Canvas-free SSR tests.
  if (process.env.UPDATE_WORDCLOUD_FIXTURE)
    await writeFile(
      "src/components/wordcloud/wordCloud.fixture.json",
      `${JSON.stringify(results.fixture, null, 2)}\n`
    )
})
