import { describe, expect, it } from "vitest"
import { cleanExampleSourceForFullCode, getExampleSourceLoader } from "./exampleSourceMap"

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
    expect(getExampleSourceLoader("/examples/plinko-quantile-dotplot")).not.toBe(
      getExampleSourceLoader("/examples/watermarks"),
    )
  })
})
