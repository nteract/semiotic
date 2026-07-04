import React, { useState } from "react"
import useContainerWidth from "../hooks/useContainerWidth"
import CodeBlock from "./CodeBlock"

export default function StreamingDemo({ renderChart, code }) {
  const [containerRef, containerWidth] = useContainerWidth()
  const [showCode, setShowCode] = useState(false)

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
          <button
            onClick={() => setShowCode((v) => !v)}
            style={{
              background: "none",
              border: "1px solid var(--surface-3)",
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-code)",
              lineHeight: "1.4",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          {showCode && (
            <div style={{ marginTop: 8 }}>
              <CodeBlock code={code} language="jsx" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
