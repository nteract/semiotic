"use client"
import * as React from "react"
import { flattenVisible, type NavTreeNode } from "./ai/navigationTree"
import { getConversationArcStore } from "./ai/conversationArc"
import {
  useObservationSelector,
  type ChartObservation,
  type OnObservationCallback
} from "./store/ObservationStore"
import {
  annotationStableId,
  type OnAnnotationActivateCallback
} from "./charts/shared/annotationActivation"

/**
 * AccessibleNavTree — renders a `buildNavigationTree()` structure as a WAI-ARIA
 * `tree` widget: a screen-reader-traversable hierarchy of chart → axes/series →
 * data points (the Olli / Data Navigator model). Keyboard: Up/Down move between
 * visible rows, Right expands / descends, Left collapses / ascends, Home/End
 * jump, Enter/Space toggles. Screen-reader-only by default; pass `visible` to
 * show it. This is the structure ChartContainer mounts for its `navigable` opt-in.
 */

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden",
  clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0, padding: 0, margin: -1,
}

export interface AccessibleNavTreeProps {
  tree: NavTreeNode
  /** Accessible name for the tree. */
  label?: string
  /** Show the tree visibly (default: screen-reader-only). */
  visible?: boolean
  className?: string
  /** Fired when the active node changes (e.g. to highlight the matching mark). */
  onActiveChange?: (node: NavTreeNode) => void
  /**
   * Controlled active node id. When provided, the parent owns the active node
   * (e.g. `useNavigationSync` driving it from the chart's hover). The tree
   * auto-expands the path to a controlled active node so it stays visible.
   */
  activeId?: string
  /**
   * `chartId` of the chart this tree describes. Correlates the reception
   * telemetry the tree emits (`nav-node-focused` / `nav-branch-expanded`
   * conversation-arc events) back to the chart. Events are only recorded while
   * the conversation-arc store is enabled — zero-overhead otherwise.
   */
  chartId?: string
  /** Normalized focus/activation events produced by structured navigation. */
  onObservation?: OnObservationCallback
  /** Observe activation of an annotation leaf in the navigation tree. */
  onAnnotationActivate?: OnAnnotationActivateCallback
}

function buildParentMap(root: NavTreeNode): Map<string, NavTreeNode> {
  const parents = new Map<string, NavTreeNode>()
  const walk = (node: NavTreeNode) => {
    for (const c of node.children ?? []) {
      parents.set(c.id, node)
      walk(c)
    }
  }
  walk(root)
  return parents
}

