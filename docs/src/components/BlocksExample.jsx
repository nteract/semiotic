import React from "react"
import CodeBlock from "./CodeBlock"
import { useBlocksView, useRegisterBlocksExample } from "./BlocksView"

export default function BlocksExample({
  children,
  code,
  language = "jsx",
  renderInNarrative = true,
  title,
}) {
  const { blocksMode } = useBlocksView()
  useRegisterBlocksExample()

  if (!blocksMode) return renderInNarrative ? children : null

  return (
    <section className="blocks-example">
      <h2 className="blocks-example-title">
        Interactive Example
        {title && <span className="blocks-example-kicker">{title}</span>}
      </h2>
      <div className="blocks-example-output">{children}</div>
      {code && <CodeBlock code={code} language={language} showCopyButton />}
    </section>
  )
}
