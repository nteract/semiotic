import React, { useState, useEffect, useRef } from "react"
import { OrdinalFrame } from "semiotic"
import { processNodes } from "../process"
import theme from "../theme"

// ---------------------------------------------------------------------------
// Helper functions (ported from DocumentFrame.js)
// ---------------------------------------------------------------------------

const objectToString = (obj, indent, trimmed) => {
  if (!obj) return ""
  let newObj = "{ "
  const keys = Object.keys(obj),
    len = keys.length - 1

  keys.forEach((k, i) => {
    newObj += k + ": " + propertyToString(obj[k], indent + 1, trimmed)
    if (i !== len) newObj += ", "
  })

  newObj += " }"
  return newObj
}

export const propertyToString = (value, indent, trimmed) => {
  let string
  const type = typeof value
  const isArray = Array.isArray(value)
  let spaces = ""
  let x = 0
  for (x; x <= indent - 1; x++) {
    spaces += "  "
  }
  if (type === "function") {
    string = value.toString()
  } else if (type === "object" && !isArray) {
    string = objectToString(value, indent, trimmed)
  } else if (isArray) {
    const arr = trimmed ? value.slice(0, 2) : value
    string = (
      "[" +
      arr.map((d) => propertyToString(d, indent + 1, trimmed)) +
      `${value.length > 2 && trimmed ? ", ... " : ""}]`
    ).replace(/},{/g, `},\n${spaces}    {`)
  } else {
    string = JSON.stringify(value)
  }
  return string
}

const getFunctionString = (functions, overrideProps) => {
  let functionsString = ""

  Object.keys(functions).forEach((d) => {
    functionsString += overrideProps[d] || functions[d]
    functionsString += "\n"
  })

  if (functionsString) functionsString += "\n"

  return functionsString
}

const getFramePropsString = (
  frameProps,
  functions,
  overrideProps,
  trimmed,
  hiddenProps
) => {
  const frameString = Object.keys(frameProps)
    .filter((d) => !hiddenProps[d])
    .map((d) => {
      const order = processNodes.findIndex((p) => p.keys.indexOf(d) !== -1)
      const match = processNodes[order]

      return {
        key: d,
        value: frameProps[d],
        label: match ? match.label : "Other",
        order: match
          ? order + (match.keys.indexOf(d) / match.keys.length)
          : processNodes.length,
      }
    })
    .sort((a, b) => a.order - b.order)

  let framePropsString = "const frameProps = { ",
    category

  frameString.forEach((d, i) => {
    if (i !== 0) framePropsString += "\n"

    if (category !== d.label && trimmed) {
      framePropsString += "\n/* --- " + d.label + " --- */\n"
      category = d.label
    }

    let string =
      (functions[d.key] && (functions[d.key].name || d.key)) ||
      (overrideProps[d.key] && typeof overrideProps[d.key] === "string"
        ? overrideProps[d.key]
        : propertyToString(overrideProps[d.key], 0, trimmed)) ||
      propertyToString(d.value, 0, trimmed)

    if (string !== "") {
      framePropsString += `  ${d.key}: ${string}${
        (i !== frameString.length - 1 && ",") || ""
      }`
    }
  })

  framePropsString += "\n}"
  return framePropsString
}

const getCodeBlock = (
  frameName,
  pre,
  functionsString,
  framePropsString,
  overrideRender
) => {
  const importTheme = `const theme = ${JSON.stringify(theme)}`

  let render =
    overrideRender ||
    `export default () => {
  return <${frameName} {...frameProps} />
}`

  let codeblock = `import { ${frameName} } from "semiotic"
${pre || ""}${(pre && "\n") || ""}${importTheme}
${functionsString}${framePropsString}

${render}`
  let addImport = false

  if (codeblock.indexOf("theme") !== -1) {
    codeblock = codeblock.replace(/theme\[(.*?)]/g, (s, m) => {
      const tryParse = parseInt(m, 10)
      if (isNaN(tryParse)) {
        addImport = true
        return s
      }

      return `"${theme[m]}"`
    })
  }

  if (!addImport) {
    codeblock = codeblock.replace(importTheme + "\n", "")
  }

  return codeblock
}

// ---------------------------------------------------------------------------
// LiveExample component
// ---------------------------------------------------------------------------

export default function LiveExample({
  frameProps,
  type = OrdinalFrame,
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

  // Build the full code string (for copy)
  const fullFramePropsString = getFramePropsString(
    frameProps,
    functions,
    overrideProps,
    false,
    hiddenProps
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
  // Raw frames (XYFrame, OrdinalFrame, NetworkFrame) use a `size` array.
  // Chart wrappers (LineChart, BarChart, …) use `width` / `height` props.
  // Realtime charts use `size` but have no displayName.
  // Set both so each component type picks up the one it needs.
  const responsiveFrameProps = { ...frameProps }
  if (containerWidth) {
    const height = frameProps.size ? frameProps.size[1] : (frameProps.height || 300)
    responsiveFrameProps.size = [containerWidth, height]
    responsiveFrameProps.width = containerWidth
  }

  // Visualization element
  const visualization = (
    <div ref={vizContainerRef} style={styles.vizContainer}>
      {containerWidth ? <Frame {...responsiveFrameProps} /> : null}
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
