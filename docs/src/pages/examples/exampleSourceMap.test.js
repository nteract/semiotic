import { describe, expect, it } from "vitest"
import {
  EXAMPLE_DEFINITIONS,
  validateExampleDefinitions,
} from "./exampleDefinitions"
import {
  EXAMPLE_SOURCE_PATHS,
  cleanExampleSourceForFullCode,
  getExampleSourceLoader,
} from "./exampleSourceMap"

describe("example Full Code source cleanup", () => {
  it("removes narrative code-display plumbing and keeps the example body", () => {
    const source = `import React from "react"
import CodeBlock from "../../components/CodeBlock"
import BlocksExample from "../../components/BlocksExample"

const implementationCode = \`const label = \\\`kept inside snippet\\\`
<CodeBlock code={label} />\`
const keepMe = "actual example code"

export default function Example() {
  return (
    <ExamplePageLayout title="Example">
      <BlocksExample
        code={implementationCode}
        renderInNarrative={false}
        title="Rendered example"
      >
        <Widget value={keepMe} />
      </BlocksExample>
      <section>
        <h2>Implementation</h2>
        <CodeBlock language="jsx" showCopyButton code={implementationCode} />
        <CodeBlock language="jsx">{implementationCode}</CodeBlock>
      </section>
    </ExamplePageLayout>
  )
}`

    const cleaned = cleanExampleSourceForFullCode(source)

    expect(cleaned).toContain('const keepMe = "actual example code"')
    expect(cleaned).toContain("<Widget value={keepMe} />")
    expect(cleaned).toContain("<BlocksExample")
    expect(cleaned).not.toContain("import CodeBlock")
    expect(cleaned).not.toContain("implementationCode")
    expect(cleaned).not.toContain("<CodeBlock")
  })

  it("returns a stable loader for each route", () => {
    expect(getExampleSourceLoader("/examples/watermarks")).toBe(
      getExampleSourceLoader("/examples/watermarks"),
    )
    expect(getExampleSourceLoader("/examples/stakeholder-journey")).not.toBe(
      getExampleSourceLoader("/examples/watermarks"),
    )
  })

  it("maps every pilot example definition to a lazy source-loader", () => {
    const pilotDefinitions = EXAMPLE_DEFINITIONS.filter((definition) => definition.isPilot)
    expect(pilotDefinitions.length).toBeGreaterThan(0)
    for (const definition of pilotDefinitions) {
      const loader = getExampleSourceLoader(definition.path)
      expect(loader).toBeTypeOf("function")
      expect(definition).toHaveProperty("sourceFile")
    }
  })

  it("keeps source-loader contract valid while validating example definitions", () => {
    const validation = validateExampleDefinitions()
    expect(validation.ok).toBe(true)
    const expectedPaths = EXAMPLE_DEFINITIONS.filter((definition) => definition.isPilot).map(
      (definition) => definition.path,
    )
    for (const path of expectedPaths) {
      expect(getExampleSourceLoader(path)).toBeTypeOf("function")
    }
  })

  it("only maps source loaders for pilot definitions with sourceFile metadata", async () => {
    const validation = validateExampleDefinitions()
    expect(validation.ok).toBe(true)
    const pilotDefinitions = validation.definitions.filter((definition) => definition.isPilot)

    for (const definition of pilotDefinitions) {
      expect(definition.sourceFile).toMatch(/\.jsx$/)
      const loader = getExampleSourceLoader(definition.path)
      expect(loader).toBeTypeOf("function")
      const source = await loader()
      expect(source).toContain("import")
      expect(source).toContain("return")
    }

    const legacyPath = EXAMPLE_SOURCE_PATHS.find((path) => !getExampleSourceLoader(path))
    expect(legacyPath).toBeUndefined()
  })
})
