"use client"
import * as React from "react"
import type { MobileAnnotationCalloutItem } from "./recipes/mobileAnnotationStrategy"

export interface MobileAnnotationCalloutListProps {
  items: readonly MobileAnnotationCalloutItem[]
  title?: React.ReactNode
  empty?: React.ReactNode
  ordered?: boolean
  renderItem?: (item: MobileAnnotationCalloutItem, index: number) => React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function MobileAnnotationCalloutList({
  items,
  title = "Additional notes",
  empty = null,
  ordered = true,
  renderItem,
  className,
  style,
}: MobileAnnotationCalloutListProps) {
  if (!items.length) return empty ? <>{empty}</> : null

  const ListTag = ordered ? "ol" : "ul"

  return (
    <section
      className={["semiotic-mobile-annotation-callouts", className].filter(Boolean).join(" ")}
      style={style}
    >
      <style>{`
        .semiotic-mobile-annotation-callouts {
          display: grid;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid var(--semiotic-border, #d8d8d8);
          border-radius: 14px;
          background: var(--semiotic-bg, #fff);
          color: var(--semiotic-text, #222);
        }
        .semiotic-mobile-annotation-callouts h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.25;
        }
        .semiotic-mobile-annotation-callouts ol,
        .semiotic-mobile-annotation-callouts ul {
          display: grid;
          gap: 8px;
          margin: 0;
          padding-left: 18px;
        }
        .semiotic-mobile-annotation-callouts li {
          font-size: 13px;
          line-height: 1.45;
        }
        .semiotic-mobile-annotation-callouts small {
          display: block;
          margin-top: 2px;
          color: var(--semiotic-text-secondary, #666);
          font-size: 11px;
          line-height: 1.3;
        }
      `}</style>
      {title && <h3>{title}</h3>}
      <ListTag>
        {items.map((item, index) => (
          <li key={item.id}>
            {renderItem ? renderItem(item, index) : (
              <>
                <span>{item.label}</span>
                {(item.source || item.emphasis) && (
                  <small>
                    {[item.emphasis, item.source].filter(Boolean).join(" - ")}
                  </small>
                )}
              </>
            )}
          </li>
        ))}
      </ListTag>
    </section>
  )
}

export default MobileAnnotationCalloutList
