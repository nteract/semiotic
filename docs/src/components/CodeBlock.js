import React, { useState } from "react"

export default function CodeBlock({
  code,
  language = "jsx",
  showLineNumbers = false,
  showCopyButton = true,
  className = ""
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlighted =
    window.Prism && window.Prism.languages[language]
      ? window.Prism.highlight(code, window.Prism.languages[language], language)
      : code

  const lines = code.split("\n")
  const highlightedLines =
    window.Prism && window.Prism.languages[language]
      ? lines.map((line) =>
          window.Prism.highlight(
            line,
            window.Prism.languages[language],
            language
          )
        )
      : lines

  const styles = {
    wrapper: {
      position: "relative",
      background: "var(--surface-2)",
      border: "1px solid var(--surface-3)",
      borderRadius: "8px",
      overflow: "hidden"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 12px",
      borderBottom: "1px solid var(--surface-3)",
      minHeight: "28px"
    },
    languageBadge: {
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.5px",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      userSelect: "none"
    },
    copyButton: {
      background: "none",
      border: "1px solid var(--surface-3)",
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "12px",
      color: copied ? "var(--accent)" : "var(--text-secondary)",
      cursor: "pointer",
      fontFamily: "var(--font-code)",
      transition: "color 0.2s ease, border-color 0.2s ease",
      lineHeight: "1.4"
    },
    codeArea: {
      overflowX: "auto",
      padding: showLineNumbers ? "16px 16px 16px 0" : "16px",
      margin: 0
    },
    pre: {
      margin: 0,
      padding: 0,
      background: "none",
      border: "none",
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)"
    },
    table: {
      borderCollapse: "collapse",
      width: "100%"
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
      opacity: 0.5
    },
    lineContentCell: {
      paddingLeft: "0",
      whiteSpace: "pre",
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)"
    },
    inlineCode: {
      whiteSpace: "pre",
      fontFamily: "var(--font-code)",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "var(--text-primary)"
    }
  }

  return (
    <div style={styles.wrapper} className={className}>
      <div style={styles.header}>
        <span style={styles.languageBadge}>{language.toUpperCase()}</span>
        {showCopyButton && (
          <button
            onClick={handleCopy}
            style={styles.copyButton}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "var(--surface-3)"
            }}
            aria-label={copied ? "Copied" : "Copy code to clipboard"}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
      <div style={styles.codeArea}>
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
            <code
              style={styles.inlineCode}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        )}
      </div>
    </div>
  )
}
