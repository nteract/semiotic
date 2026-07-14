import React from "react"
import { Link } from "react-router-dom"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useElementSize from "../../hooks/useElementSize"
import ThemeToggle from "../../components/ThemeToggle"

const semioticLogo = new URL(
  "../../../public/assets/img/semiotic.png",
  import.meta.url
).href
const semioticLogoDark = new URL(
  "../../../public/assets/img/semiotic-darkmode.png",
  import.meta.url
).href

export default function ExamplesLayout({ children }) {
  const [theme, toggleTheme] = useDocsTheme()
  const [topBarRef, topBarSize] = useElementSize({ height: 77 })

  return (
    <div
      style={{ ...styles.shell, "--examples-sticky-offset": `${topBarSize.height}px` }}
      className="examples-shell"
    >
      <header ref={topBarRef} style={styles.topBar} className="examples-top-bar">
        <div style={styles.topBarInner} className="examples-top-bar-inner">
          <Link to="/" style={styles.logoLink} aria-label="Semiotic home">
            <img
              src={theme === "dark" ? semioticLogoDark : semioticLogo}
              alt="Semiotic"
              style={styles.logo}
            />
          </Link>
          <Link to="/examples" style={styles.sectionLink}>Examples</Link>
          <div style={styles.topBarRight} className="examples-top-bar-right">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <Link to="/getting-started" style={styles.utilityLink}>Docs</Link>
            <a
              href="https://github.com/nteract/semiotic"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.utilityLink}
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main style={styles.main} className="examples-main">{children}</main>

      <footer style={styles.footer}>
        <div style={styles.footerInner} className="examples-footer-inner">
          <Link to="/examples" style={styles.footerLink}>All examples</Link>
          <span style={styles.footerNote}>Built with Semiotic</span>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--surface-0)",
    color: "var(--text-primary)",
  },
  topBar: {
    width: "100%",
    boxSizing: "border-box",
  },
  topBarInner: {
    width: "100%",
    maxWidth: 1240,
    margin: "0 auto",
    padding: "20px 28px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  logoLink: {
    display: "inline-flex",
    alignItems: "center",
  },
  logo: {
    width: "auto",
    height: "36px",
    display: "block",
  },
  sectionLink: {
    color: "var(--text-secondary)",
    fontSize: "17px",
    fontStyle: "italic",
    textDecoration: "none",
  },
  topBarRight: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  utilityLink: {
    color: "var(--text-primary)",
    fontSize: "13px",
    textDecoration: "none",
  },
  main: {
    flex: 1,
    width: "100%",
  },
  footer: {
    marginTop: "64px",
    borderTop: "1px solid var(--surface-3)",
  },
  footerInner: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "24px 28px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  footerLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
  },
  footerNote: {
    opacity: 0.72,
  },
}
