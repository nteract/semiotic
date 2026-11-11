import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { EXAMPLE_DEFINITIONS } from "./exampleDefinitions"
import { EXAMPLE_ROUTE_DEFINITIONS } from "./exampleRouteDefinitions"

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8")

describe("EXAMPLE_ROUTE_DEFINITIONS", () => {
  it("matches the path and source file of every example definition", () => {
    const fromRegistry = Object.fromEntries(
      EXAMPLE_DEFINITIONS.map((definition) => [definition.path, definition.sourceFile]),
    )
    const fromRouteTable = Object.fromEntries(
      EXAMPLE_ROUTE_DEFINITIONS.map((route) => [route.path, route.sourceFile]),
    )

    expect(fromRouteTable).toEqual(fromRegistry)
    expect(EXAMPLE_ROUTE_DEFINITIONS).toHaveLength(EXAMPLE_DEFINITIONS.length)
  })

  it("lists each route once, sorted by path, with nothing but route identity", () => {
    const paths = EXAMPLE_ROUTE_DEFINITIONS.map((route) => route.path)

    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toEqual([...paths].sort())
    for (const route of EXAMPLE_ROUTE_DEFINITIONS) {
      expect(Object.keys(route).sort()).toEqual(["path", "sourceFile"])
    }
  })
})

describe("docs shell imports", () => {
  it("loads the index pages with their routes, not with the shell", () => {
    const app = read("../../App.jsx")

    // A static import inlines every index-page thumbnail into the first load.
    expect(app).not.toMatch(/^import\s[^\n]*from\s+["']\.\/IndexPages["']/m)
    expect(app).toMatch(/import\(\s*["']\.\/IndexPages["']\s*\)/)
  })

  it("builds example routes from the route table, not the full registry", () => {
    const app = read("../../App.jsx")

    // Importing the full registry here puts every example's title,
    // description, and contract in the first load of every docs page.
    expect(app).not.toMatch(/from\s+["']\.\/pages\/examples\/exampleDefinitions["']/)
    expect(app).not.toMatch(/from\s+["']\.\/pages\/examples\/examplesManifest["']/)
    expect(app).toMatch(/from\s+["']\.\/pages\/examples\/exampleRouteDefinitions["']/)
  })

  it("has a lazy page component for every route table source file", () => {
    const app = read("../../App.jsx")
    const componentMap = app.match(
      /const EXAMPLE_PAGE_COMPONENTS_BY_SOURCE_FILE = Object\.freeze\(\{([\s\S]*?)\}\)/,
    )?.[1]

    expect(componentMap).toBeTruthy()
    const mappedSourceFiles = [...componentMap.matchAll(/["']([^"']+\.(?:jsx|tsx))["']\s*:/g)].map(
      (match) => match[1],
    )
    expect([...mappedSourceFiles].sort()).toEqual(
      EXAMPLE_ROUTE_DEFINITIONS.map((route) => route.sourceFile).sort(),
    )
  })
})
