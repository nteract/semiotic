import React from "react"
import { ClipboardStatus, useClipboard } from "../../../src/components/useClipboard"
import { copyWithFallback } from "./clipboard"

export default function CodeBlock({
  code,
  children,
  language = "jsx",
  showLineNumbers = false,
  showCopyButton = true,
  wrap = false,
  className = "",
  codeAreaLabel,
}) {
  // Support children as fallback for code prop
  code = code || (typeof children === "string" ? children : "")
  const { status, copy } = useClipboard(2000)
  const copied = status === "copied"
  const handleCopy = () => void copy(() => copyWithFallback(code))

  // Escape HTML entities for safe rendering when Prism isn't available
  const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const highlighted =
    window.Prism && window.Prism.languages[language]
      ? window.Prism.highlight(code, window.Prism.languages[language], language)
      : escapeHtml(code)

  const lines = code.split("\n")
  const highlightedLines =
    window.Prism && window.Prism.languages[language]
      ? lines.map((line) =>
          window.Prism.highlight(line, window.Prism.languages[language], language),
        )
      : lines.map(escapeHtml)
  const wrapperClassName = ["code-block", className].filter(Boolean).join(" ")

  const styles = {
    wrapper: {
      position: "relative",
      background: "var(--surface-2)",
      border: "1px solid var(--surface-3)",
      borderRadius: "8px",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 12px",
      borderBottom: "1px solid var(--surface-3)",
      minHeight: "28px",
    },
    languageBadge: {
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.5px",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      userSelect: "none",
    },
    copyButton: {
      background: "none",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "var(--surface-3)",
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "12px",
      color: copied ? "var(--accent)" : "var(--text-secondary)",
      cursor: "pointer",
      fontFamily: "var(--font-code)",
      transition: "color 0.2s ease, border-color 0.2s ease",
      lineHeight: "1.4",
    },
    codeArea: {
      overflowX: "auto",
      padding: showLineNumbers ? "16px 16px 16px 0" : "16px",
      margin: 0,
    },
    pre: {
      margin: 0,
      padding: 0,
      background: "none",
      border: "none",
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)",
    },
    table: {
      borderCollapse: "collapse",
      width: "100%",
    },
    lineNumberCell: {
      width: "1px",
      whiteSpace: "nowrap",
      paddingRight: "16px",
      paddingLeft: "16px",
      textAlign: "right",
      userSelect: "none",
      color: "var(--text-secondary)",
      fontFamily: "var(--font-code)",
      fontSize: "13px",
      lineHeight: "1.6",
      verticalAlign: "top",
      opacity: 0.5,
    },
    lineContentCell: {
      paddingLeft: "0",
      whiteSpace: wrap ? "pre-wrap" : "pre",
      overflowWrap: wrap ? "anywhere" : undefined,
      wordBreak: wrap ? "break-word" : undefined,
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)",
    },
    inlineCode: {
      whiteSpace: wrap ? "pre-wrap" : "pre",
      overflowWrap: wrap ? "anywhere" : undefined,
      wordBreak: wrap ? "break-word" : undefined,
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)",
    },
  }

  return (
    <div style={styles.wrapper} className={wrapperClassName}>
      <div style={styles.header}>
        <span style={styles.languageBadge}>{language.toUpperCase()}</span>
        {showCopyButton && (
          <button
            onClick={handleCopy}
            style={styles.copyButton}
            aria-label={copied ? "Copied" : status === "failed" ? "Copy failed" : "Copy code to clipboard"}
          >
            {copied ? "Copied!" : status === "failed" ? "Copy failed" : "Copy"}
          </button>
        )}
        <ClipboardStatus status={status} />
      </div>
      <div
        style={styles.codeArea}
        className="code-block-scroll"
        role="region"
        aria-label={codeAreaLabel || `${language.toUpperCase()} code sample`}
        tabIndex={0}
      >
        {showLineNumbers ? (
          <pre style={styles.pre}>
            <table style={styles.table}>
              <tbody>
                {highlightedLines.map((lineHtml, i) => (
                  <tr key={i}>
                    <td style={styles.lineNumberCell}>{i + 1}</td>
                    <td
                      style={styles.lineContentCell}
                      dangerouslySetInnerHTML={{ __html: lineHtml || " " }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </pre>
        ) : (
          <pre style={styles.pre}>
            <code style={styles.inlineCode} dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        )}
      </div>
    </div>
  )
}
