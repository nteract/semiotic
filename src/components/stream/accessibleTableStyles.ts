import type { CSSProperties } from "react"

/** Shared scene, network, and physics table presentation. */
export const SAMPLE_SIZE = 5
/** Rows revealed per "Show more" click. Bounded paging keeps a 50k-row dataset
 *  from instantiating a giant table in one go while still letting a determined
 *  user page all the way through their data. */
export const PAGE_SIZE = 25
export const DATA_TABLE_CLASS = "semiotic-accessible-data-table"
export const DATA_TABLE_HIDDEN_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-hidden`
export const DATA_TABLE_VISIBLE_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-visible`
export const DATA_TABLE_NETWORK_CLASS = `${DATA_TABLE_VISIBLE_CLASS} semiotic-accessible-data-table-network`

export const HIDDEN_TRIGGER_STYLE: CSSProperties = {
  boxSizing: "border-box",
  maxWidth: "100%",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis"
}

export const VISIBLE_PANEL_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex:
    "var(--semiotic-data-table-z-index, var(--semiotic-overlay-z-index, 20))",
  padding: "14px 16px 12px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontFamily:
    "var(--semiotic-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  borderRadius:
    "var(--semiotic-border-radius, 0px) var(--semiotic-border-radius, 0px) 0 0"
}

export const SUMMARY_NOTE_STYLE: CSSProperties = {
  marginBottom: 8,
  paddingRight: 28,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 12,
  letterSpacing: "0.01em"
}

export const CLOSE_BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  cursor: "pointer",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  borderRadius: "var(--semiotic-border-radius, 4px)"
}

export const VISIBLE_TABLE_STYLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums"
}

export const VISIBLE_TH_STYLE: CSSProperties = {
  textAlign: "left",
  padding: "5px 10px",
  borderBottom:
    "2px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))"
}

export const VISIBLE_TD_STYLE: CSSProperties = {
  padding: "4px 10px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))"
}

export const CAPTION_STYLE: CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  // #666 fallback = LIGHT_THEME.textSecondary; #999 fails WCAG AA for text.
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  marginBottom: 4,
  fontStyle: "italic"
}

export const SHOW_MORE_BUTTON_STYLE: CSSProperties = {
  marginTop: 8,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  borderRadius: "var(--semiotic-border-radius, 4px)",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  fontFamily: "inherit"
}
