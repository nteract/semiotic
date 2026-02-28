import React, { useState, useEffect, useRef, useCallback } from "react"
import { NavLink, useLocation } from "react-router-dom"
import navData from "./navData"

// Determine which top-level section key contains a given pathname
function findOpenSection(pathname) {
  for (const item of navData) {
    if (!item.children) continue
    // Check the section's own path
    if (item.path && pathname === item.path) return item.title
    // Check direct children
    for (const child of item.children) {
      if (child.path && pathname === child.path) return item.title
      // Check nested category children
      if (child.children) {
        for (const grandchild of child.children) {
          if (grandchild.path && pathname === grandchild.path) return item.title
        }
      }
    }
  }
  return null
}

// Tier badge configuration
const tierConfig = {
  charts: { label: "Charts", cssVar: "var(--tier-charts, #22c55e)" },
  frames: { label: "Frames", cssVar: "var(--tier-frames, #a855f7)" },
  utilities: { label: "Utilities", cssVar: "var(--tier-utilities, #f59e0b)" },
}

// --- Styles ---

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 99,
    opacity: 0,
    transition: "opacity 0.2s ease",
  },
  overlayVisible: {
    opacity: 1,
  },
  sidebar: {
    width: "var(--sidebar-width, 260px)",
    minWidth: "var(--sidebar-width, 260px)",
    backgroundColor: "var(--surface-1, #ffffff)",
    borderRight: "1px solid var(--border, #e5e7eb)",
    position: "sticky",
    top: "var(--header-height, 60px)",
    height: "calc(100vh - var(--header-height, 60px))",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px 0",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  sidebarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "var(--sidebar-width, 280px)",
    minWidth: "var(--sidebar-width, 280px)",
    height: "100vh",
    zIndex: 100,
    transform: "translateX(-100%)",
    transition: "transform 0.25s ease",
    boxShadow: "none",
  },
  sidebarMobileOpen: {
    transform: "translateX(0)",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
  },
  searchBox: {
    margin: "0 16px 16px",
    padding: "8px 12px",
    width: "calc(100% - 32px)",
    border: "1px solid var(--border, #e5e7eb)",
    borderRadius: "6px",
    backgroundColor: "var(--surface-2, #f9fafb)",
    color: "var(--text-primary, #111827)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    margin: "4px 0 0",
    cursor: "pointer",
    userSelect: "none",
    border: "none",
    background: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "1px",
    color: "var(--text-secondary, #6b7280)",
    fontWeight: 600,
    lineHeight: 1.4,
    borderRadius: 0,
    transition: "color 0.15s ease",
  },
  sectionHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  chevron: {
    fontSize: "11px",
    lineHeight: 1,
    transition: "transform 0.2s ease",
    color: "var(--text-secondary, #6b7280)",
    flexShrink: 0,
  },
  tierBadge: {
    display: "inline-block",
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    padding: "1px 6px",
    borderRadius: "9px",
    color: "#fff",
    lineHeight: "16px",
    whiteSpace: "nowrap",
  },
  collapsibleWrapper: {
    overflow: "hidden",
    transition: "max-height 0.25s ease, opacity 0.2s ease",
  },
  navLink: {
    display: "block",
    padding: "6px 16px 6px 24px",
    fontSize: "14px",
    color: "var(--text-secondary, #6b7280)",
    textDecoration: "none",
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
    lineHeight: 1.5,
  },
  navLinkActive: {
    borderLeftColor: "var(--accent, #6366f1)",
    color: "var(--accent, #6366f1)",
    backgroundColor: "var(--surface-2, #f3f4f6)",
    fontWeight: 500,
  },
  navLinkNested: {
    paddingLeft: "36px",
  },
  categoryLabel: {
    display: "block",
    padding: "10px 16px 4px 24px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: "var(--text-secondary, #6b7280)",
    opacity: 0.7,
    lineHeight: 1.4,
  },
  topLink: {
    display: "block",
    padding: "8px 16px",
    fontSize: "14px",
    color: "var(--text-secondary, #6b7280)",
    textDecoration: "none",
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
    lineHeight: 1.5,
    fontWeight: 500,
  },
  topLinkActive: {
    borderLeftColor: "var(--accent, #6366f1)",
    color: "var(--accent, #6366f1)",
    backgroundColor: "var(--surface-2, #f3f4f6)",
  },
}

// --- Sub-components ---

function TierBadge({ tier }) {
  const config = tierConfig[tier]
  if (!config) return null
  return (
    <span
      style={{
        ...styles.tierBadge,
        backgroundColor: config.cssVar,
      }}
    >
      {config.label}
    </span>
  )
}

