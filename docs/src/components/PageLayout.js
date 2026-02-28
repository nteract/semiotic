import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

/**
 * Generates a URL-friendly id from heading text content.
 * Lowercases, replaces spaces with hyphens, strips non-alphanumeric characters.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/**
 * PageLayout wraps every content page with breadcrumbs, a page title,
 * a right-side "On this page" table of contents, and prev/next navigation.
 *
 * Props:
 *   title       (string)          - Page title, rendered as h1
 *   tier        (string, optional) - "charts" | "frames" | "utilities" - adds a tier badge
 *   breadcrumbs (array, optional)  - Array of { label, path } for breadcrumb trail
 *   prevPage    (object, optional) - { title, path } for previous page link
 *   nextPage    (object, optional) - { title, path } for next page link
 *   children    (React node)       - Page content
 */
export default function PageLayout({
  title,
  tier,
  breadcrumbs,
  prevPage,
  nextPage,
  children,
}) {
  const contentRef = useRef(null)
  const [tocItems, setTocItems] = useState([])
  const [activeId, setActiveId] = useState(null)

  // Scan the rendered content for h2 and h3 headings and build the TOC
  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl) return

    const headings = contentEl.querySelectorAll("h2, h3")
    const items = []

    headings.forEach((heading) => {
      // Ensure each heading has an id attribute
      if (!heading.id) {
        heading.id = slugify(heading.textContent)
      }
      items.push({
        id: heading.id,
        text: heading.textContent,
        level: heading.tagName === "H3" ? 3 : 2,
      })
    })

    setTocItems(items)
  }, [children])

  // Use IntersectionObserver to track which section heading is currently visible
  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl || tocItems.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is currently intersecting
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        // Offset from top to account for sticky header
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    )

    const headings = contentEl.querySelectorAll("h2, h3")
    headings.forEach((heading) => observer.observe(heading))

    return () => {
      headings.forEach((heading) => observer.unobserve(heading))
    }
  }, [tocItems])

  return (
    <div className="page-layout" style={styles.layout}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="page-breadcrumbs" style={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <span key={index} style={styles.breadcrumbItem}>
                {isLast ? (
                  <span style={styles.breadcrumbCurrent}>{crumb.label}</span>
                ) : (
                  <>
                    <Link to={crumb.path} style={styles.breadcrumbLink}>
                      {crumb.label}
                    </Link>
                    <span style={styles.breadcrumbSeparator}>{"\u203A"}</span>
                  </>
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* Page header with title and optional tier badge */}
      <div className="page-header" style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        {tier && (
          <span className={`tier-badge ${tier}`} style={styles.tierBadge}>
            {tier}
          </span>
        )}
      </div>

      {/* Main body: content + TOC sidebar */}
      <div className="page-body" style={styles.body}>
        <div className="page-content" ref={contentRef} style={styles.content}>
          {children}
        </div>

        {/* Right-side table of contents, visible on wide screens */}
        {tocItems.length > 0 && (
          <aside className="page-toc" style={styles.toc}>
            <h4 style={styles.tocTitle}>On this page</h4>
            <ul style={styles.tocList}>
              {tocItems.map((item) => (
                <li key={item.id} style={styles.tocListItem}>
                  <a
                    href={`#${item.id}`}
                    style={{
                      ...styles.tocLink,
                      ...(item.level === 3 ? styles.tocLinkH3 : {}),
                      ...(activeId === item.id ? styles.tocLinkActive : {}),
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {/* Prev / Next navigation */}
      {(prevPage || nextPage) && (
        <nav className="page-nav" style={styles.nav}>
          {prevPage ? (
            <Link to={prevPage.path} style={styles.navLink}>
              <span style={styles.navArrow}>{"\u2190"}</span>
              <span style={styles.navLinkText}>
                <span style={styles.navLabel}>Previous</span>
                <span style={styles.navTitle}>{prevPage.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {nextPage ? (
            <Link
              to={nextPage.path}
              style={{ ...styles.navLink, ...styles.navLinkRight }}
            >
              <span style={styles.navLinkText}>
                <span style={{ ...styles.navLabel, textAlign: "right" }}>
                  Next
                </span>
                <span style={{ ...styles.navTitle, textAlign: "right" }}>
                  {nextPage.title}
                </span>
              </span>
              <span style={styles.navArrow}>{"\u2192"}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Inline Styles
   --------------------------------------------------------------------------
   These use CSS custom properties defined in the design system (index.css)
   so they adapt to light/dark mode automatically.
   -------------------------------------------------------------------------- */

const styles = {
  layout: {
    width: "100%",
  },

  /* Breadcrumbs */
  breadcrumbs: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0",
    marginBottom: "8px",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  breadcrumbItem: {
    display: "inline-flex",
    alignItems: "center",
  },
  breadcrumbLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontWeight: 400,
    transition: "color 0.15s ease",
  },
  breadcrumbCurrent: {
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  breadcrumbSeparator: {
    margin: "0 6px",
    color: "var(--text-secondary)",
    fontSize: "14px",
    userSelect: "none",
  },

  /* Page header */
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.2,
  },
  tierBadge: {
    /* Positioning adjustments; base styles come from .tier-badge class in CSS */
    flexShrink: 0,
    alignSelf: "center",
    marginTop: "4px",
    textTransform: "capitalize",
  },

  /* Body: content + TOC side by side */
  body: {
    display: "flex",
    gap: "40px",
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },

  /* Table of contents sidebar */
  toc: {
    width: "var(--toc-width)",
    flexShrink: 0,
    position: "sticky",
    top: "96px",
    maxHeight: "calc(100vh - 120px)",
    overflowY: "auto",
    display: "none",
    /* We use a CSS media query approach via a class, but since we are
       using inline styles, we rely on the parent grid hiding the column
       at narrow widths. As a fallback we set display via the style object
       and override it below with a className-based approach. */
  },
  tocTitle: {
    margin: "0 0 12px 0",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tocList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  tocListItem: {
    margin: 0,
    padding: 0,
  },
  tocLink: {
    display: "block",
    padding: "3px 0 3px 12px",
    fontSize: "13px",
    lineHeight: "1.5",
    color: "var(--text-secondary)",
    textDecoration: "none",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--surface-3)",
    fontWeight: 400,
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  tocLinkH3: {
    paddingLeft: "24px",
    fontSize: "12px",
  },
  tocLinkActive: {
    color: "var(--accent)",
    borderLeftColor: "var(--accent)",
    fontWeight: 500,
  },

  /* Prev/Next navigation */
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginTop: "48px",
    paddingTop: "24px",
    borderTop: "1px solid var(--surface-3)",
    gap: "16px",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--surface-3)",
    backgroundColor: "var(--surface-1)",
    textDecoration: "none",
    transition: "border-color 0.15s ease, background 0.15s ease",
    maxWidth: "48%",
  },
  navLinkRight: {
    marginLeft: "auto",
    textAlign: "right",
  },
  navArrow: {
    fontSize: "18px",
    color: "var(--accent)",
    flexShrink: 0,
    lineHeight: 1,
  },
  navLinkText: {
    display: "flex",
    flexDirection: "column",
  },
  navLabel: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    lineHeight: 1.4,
  },
  navTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.4,
  },
}

/*
  Note on TOC visibility:

  The inline style sets `display: "none"` on the TOC by default.
  To make the TOC visible on wide screens, add this CSS rule to index.css:

    @media (min-width: 1201px) {
      .page-toc {
        display: block !important;
      }
    }

  Alternatively, the parent .app-layout grid already allocates a toc-column
  that hides below 1200px, so the TOC can be placed in that grid column instead.
  The component exposes the .page-toc className for this purpose.
*/
