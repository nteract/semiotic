import React from "react"

/**
 * Theme toggle button shared by the docs app header and the blog
 * header. Visual sentinel (sun/moon) reflects the *current* theme;
 * `aria-label` describes what clicking will do.
 */
export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        background: "none",
        border: "1px solid var(--surface-3)",
        borderRadius: "8px",
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: "16px",
        lineHeight: 1,
        color: "var(--text-primary)",
      }}
    >
      {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  )
}
