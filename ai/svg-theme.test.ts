import { expect, it } from "vitest"
import { applySvgTheme } from "./svg-theme"

it.each([
  '<svg xmlns="http://www.w3.org/2000/svg" aria-label="A > B"><path d="M0 0"/></svg>',
  "<svg xmlns='http://www.w3.org/2000/svg' aria-label='A > B'/>",
  '<!-- <svg> --><svg xmlns="http://www.w3.org/2000/svg" aria-label="A > B"/>'
])(
  "inserts MCP theme CSS inside a well-formed root without replacement-token expansion",
  (host) => {
    const svg = applySvgTheme(host, {
      "--semiotic-font-family": '"A & B $& $1"'
    })
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(document.documentElement.getAttribute("aria-label")).toBe("A > B")
    expect(document.querySelector("style")?.textContent).toBe(
      ':root { --semiotic-font-family: "A & B $& $1" }'
    )
  }
)

it("rejects CSS declaration and markup injection through either keys or values", () => {
  const host = '<svg xmlns="http://www.w3.org/2000/svg"/>'
  expect(
    applySvgTheme(host, {
      "--semiotic-color; fill": "red",
      "--semiotic-color": "red; fill: blue",
      "--semiotic-label": "</style><script/>",
      "--semiotic-unsafe": "url(https://example.test)",
      "--semiotic-comment": "/* hidden",
      color: "red"
    })
  ).toBe(host)
})
