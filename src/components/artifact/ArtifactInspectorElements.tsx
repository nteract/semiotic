import type { ReactNode } from "react"
import type {
  ArtifactInspectorProps,
  ArtifactInspectorSection
} from "./ArtifactInspector"

export type DisclosureOptions = Pick<
  ArtifactInspectorProps,
  "expandedSections" | "onDisclosureChange"
>

interface DisclosureProps extends DisclosureOptions {
  section: ArtifactInspectorSection
  label: ReactNode
  children: ReactNode
  className?: string
}

export function InspectorDisclosure({
  section,
  label,
  expandedSections,
  onDisclosureChange,
  children,
  className
}: DisclosureProps) {
  const open = expandedSections?.includes(section)
  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return
        const details = event.currentTarget
        const requested = details.open
        if (open !== undefined) {
          if (requested === open) return
          details.open = open
        }
        onDisclosureChange?.(section, requested)
      }}
    >
      <summary
        onClick={
          open === undefined
            ? undefined
            : (event) => {
                event.preventDefault()
                onDisclosureChange?.(section, !open)
              }
        }
      >
        {label}
      </summary>
      {children}
    </details>
  )
}

export function renderInspectorField(
  label: string,
  content: ReactNode,
  signal?: string,
  state?: string
) {
  return (
    <div key={label} data-signal={signal} data-state={state}>
      <dt>{label}</dt>
      <dd>{content}</dd>
    </div>
  )
}

export function recordId(record: { id: string }): string {
  return record.id
}

/** An occurrence within an ID stays stable when unrelated rows move. */
export function mapInspectorRows<T>(
  rows: readonly T[],
  identify: (row: T) => string,
  render: (row: T, key: string) => ReactNode
) {
  const occurrences = new Map<string, number>()
  return rows.map((row) => {
    const id = identify(row)
    const occurrence = occurrences.get(id) ?? 0
    occurrences.set(id, occurrence + 1)
    return render(row, `${occurrence}:${id}`)
  })
}
