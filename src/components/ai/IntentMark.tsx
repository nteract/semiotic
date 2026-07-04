"use client"
import * as React from "react"
import type { IntentManifest } from "./intentManifest"
import { summarizeIntentManifest } from "./intentManifest"

export interface IntentMarkProps {
  manifest: IntentManifest
  label?: string
  className?: string
  /** Show the human summary above the JSON contract. Default true. */
  showSummary?: boolean
}

/**
 * Visible, inspectable IDID contract for docs and review surfaces. Native
 * `<details>` keeps the first version keyboard- and screen-reader-operable
 * without introducing a popover dependency.
 */
export function IntentMark({
  manifest,
  label = "Intent Mark",
  className,
  showSummary = true,
}: IntentMarkProps) {
  const [copied, setCopied] = React.useState(false)
  const json = React.useMemo(() => JSON.stringify(manifest, null, 2), [manifest])

  const copy = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    await navigator.clipboard.writeText(json)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }, [json])

  return (
    <details
      className={className ? `semiotic-intent-mark ${className}` : "semiotic-intent-mark"}
      style={{
        border: "1px solid var(--semiotic-border, #c8c8c8)",
        borderRadius: 6,
        background: "var(--semiotic-surface, #fff)",
        color: "var(--semiotic-text, #222)",
        fontFamily: "var(--semiotic-font-family, sans-serif)",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "7px 10px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label} · {manifest.intent.primary}
      </summary>
      <div style={{ padding: "0 10px 10px" }}>
        {showSummary && (
          <p style={{ margin: "4px 0 10px", fontSize: 13, lineHeight: 1.45 }}>
            {summarizeIntentManifest(manifest)}
          </p>
        )}
        <button
          type="button"
          onClick={copy}
          style={{
            border: "1px solid currentColor",
            borderRadius: 4,
            background: "transparent",
            color: "inherit",
            padding: "4px 8px",
            font: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy manifest"}
        </button>
        <pre
          style={{
            maxHeight: 280,
            overflow: "auto",
            margin: "10px 0 0",
            padding: 10,
            background: "var(--semiotic-background, #f5f5f5)",
            fontSize: 11,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          {json}
        </pre>
      </div>
    </details>
  )
}
