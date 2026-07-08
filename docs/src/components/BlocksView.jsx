import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const noop = () => {}

const BlocksViewContext = createContext({
  blocksMode: false,
  blockCount: 0,
  registerBlock: () => noop,
})

let nextBlockId = 0

export function useBlocksViewState() {
  const [blocksMode, setBlocksMode] = useState(false)
  const [blockIds, setBlockIds] = useState(() => new Set())

  const registerBlock = useCallback((id) => {
    setBlockIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })

    return () => {
      setBlockIds((current) => {
        if (!current.has(id)) return current
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }, [])

  return useMemo(
    () => ({
      blocksMode,
      setBlocksMode,
      blockCount: blockIds.size,
      registerBlock,
    }),
    [blockIds.size, blocksMode, registerBlock],
  )
}

export function BlocksViewProvider({ value, children }) {
  return <BlocksViewContext.Provider value={value}>{children}</BlocksViewContext.Provider>
}

export function useBlocksView() {
  return useContext(BlocksViewContext)
}

export function useRegisterBlocksExample(enabled = true) {
  const { registerBlock } = useBlocksView()
  const blockIdRef = useRef(null)

  if (blockIdRef.current === null) {
    nextBlockId += 1
    blockIdRef.current = `blocks-example-${nextBlockId}`
  }

  useEffect(() => {
    if (!enabled) return undefined
    return registerBlock(blockIdRef.current)
  }, [enabled, registerBlock])
}

export function BlocksViewToggle({ blockCount, blocksMode, setBlocksMode }) {
  const disabled = blockCount === 0

  return (
    <button
      type="button"
      className="blocks-view-toggle"
      aria-label={blocksMode ? "Show narrative view" : "Show full code view"}
      aria-pressed={blocksMode}
      disabled={disabled}
      onClick={() => setBlocksMode((enabled) => !enabled)}
      title={disabled ? "No interactive examples on this page" : "Full code view"}
    >
      <span aria-hidden="true" className="blocks-view-toggle-icon">
        &lt;/&gt;
      </span>
      <span className="blocks-view-toggle-label">{blocksMode ? "Narrative" : "Full Code"}</span>
    </button>
  )
}

export const BLOCKS_VIEW_STYLES = `
  .blocks-view-mode {
    --blocks-bg: var(--surface-0);
    --blocks-panel: var(--surface-1);
    --blocks-panel-soft: var(--surface-2);
    --blocks-border: var(--surface-3);
    --blocks-text: var(--text-primary);
    --blocks-muted: var(--text-secondary);
  }

  .blocks-view-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--surface-3);
    border-radius: 4px;
    background: var(--surface-1);
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }

  .blocks-view-toggle:hover:not(:disabled),
  .blocks-view-toggle[aria-pressed="true"] {
    border-color: var(--text-primary);
    background: var(--text-primary);
    color: var(--surface-0);
  }

  .blocks-view-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .blocks-view-toggle-icon {
    font-family: var(--font-code);
    font-size: 12px;
    line-height: 1;
  }

  .blocks-view-actions {
    display: flex;
    justify-content: flex-end;
    margin-left: auto;
  }

  .blocks-view-mode.blocks-view-has-blocks {
    max-width: 1120px;
    color: var(--blocks-text);
  }

  .blocks-view-mode.blocks-view-has-blocks .page-breadcrumbs,
  .blocks-view-mode.blocks-view-has-blocks .page-toc,
  .blocks-view-mode.blocks-view-has-blocks .page-nav {
    display: none !important;
  }

  .blocks-view-mode.blocks-view-has-blocks .page-header,
  .blocks-view-mode.blocks-view-has-blocks .example-page-header {
    align-items: center;
    margin: 0;
    padding: 18px 0;
    border-bottom: 1px solid var(--blocks-border);
  }

  .blocks-view-mode.blocks-view-has-blocks .page-header h1,
  .blocks-view-mode.blocks-view-has-blocks .example-page-header h1 {
    color: var(--blocks-text) !important;
    font-size: 18px !important;
    letter-spacing: 0 !important;
    line-height: 1.2 !important;
  }

  .blocks-view-mode.blocks-view-has-blocks .tier-badge {
    display: none !important;
  }

  .blocks-view-mode.blocks-view-has-blocks .page-body {
    display: block !important;
  }

  .blocks-view-mode.blocks-view-has-blocks .page-content,
  .blocks-view-mode.blocks-view-has-blocks .example-page-content {
    display: grid;
    gap: 36px;
    padding: 24px 0 56px;
  }

  .blocks-view-mode.blocks-view-has-blocks:not(.blocks-view-fallback) .page-content > :not(.blocks-example),
  .blocks-view-mode.blocks-view-has-blocks:not(.blocks-view-fallback) .example-page-content > :not(.blocks-example) {
    display: none !important;
  }

  .blocks-example {
    display: grid;
    gap: 14px;
    margin: 0;
    padding: 22px 0 28px;
    border-top: 1px solid var(--blocks-border);
  }

  .blocks-example:first-child {
    border-top: 0;
  }

  .blocks-example-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0;
    color: var(--blocks-text);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.2;
  }

  .blocks-example-kicker {
    color: var(--blocks-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .blocks-example-output {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--blocks-border);
    background: var(--blocks-panel);
  }

  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content {
    display: block;
  }

  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content > * {
    margin-bottom: 24px;
  }

  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content > .blocks-example--source {
    margin-top: 36px;
    margin-bottom: 0;
  }

  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content p,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content .code-block:not(.blocks-example .code-block),
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__intro"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__lede"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__credit"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__controls"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__actions"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__implementation"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__details"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__readouts"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__roster"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__copy"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__narrative"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__essay"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="__story"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="control"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="picker"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="selector"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="filter"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content [class*="toolbar"],
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content button,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content input,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content select,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content textarea,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content form {
    display: none !important;
  }

  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content .blocks-example,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content .blocks-example *,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content .live-example,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content .live-example *,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content svg,
  .blocks-view-mode.blocks-view-fallback.blocks-view-has-blocks .example-page-content canvas {
    display: revert;
  }

  .blocks-example .code-block {
    border-color: var(--blocks-border) !important;
    border-radius: 0 !important;
    background: var(--blocks-panel-soft) !important;
  }

  @media (max-width: 640px) {
    .blocks-view-actions {
      width: 100%;
      justify-content: flex-start;
      margin: 10px 0 0;
    }

    .blocks-view-toggle {
      min-height: 38px;
    }

    .blocks-example-output {
      padding: 10px;
      overflow-x: auto;
    }
  }
`
