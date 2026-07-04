import React, { useState } from "react"
import { Link } from "react-router-dom"

export default function ComponentMeta({
  componentName,
  importStatement,
  tier,
  wraps,
  wrapsPath,
  related
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(importStatement)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = importStatement
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tierLabel =
    tier === "charts" ? "Chart" : tier === "frames" ? "Frame" : "Utility"

  const tierColor =
    tier === "charts"
      ? "var(--tier-charts)"
      : tier === "frames"
        ? "var(--tier-frames)"
        : "var(--tier-utilities)"

  const styles = {
    container: {
      background: "var(--surface-1)",
      border: "1px solid var(--surface-3)",
      borderRadius: "8px",
      padding: "16px 20px",
      marginBottom: "24px"
    },
    importLine: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    importCode: {
      fontFamily: "var(--font-code)",
      color: "var(--accent)",
      fontSize: "14px"
    },
    copyButton: {
      background: "var(--surface-2)",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "12px",
      color: copied ? "var(--accent)" : "var(--text-secondary)",
      cursor: "pointer",
      transition: "color 0.2s ease"
    },
    tierBadge: {
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: 600,
      textTransform: "uppercase",
      background: tierColor.replace(")", ", 0.15)").replace("var(", "color-mix(in srgb, ") || tierColor,
      color: tierColor,
      marginTop: "12px"
    },
    wrapsText: {
      fontSize: "14px",
      color: "var(--text-secondary)",
      marginLeft: "12px"
    },
    wrapsLink: {
      color: "var(--accent)",
      textDecoration: "none"
    },
    relatedContainer: {
      marginTop: "12px",
      fontSize: "14px",
      color: "var(--text-secondary)"
    },
    relatedLink: {
      color: "var(--accent)",
      textDecoration: "none"
    },
    separator: {
      margin: "0 6px",
      color: "var(--text-secondary)"
    }
  }

  return (
    <div className="component-meta" data-tier={tier} data-component={componentName} style={styles.container}>
      <div className="component-meta-import" style={styles.importLine}>
        <code style={styles.importCode}>{importStatement}</code>
        <button onClick={handleCopy} style={styles.copyButton}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {wraps && (
        <div style={{ marginTop: "12px" }}>
          <span className="component-meta-wraps" style={styles.wrapsText}>
            Wraps: <Link to={wrapsPath} style={styles.wrapsLink}>{wraps}</Link>
          </span>
        </div>
      )}

      {related && related.length > 0 && (
        <div className="component-meta-related" style={styles.relatedContainer}>
          <span>Related: </span>
          {related.map((r, i) => (
            <React.Fragment key={r.path}>
              {i > 0 && <span style={styles.separator}>&middot;</span>}
              <Link to={r.path} style={styles.relatedLink}>{r.name}</Link>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
