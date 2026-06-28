import React from "react"
import { Link } from "react-router-dom"

export default function ExamplePageLayout({
  title,
  prevPage,
  nextPage,
  children,
}) {
  return (
    <article style={styles.page}>
      <style>{`
        @media (max-width: 640px) {
          .example-page-nav {
            gap: 8px !important;
            min-height: 58px !important;
          }
          .example-nav-title {
            display: none !important;
          }
          .example-index-link {
            font-size: 10px !important;
          }
        }
      `}</style>
      <nav className="example-page-nav" style={styles.nav} aria-label="Example navigation">
        <div style={styles.navSide}>
          {prevPage && (
            <Link to={prevPage.path} style={styles.navLink}>
              <span aria-hidden="true">←</span>
              <span>
                <span style={styles.navLabel}>Previous example</span>
                <span className="example-nav-title" style={styles.navTitle}>{prevPage.title}</span>
              </span>
            </Link>
          )}
        </div>

        <Link className="example-index-link" to="/examples" style={styles.indexLink}>
          <span style={styles.indexMark} aria-hidden="true">••••</span>
          All examples
        </Link>

        <div style={{ ...styles.navSide, ...styles.navSideRight }}>
          {nextPage && (
            <Link to={nextPage.path} style={{ ...styles.navLink, ...styles.navLinkRight }}>
              <span>
                <span style={styles.navLabel}>Next example</span>
                <span className="example-nav-title" style={styles.navTitle}>{nextPage.title}</span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </nav>

      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
      </div>

      <div style={styles.content}>{children}</div>
    </article>
  )
}

const styles = {
  page: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 28px",
    boxSizing: "border-box",
  },
  nav: {
    minHeight: "72px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: "18px",
    borderBottom: "1px solid var(--surface-3)",
  },
  navSide: {
    minWidth: 0,
  },
  navSideRight: {
    display: "flex",
    justifyContent: "flex-end",
  },
  navLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
    color: "var(--text-primary)",
    textDecoration: "none",
  },
  navLinkRight: {
    textAlign: "right",
  },
  navLabel: {
    display: "block",
    color: "var(--text-secondary)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  navTitle: {
    display: "block",
    maxWidth: "240px",
    overflow: "hidden",
    color: "var(--text-primary)",
    fontSize: "13px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  indexLink: {
    display: "grid",
    justifyItems: "center",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
  },
  indexMark: {
    height: "10px",
    color: "var(--accent)",
    letterSpacing: "2px",
    lineHeight: 0.6,
  },
  header: {
    padding: "44px 0 18px",
  },
  title: {
    maxWidth: "900px",
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "clamp(2.15rem, 6vw, 4.5rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.045em",
  },
  content: {
    minWidth: 0,
  },
}