export function AccessibleNavTree({ tree, label, visible = false, className, onActiveChange, activeId: controlledActiveId, chartId, onObservation, onAnnotationActivate }: AccessibleNavTreeProps) {
  // Start with the root expanded so its direct children (axes, series) are
  // visible; deeper branches collapse until the user drills in.
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set([tree.id]))
  const [internalActiveId, setInternalActiveId] = React.useState<string>(tree.id)
  const isControlled = controlledActiveId !== undefined
  const activeId = isControlled ? controlledActiveId : internalActiveId
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<Map<string, HTMLLIElement | null>>(new Map())
  const pushObservation = useObservationSelector((state) => state.pushObservation)

  const emitObservation = React.useCallback((observation: ChartObservation) => {
    onObservation?.(observation)
    pushObservation?.(observation)
  }, [onObservation, pushObservation])

  const parentMap = React.useMemo(() => buildParentMap(tree), [tree])
  const order = React.useMemo(() => flattenVisible(tree, expanded), [tree, expanded])

  // If the tree changes (new data) and the (uncontrolled) active node vanished, reset.
  React.useEffect(() => {
    if (isControlled) return
    if (!order.some((n) => n.id === internalActiveId)) setInternalActiveId(tree.id)
  }, [order, internalActiveId, tree.id, isControlled])

  // Auto-expand the path to the active node so it's visible/focusable — matters
  // when the active node is set externally (canvas → tree) into a collapsed branch.
  React.useEffect(() => {
    const path: string[] = []
    let cur = parentMap.get(activeId)
    while (cur) { path.push(cur.id); cur = parentMap.get(cur.id) }
    if (path.length > 0) {
      setExpanded((s) => {
        if (path.every((id) => s.has(id))) return s
        const n = new Set(s)
        for (const id of path) n.add(id)
        return n
      })
    }
  }, [activeId, parentMap])

  // Move DOM focus to the active item — but only while the tree already holds
  // focus, so we never steal focus on mount or data change.
  React.useEffect(() => {
    if (containerRef.current?.contains(document.activeElement)) {
      itemRefs.current.get(activeId)?.focus()
    }
  }, [activeId])

  // Reception telemetry — only genuine tree interaction (keyboard/click) is
  // recorded; externally-driven active changes (canvas → tree sync) flow
  // through the `activeId` prop, not `setActive`, so they aren't double-counted
  // as a reader's own traversal. No-op (and allocation-free) while disabled.
  const recordNav = React.useCallback(
    (node: NavTreeNode, kind: "focus" | "toggle", expandedNext?: boolean) => {
      const store = getConversationArcStore()
      if (!store.enabled) return
      if (kind === "focus") {
        store.record({
          type: "nav-node-focused",
          chartId, nodeId: node.id, role: node.role, level: node.level,
          label: node.label.length > 200 ? node.label.slice(0, 200) : node.label,
        })
      } else {
        store.record({
          type: "nav-branch-expanded",
          chartId, nodeId: node.id, role: node.role, level: node.level, expanded: !!expandedNext,
        })
      }
    },
    [chartId]
  )

  const setActive = React.useCallback((node: NavTreeNode) => {
    // No-op when the node is already active (ArrowDown on the last item,
    // re-clicking the active row, etc.). `onActiveChange` fires only "when the
    // active node changes", and skipping it here also avoids redundant
    // selection writes and double-counted reception telemetry.
    if (node.id === activeId) return
    if (!isControlled) setInternalActiveId(node.id)
    onActiveChange?.(node)
    recordNav(node, "focus")
    if (node.datum) {
      emitObservation({
        type: "focus",
        datum: node.datum,
        inputType: "navigation-tree",
        timestamp: Date.now(),
        chartType: "AccessibleNavTree",
        chartId
      })
    }
  }, [onActiveChange, isControlled, recordNav, activeId, emitObservation, chartId])

  const activateNode = React.useCallback((node: NavTreeNode) => {
    if (!node.datum) return
    if (node.role === "annotation") {
      const annotationId = annotationStableId(node.datum)
      onAnnotationActivate?.({
        annotation: node.datum,
        annotationId,
        chartId,
        inputType: "navigation-tree"
      })
      if (annotationId) {
        emitObservation({
          type: "annotation-activate",
          annotationId,
          inputType: "navigation-tree",
          timestamp: Date.now(),
          chartType: "AccessibleNavTree",
          chartId
        })
      }
      return
    }
    emitObservation({
      type: "activate",
      datum: node.datum,
      inputType: "navigation-tree",
      timestamp: Date.now(),
      chartType: "AccessibleNavTree",
      chartId
    })
  }, [chartId, emitObservation, onAnnotationActivate])

  const expand = (node: NavTreeNode) => { setExpanded((s) => new Set(s).add(node.id)); recordNav(node, "toggle", true) }
  const collapse = (node: NavTreeNode) => { setExpanded((s) => { const n = new Set(s); n.delete(node.id); return n }); recordNav(node, "toggle", false) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = order.findIndex((n) => n.id === activeId)
    if (idx === -1) return
    const node = order[idx]
    const hasChildren = !!node.children && node.children.length > 0
    const isOpen = expanded.has(node.id)
    let handled = true
    switch (e.key) {
      case "ArrowDown": setActive(order[Math.min(idx + 1, order.length - 1)]); break
      case "ArrowUp": setActive(order[Math.max(idx - 1, 0)]); break
      case "Home": setActive(order[0]); break
      case "End": setActive(order[order.length - 1]); break
      case "ArrowRight":
        if (hasChildren && !isOpen) expand(node)
        else if (hasChildren && isOpen) setActive(node.children![0])
        else handled = false
        break
      case "ArrowLeft":
        if (hasChildren && isOpen) collapse(node)
        else {
          const parent = parentMap.get(node.id)
          if (parent) setActive(parent)
          else handled = false
        }
        break
      case "Enter":
      case " ":
        if (hasChildren) (isOpen ? collapse : expand)(node)
        else activateNode(node)
        break
      default: handled = false
    }
    if (handled) { e.preventDefault(); e.stopPropagation() }
  }

  const renderNode = (node: NavTreeNode, posinset: number, setsize: number): React.ReactNode => {
    const hasChildren = !!node.children && node.children.length > 0
    const isOpen = expanded.has(node.id)
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-label={node.label}
        aria-level={node.level}
        aria-posinset={posinset}
        aria-setsize={setsize}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={node.id === activeId}
        tabIndex={node.id === activeId ? 0 : -1}
        ref={(el) => { itemRefs.current.set(node.id, el) }}
        onClick={(e) => {
          e.stopPropagation()
          setActive(node)
          if (hasChildren) (isOpen ? collapse : expand)(node)
          else activateNode(node)
        }}
        style={visible ? {
          listStyle: "none",
          padding: "2px 6px",
          paddingLeft: 6 + (node.level - 1) * 16,
          cursor: hasChildren ? "pointer" : "default",
          fontSize: 13,
          color: "var(--semiotic-text, currentColor)",
          background: node.id === activeId ? "var(--semiotic-surface, var(--semiotic-grid, var(--semiotic-bg, #f0f4f8)))" : "transparent",
          outline: "none",
        } : undefined}
      >
        <span className={`semiotic-nav-tree-label semiotic-nav-tree-${node.role}`}>
          {visible && hasChildren ? (isOpen ? "▾ " : "▸ ") : ""}{node.label}
        </span>
        {hasChildren && isOpen && (
          <ul role="group" style={visible ? { margin: 0, padding: 0 } : undefined}>
            {node.children!.map((c, i) => renderNode(c, i + 1, node.children!.length))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div
      ref={containerRef}
      className={"semiotic-nav-tree" + (className ? ` ${className}` : "")}
      style={visible ? undefined : SR_ONLY}
      onKeyDown={onKeyDown}
    >
      <ul role="tree" aria-label={label || "Chart navigation"} style={visible ? { margin: 0, padding: 0 } : undefined}>
        {renderNode(tree, 1, 1)}
      </ul>
    </div>
  )
}
