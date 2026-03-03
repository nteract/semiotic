import React, { useState } from "react"

const toggleStyles = {
  container: {
    display: "inline-flex",
    borderRadius: 6,
    border: "1px solid var(--surface-3)",
    overflow: "hidden",
    marginBottom: 12,
  },
  button: (active) => ({
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-2)",
    transition: "background 0.15s, color 0.15s",
  }),
}

export default function StreamingToggle({ staticContent, streamingContent }) {
  const [mode, setMode] = useState("static")

  return (
    <div>
      <div style={toggleStyles.container}>
        <button
          style={toggleStyles.button(mode === "static")}
          onClick={() => setMode("static")}
        >
          Static
        </button>
        <button
          style={toggleStyles.button(mode === "streaming")}
          onClick={() => setMode("streaming")}
        >
          Streaming
        </button>
      </div>
      {mode === "static" ? staticContent : streamingContent}
    </div>
  )
}
