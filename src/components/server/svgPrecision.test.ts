import { expect, it } from "vitest"
import { serializeSvgPrecision } from "./renderToStaticSVG"

it("rounds geometry after quoted angle brackets and respects either attribute quote", () => {
  const svg = serializeSvgPrecision(
    `<svg xmlns="http://www.w3.org/2000/svg" aria-label="A > B" width='10.555'><path aria-label='example d="M1.234 5.678"' d='M1.234 5.678' x = "1.&#50;34" /></svg>`,
    1
  )
  const document = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(document.querySelector("parsererror")).toBeNull()
  expect(document.documentElement.getAttribute("aria-label")).toBe("A > B")
  expect(document.documentElement.getAttribute("width")).toBe("10.6")
  expect(document.querySelector("path")?.getAttribute("aria-label")).toBe(
    'example d="M1.234 5.678"'
  )
  expect(document.querySelector("path")?.getAttribute("d")).toBe("M1.2 5.7")
  expect(document.querySelector("path")?.getAttribute("x")).toBe("1.2")
})

it("leaves apparent geometry inside declarations, comments, CDATA and processing instructions unchanged", () => {
  const preamble = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY decoy '<path d="M1.234 5.678"/>'>]>`
  const comment = '<!-- <path d="M1.234 5.678"/> -->'
  const cdata = '<![CDATA[<path d="M1.234 5.678"/>]]>'
  const instruction = '<?example d="M1.234 5.678"?>'
  const svg = `${preamble}<svg>${comment}<text>${cdata}</text>${instruction}<path d="M1.234 5.678"/></svg>`
  const rounded = serializeSvgPrecision(svg, 1)
  expect(rounded).toBe(
    `${preamble}<svg>${comment}<text>${cdata}</text>${instruction}<path d="M1.2 5.7"/></svg>`
  )
})
