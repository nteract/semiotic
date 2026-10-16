import type * as React from "react"

export const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
}

export const popoverStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 30,
  top: "calc(100% + 0.5rem)",
  left: 0,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  width: "var(--sentence-filter-popover-width, 18rem)",
  maxWidth: "min(22rem, calc(100vw - 2rem))",
  maxHeight: "min(24rem, calc(100vh - 2rem))",
  overflow: "auto",
  padding: 12,
  color: "var(--sentence-filter-text-color, var(--semiotic-text, #1f2933))",
  backgroundColor: "var(--semiotic-bg, #fff)",
  border: "1px solid var(--semiotic-border, #cbd5e1)",
  borderRadius: 6,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
  fontFamily: "inherit",
  fontSize: "1rem",
  fontWeight: 400,
  lineHeight: 1.4,
  textAlign: "left",
  whiteSpace: "normal",
}

export const fieldStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 38,
  padding: "6px 8px",
  color: "inherit",
  backgroundColor: "var(--semiotic-bg, #fff)",
  border: "1px solid var(--semiotic-border, #94a3b8)",
  borderRadius: 4,
  font: "inherit",
}

export const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  minHeight: 38,
  padding: "7px 8px",
  color: "inherit",
  backgroundColor: "transparent",
  border: 0,
  borderRadius: 4,
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
}

