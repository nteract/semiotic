import React from "react"
import useContainerWidth from "../hooks/useContainerWidth"
import CodeBlock from "./CodeBlock"

export default function StreamingDemo({ renderChart, code }) {
  const [containerRef, containerWidth] = useContainerWidth()

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          background: "var(--surface-1)",
          borderRadius: 8,
          padding: 16,
          border: "1px solid var(--surface-3)",
          overflow: "hidden",
        }}
      >
        {containerWidth && renderChart(containerWidth)}
      </div>
      {code && (
        <div style={{ marginTop: 8 }}>
          <CodeBlock code={code} language="jsx" />
        </div>
      )}
    </div>
  )
}