function CollapsibleSection({ title, tier, children, defaultOpen }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(defaultOpen ? "none" : "0px")

  useEffect(() => {
    if (isOpen) {
      // Measure the content and set max-height for the transition
      const el = contentRef.current
      if (el) {
        setMaxHeight(el.scrollHeight + "px")
        // After transition completes, set to "none" so nested content can expand
        const timer = setTimeout(() => setMaxHeight("none"), 260)
        return () => clearTimeout(timer)
      }
    } else {
      // Collapse: first set to current height, then to 0
      const el = contentRef.current
      if (el) {
        setMaxHeight(el.scrollHeight + "px")
        // Force reflow then collapse
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setMaxHeight("0px")
          })
        })
      }
    }
  }, [isOpen])

  return (
    <div>
      <button
        style={styles.sectionHeader}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span style={styles.sectionHeaderLeft}>
          <span
            style={{
              ...styles.chevron,
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
            aria-hidden="true"
          >
            &#9656;
          </span>
          <span>{title}</span>
          {tier && <TierBadge tier={tier} />}
        </span>
      </button>
      <div
        ref={contentRef}
        style={{
          ...styles.collapsibleWrapper,
          maxHeight: maxHeight,
          opacity: isOpen ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SidebarNavLink({ to, children, nested, onNavigate, end }) {
  const baseStyle = nested
    ? { ...styles.navLink, ...styles.navLinkNested }
    : styles.navLink

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={({ isActive }) =>
        isActive
          ? { ...baseStyle, ...styles.navLinkActive }
          : baseStyle
      }
    >
      {children}
    </NavLink>
  )
}

function TopLevelLink({ to, children, onNavigate, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={({ isActive }) =>
        isActive
          ? { ...styles.topLink, ...styles.topLinkActive }
          : styles.topLink
      }
    >
      {children}
    </NavLink>
  )
}

// --- Main Component ---

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const sidebarRef = useRef(null)

  // Detect mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Close sidebar on navigation (mobile)
  const handleNavigate = useCallback(() => {
    if (isMobile && onClose) {
      onClose()
    }
  }, [isMobile, onClose])

  // Close sidebar on escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && isMobile && onClose) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isMobile, onClose])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [isMobile, isOpen])

  // Determine which section is active for default expansion
  const activeSection = findOpenSection(location.pathname)

  // Render a top-level nav item
  function renderNavItem(item) {
    // Top-level item without children -- direct link
    if (!item.children) {
      return (
        <TopLevelLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          onNavigate={handleNavigate}
        >
          {item.title}
        </TopLevelLink>
      )
    }

    // Top-level item with children -- collapsible section
    const isDefaultOpen = activeSection === item.title

    // Check if children are category groups (have their own children) or direct pages
    const hasCategories = item.children.some((child) => child.category && child.children)

    return (
      <CollapsibleSection
        key={item.title}
        title={item.title}
        tier={item.tier}
        defaultOpen={isDefaultOpen}
      >
        {hasCategories
          ? item.children.map((category) => (
              <div key={category.title}>
                <span style={styles.categoryLabel}>{category.title}</span>
                {category.children.map((page) => (
                  <SidebarNavLink
                    key={page.path}
                    to={page.path}
                    nested
                    onNavigate={handleNavigate}
                  >
                    {page.title}
                  </SidebarNavLink>
                ))}
              </div>
            ))
          : item.children.map((child) => (
              <SidebarNavLink
                key={child.path}
                to={child.path}
                onNavigate={handleNavigate}
              >
                {child.title}
              </SidebarNavLink>
            ))}
      </CollapsibleSection>
    )
  }

  // Build sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <nav aria-label="Documentation sidebar" ref={sidebarRef}>
      <input
        type="text"
        placeholder="Search docs..."
        style={styles.searchBox}
        aria-label="Search documentation"
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent, #6366f1)"
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border, #e5e7eb)"
        }}
      />
      {navData.map(renderNavItem)}
    </nav>
  )

  // Desktop layout
  if (!isMobile) {
    return (
      <aside style={styles.sidebar}>
        {sidebarContent}
      </aside>
    )
  }

  // Mobile layout - overlay + sliding panel
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          style={{
            ...styles.overlay,
            ...(isOpen ? styles.overlayVisible : {}),
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {/* Sidebar panel */}
      <aside
        style={{
          ...styles.sidebar,
          ...styles.sidebarMobile,
          ...(isOpen ? styles.sidebarMobileOpen : {}),
        }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

// Export a simple hamburger button component for use in the header
export function SidebarToggle({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Toggle navigation menu"
      style={{
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: 0,
        color: "var(--text-primary, #111827)",
        fontSize: "22px",
        lineHeight: 1,
        // Only show on mobile via media query workaround -- inline styles
        // can't do media queries, so we rely on the parent to conditionally render
        // or apply display via CSS. For safety we default to flex.
      }}
      className="sidebar-toggle"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )
}
