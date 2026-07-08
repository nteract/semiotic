import React, { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  BLOCKS_VIEW_STYLES,
  BlocksViewProvider,
  BlocksViewToggle,
  useBlocksViewState,
} from "../../components/BlocksView"
import CodeBlock from "../../components/CodeBlock"
import { EXAMPLES } from "./examplesManifest"
import { getExampleSourceLoader } from "./exampleSourceMap"

export default function ExamplePageLayout({
  title,
  prevPage,
  nextPage,
  children,
  useFullCodeFallback = true,
}) {
  // Prev/next derive from the examples manifest (the single source of the
  // narrative order), keyed by the current route — reordering the section
  // never requires touching individual pages. Explicit props still win for
  // one-off overrides.
  const { pathname } = useLocation()
  const index = EXAMPLES.findIndex((example) => example.path === pathname)
  const prev = prevPage ?? (index > 0 ? EXAMPLES[index - 1] : undefined)
  const next = nextPage ?? (index >= 0 ? EXAMPLES[index + 1] : undefined)
  const sourceLoader = useMemo(() => getExampleSourceLoader(pathname), [pathname])
  const [sourceCode, setSourceCode] = useState("")
  const hasFullCodeFallback = useFullCodeFallback && Boolean(sourceLoader)
  const blocksView = useBlocksViewState()
  const { blockCount, blocksMode, registerBlock, setBlocksMode } = blocksView
  const fallbackBlockId = useMemo(() => `example-full-code-${pathname}`, [pathname])

  useEffect(() => {
    if (!hasFullCodeFallback) return undefined
    return registerBlock(fallbackBlockId)
  }, [fallbackBlockId, hasFullCodeFallback, registerBlock])

  useEffect(() => {
    let cancelled = false
    setSourceCode("")
    if (!sourceLoader) return undefined

    sourceLoader().then((source) => {
      if (!cancelled) setSourceCode(source)
    })

    return () => {
      cancelled = true
    }
  }, [sourceLoader])
  const pageClassName = [
    "example-page",
    blocksMode ? "blocks-view-mode" : "",
    blockCount > 0 ? "blocks-view-has-blocks" : "",
    hasFullCodeFallback ? "blocks-view-fallback" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <BlocksViewProvider value={blocksView}>
      <article className={pageClassName} style={styles.page}>
        <style>{`
        ${BLOCKS_VIEW_STYLES}

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
            {prev && (
              <Link to={prev.path} style={styles.navLink}>
                <span aria-hidden="true">←</span>
                <span>
                  <span style={styles.navLabel}>Previous example</span>
                  <span className="example-nav-title" style={styles.navTitle}>
                    {prev.title}
                  </span>
                </span>
              </Link>
            )}
          </div>

          <Link className="example-index-link" to="/examples" style={styles.indexLink}>
            <span style={styles.indexMark} aria-hidden="true">
              ••••
            </span>
            All examples
          </Link>

          <div style={{ ...styles.navSide, ...styles.navSideRight }}>
            {next && (
              <Link to={next.path} style={{ ...styles.navLink, ...styles.navLinkRight }}>
                <span>
                  <span style={styles.navLabel}>Next example</span>
                  <span className="example-nav-title" style={styles.navTitle}>
                    {next.title}
                  </span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </nav>

        <div className="example-page-header" style={styles.header}>
          <h1 style={styles.title}>{title}</h1>
          <div className="blocks-view-actions">
            <BlocksViewToggle
              blockCount={blockCount}
              blocksMode={blocksMode}
              setBlocksMode={setBlocksMode}
            />
          </div>
        </div>

        <div className="example-page-content" style={styles.content}>
          {children}
          {blocksMode && hasFullCodeFallback && (
            <section className="blocks-example blocks-example--source">
              <h2 className="blocks-example-title">Full Code</h2>
              <CodeBlock
                code={sourceCode || "Loading source..."}
                language="jsx"
                showCopyButton
                wrap
              />
            </section>
          )}
        </div>
      </article>
    </BlocksViewProvider>
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
