import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"

// Exercise the published entry points after the normal integration build.
const requirePackage = createRequire(__filename)
const { renderChart, renderDashboard } = requirePackage("semiotic/server")
const { makeShade, withAlpha } = requirePackage("semiotic/recipes/core")
const data = [
  { x: 0, y: 2 },
  { x: 1, y: 5 }
]

test("default SVG identifiers remain distinct across ESM and CJS server entry points", async ({
  page
}) => {
  // Playwright transforms imports. Use Node's native loaders to exercise both
  // published formats in the same process, then inspect their combined SVG.
  const svgs: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
          import { createRequire } from "node:module"
          const require = createRequire(import.meta.url)
          const entries = ["semiotic/server", "semiotic/server/node", "semiotic/server/edge"]
          const modules = await Promise.all(entries.map(entry => import(entry)))
          const renderers = [
            ...entries.map(entry => require(entry).renderChart),
            ...modules.map(module => module.renderChart)
          ]
          const data = JSON.parse(process.argv[1])
          process.stdout.write(JSON.stringify(renderers.map((renderer, i) =>
            renderer("AreaChart", { data, title: "Entry " + i, gradientFill: true })
          )))
        `,
        JSON.stringify(data)
      ],
      { encoding: "utf8" }
    )
  )
  await page.setContent(`<main>${svgs.join("")}</main>`)
  const ids = await page
    .locator("[id]")
    .evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(new Set(ids).size).toBe(ids.length)
  for (let i = 0; i < svgs.length; i++)
    await expect(page.getByRole("img", { name: `Entry ${i}` })).toBeVisible()
})

test("repeated inline exports retain local references and accessible names", async ({
  page
}) => {
  const a = renderChart("AreaChart", {
    data,
    title: "Red sales",
    color: "#f00",
    gradientFill: true,
    width: 200,
    height: 160
  })
  const b = renderChart("AreaChart", {
    data,
    title: "Blue sales",
    color: "#00f",
    gradientFill: true,
    width: 500,
    height: 320
  })
  await page.setContent(`<main>${a}${b}</main>`)
  await expect(page.getByRole("img", { name: "Red sales" })).toBeVisible()
  await expect(page.getByRole("img", { name: "Blue sales" })).toBeVisible()
  const references = await page.evaluate(() => {
    const roots = [...document.querySelectorAll("main > svg")]
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id)
    return {
      unique: new Set(ids).size === ids.length,
      local: roots.every((root) =>
        [...root.querySelectorAll("*")].every((node) =>
          [...node.attributes].every((attribute) =>
            [...attribute.value.matchAll(/url\(#([^)]+)\)/g)].every((match) =>
              root.contains(document.getElementById(match[1]))
            )
          )
        )
      ),
      widths: roots.map(
        (root) =>
          root
            .querySelector<SVGGraphicsElement>('[id$="-data-area"]')!
            .getBBox().width
      )
    }
  })
  expect(references.unique).toBe(true)
  expect(references.local).toBe(true)
  expect(references.widths[0]).toBeGreaterThan(0)
  expect(references.widths[1]).toBeGreaterThan(references.widths[0])
  const audit = await new AxeBuilder({ page })
    .withRules(["svg-img-alt", "aria-valid-attr-value"])
    .analyze()
  expect(audit.violations).toEqual([])
})

test("native dashboard viewports paint both cells as an SVG image", async ({
  page
}) => {
  const svg = renderDashboard(
    [
      {
        component: "BarChart",
        props: {
          data: [{ category: "A", value: 4 }],
          categoryAccessor: "category",
          valueAccessor: "value",
          color: "#f00"
        }
      },
      {
        component: "BarChart",
        props: {
          data: [{ category: "B", value: 7 }],
          categoryAccessor: "category",
          valueAccessor: "value",
          color: "#00f"
        }
      }
    ],
    {
      title: "Sales dashboard",
      layout: { columns: 2 },
      width: 800,
      height: 300
    }
  )
  await page.setContent(`<main>${svg}</main>`)
  expect(await page.locator("foreignObject").count()).toBe(0)
  await expect(
    page.getByRole("group", { name: "Sales dashboard", exact: true })
  ).toBeVisible()
  const paint = await page.evaluate(async (markup) => {
    const image = new Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let red = 0
    let blue = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 100 && pixels[i] > 150 && pixels[i + 2] < 80) red++
      if (pixels[i + 3] > 100 && pixels[i + 2] > 150 && pixels[i] < 80) blue++
    }
    return { red, blue }
  }, svg)
  expect(paint.red).toBeGreaterThan(1000)
  expect(paint.blue).toBeGreaterThan(1000)
})

test("recipe shades and alpha resolve CSS-variable colors in the browser", async ({
  page
}) => {
  const shade = makeShade("var(--brand)")
  const colors = [
    shade(0),
    shade(0.5),
    shade(1),
    withAlpha("var(--brand)", 0.2),
    withAlpha("rgb(10% 40% 60% / 50%)", 0.2),
    withAlpha("hsl(240 100% 50% / 0.5)", 0.2),
    withAlpha("rgba(25.5,102,153,0.5)", 0.2),
    withAlpha("hsl(0.25turn,100%,50%,50%)", 0.2)
  ]
  await page.setContent('<main style="--brand:rgba(78,121,167,0.5)"></main>')
  const samples = await page.evaluate(
    (inputs) =>
      inputs.map((color) => {
        const swatch = document.createElement("div")
        swatch.style.backgroundColor = color
        document.querySelector("main")!.appendChild(swatch)
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = getComputedStyle(swatch).backgroundColor
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data]
      }),
    colors
  )
  expect(samples[1][0]).toBeCloseTo(78, -1)
  expect(samples[1][2]).toBeCloseTo(167, -1)
  expect(samples[0].slice(0, 3).reduce((a, b) => a + b)).toBeGreaterThan(
    samples[1].slice(0, 3).reduce((a, b) => a + b)
  )
  expect(samples[2].slice(0, 3).reduce((a, b) => a + b)).toBeLessThan(
    samples[1].slice(0, 3).reduce((a, b) => a + b)
  )
  expect(samples[3][3]).toBeCloseTo(26, -1)
  // Canvas unpremultiplication rounds channels at low alpha.
  const expectedRgb = [26, 102, 153, 26]
  expectedRgb.forEach((value, i) =>
    expect(samples[4][i]).toBeCloseTo(value, -1)
  )
  expectedRgb.forEach((value, i) =>
    expect(samples[6][i]).toBeCloseTo(value, -1)
  )
  expect(samples[5]).toEqual([0, 0, 255, 26])
  const expectedHsl = [128, 255, 0, 26]
  expectedHsl.forEach((value, i) =>
    expect(samples[7][i]).toBeCloseTo(value, -1)
  )
})
