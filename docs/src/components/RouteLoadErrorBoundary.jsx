import React from "react"

export default class RouteLoadErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    const reloadHref =
      typeof window === "undefined" ? this.props.resetKey || "/" : window.location.href

    return (
      <main
        role="alert"
        style={{
          minHeight: "60vh",
          padding: "72px 28px",
          boxSizing: "border-box",
          background: "var(--surface-0)",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 680, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>This page didn&apos;t finish loading</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            A site file may have changed during your visit or the network request was interrupted.
          </p>
          <a
            href={reloadHref}
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 6,
              background: "var(--accent)",
              color: "var(--surface-0)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Reload page
          </a>
        </div>
      </main>
    )
  }
}
