import React, { useState, useEffect, useRef } from "react"
import { StreamOrdinalFrame } from "semiotic"
import {
  propertyToString,
  getFunctionString,
  getFramePropsString,
  getCodeBlock,
} from "./codegen"

// Re-export so existing importers (PlaygroundLayout) keep their
// `import { propertyToString } from "./LiveExample"`.
export { propertyToString }

// ---------------------------------------------------------------------------
// LiveExample component
// ---------------------------------------------------------------------------

export default function LiveExample({
  frameProps,
  type = StreamOrdinalFrame,
  overrideProps = {},
  functions = {},
  pre,
  overrideRender,
  hiddenProps = {},
  startHidden = true,
  sideBySide = false,
  title,
}) {
  const [codeState, setCodeState] = useState(
    startHidden ? "hidden" : "expanded"
  )
  const [copied, setCopied] = useState(false)
  const codeRef = useRef(null)
  const vizContainerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(null)

  // Track docs theme to force chart remount on toggle (canvas reads CSS vars at mount time)
  const [docsTheme, setDocsTheme] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") || "dark"
      : "dark"
  )
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDocsTheme(document.documentElement.getAttribute("data-theme") || "dark")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  const Frame = type
  const frameName = Frame.displayName

  // Measure container width for responsive sizing
  useEffect(() => {
    const el = vizContainerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Highlight code whenever the code block becomes visible
  useEffect(() => {
    if (codeState !== "hidden" && window.Prism) {
      // Small delay to let the DOM render before highlighting
      const timer = setTimeout(() => window.Prism.highlightAll(), 0)
      return () => clearTimeout(timer)
    }
  }, [codeState])

  // Build the trimmed code string (for display)
  const trimmedFramePropsString = getFramePropsString(
    frameProps,
    functions,
    overrideProps,
    true,
    hiddenProps
  )
  const functionsString = getFunctionString(functions, overrideProps)
  const trimmedCode = getCodeBlock(
    frameName,
    pre,
    functionsString,
    trimmedFramePropsString,
    overrideRender
  )

  // Build the full code string (for copy). `faithful: true` serializes the
  // real frameProps the chart rendered with — ignoring the display-only
  // overrideProps stubs — so the copied code reproduces the example instead of
  // referencing a trimmed/elided value.
  const fullFramePropsString = getFramePropsString(
    frameProps,
    functions,
    overrideProps,
    false,
    hiddenProps,
    true
  )
  const fullCode = getCodeBlock(
    frameName,
    pre,
    functionsString,
    fullFramePropsString,
    overrideRender
  )

  // Copy handler with fallback
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCode)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = fullCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Toggle handlers
  const showCode = () => {
    setCodeState("collapsed")
  }

  const expandCode = () => {
    setCodeState("expanded")
  }

  const hideCode = () => {
    setCodeState("hidden")
  }

  // Determine the code container style based on state
  const getCodeContainerStyle = () => {
    if (codeState === "hidden") {
      return { ...styles.codeBlock, display: "none" }
    }
    if (codeState === "collapsed") {
      return {
        ...styles.codeBlock,
        maxHeight: "350px",
        position: "relative",
        transition: "max-height 0.3s ease",
      }
    }
    // expanded
    return {
      ...styles.codeBlock,
      maxHeight: "none",
      transition: "max-height 0.3s ease",
    }
  }

  // Build responsive frame props.
  // Raw frames (StreamXYFrame, StreamOrdinalFrame, StreamNetworkFrame) use a `size` array.
  // Chart wrappers (LineChart, BarChart, …) use `width` / `height` props.
  // Realtime charts use `size` but have no displayName.
  // Set both so each component type picks up the one it needs.
  const responsiveFrameProps = { ...frameProps }
  if (containerWidth) {
    const height = frameProps.size ? frameProps.size[1] : (frameProps.height || 300)
    responsiveFrameProps.size = [containerWidth, height]
    responsiveFrameProps.width = containerWidth
  }

  // Visualization element — render with fallback size if container hasn't been measured yet
  const visualization = (
    <div ref={vizContainerRef} style={styles.vizContainer}>
      {containerWidth
        ? <Frame key={docsTheme} {...responsiveFrameProps} />
        : <Frame key={docsTheme} {...frameProps} />
      }
    </div>
  )

  // Code element
  const codeBlock = (
    <div style={getCodeContainerStyle()} ref={codeRef}>
      <pre
        className="language-jsx"
        style={styles.pre}
      >
        <code className="language-jsx">{trimmedCode}</code>
      </pre>
      {codeState === "collapsed" && (
        <div style={styles.gradientOverlay}>
          <button
            onClick={expandCode}
            style={styles.expandButton}
          >
            Expand
          </button>
        </div>
      )}
    </div>
  )

  // Toolbar buttons
  const toolbar = (
    <div style={styles.toolbar}>
      {codeState === "hidden" ? (
        <button onClick={showCode} style={styles.button}>
          Show Code
        </button>
      ) : (
        <button onClick={hideCode} style={styles.button}>
          Hide Code
        </button>
      )}
      {codeState === "expanded" && (
        <button
          onClick={() => setCodeState("collapsed")}
          style={styles.button}
        >
          Collapse
        </button>
      )}
      <button
        onClick={handleCopy}
        style={{
          ...styles.button,
          color: copied ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  )

  // Side-by-side layout
  if (sideBySide && codeState !== "hidden") {
    return (
      <div style={styles.wrapper}>
        {title && <h3 style={styles.title}>{title}</h3>}
        <div style={styles.sideBySideContainer}>
          <div style={styles.sideBySideLeft}>{visualization}</div>
          <div style={styles.sideBySideRight}>{codeBlock}</div>
        </div>
        {toolbar}
      </div>
    )
  }

  // Stacked layout (default)
  return (
    <div style={styles.wrapper}>
      {title && <h3 style={styles.title}>{title}</h3>}
      {visualization}
      {toolbar}
      {codeBlock}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const styles = {
  wrapper: {
    marginBottom: "32px",
  },

  title: {
    margin: "0 0 12px 0",
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.3,
  },

  vizContainer: {
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid var(--surface-3)",
    overflow: "hidden",
  },

  toolbar: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    alignItems: "center",
  },

  button: {
    background: "none",
    border: "1px solid var(--surface-3)",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-code)",
    lineHeight: "1.4",
    transition: "color 0.15s ease, border-color 0.15s ease",
  },

  codeBlock: {
    background: "var(--surface-2)",
    borderRadius: "8px",
    overflow: "hidden",
    marginTop: "8px",
    border: "1px solid var(--surface-3)",
  },

  pre: {
    margin: 0,
    padding: "16px",
    background: "none",
    border: "none",
    fontFamily: "var(--font-code)",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "var(--text-primary)",
    overflow: "auto",
    whiteSpace: "pre",
  },

  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80px",
    background:
      "linear-gradient(to bottom, transparent, var(--surface-2) 85%)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: "12px",
    pointerEvents: "none",
  },

  expandButton: {
    background: "var(--surface-3)",
    border: "1px solid var(--surface-3)",
    borderRadius: "4px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-code)",
    lineHeight: "1.4",
    pointerEvents: "auto",
  },

  sideBySideContainer: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },

  sideBySideLeft: {
    flex: "1 1 50%",
    minWidth: 0,
  },

  sideBySideRight: {
    flex: "1 1 50%",
    minWidth: 0,
  },
}
