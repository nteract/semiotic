import * as React from "react"
import type { EndpointRef, PreparedCompositionalGraph } from "./types"
import { useCompositionalInterfaces } from "./useCompositionalInterfaces"
import { compositionalEndpointKey, endpoint } from "./identity"

export interface CompositionalNavigatorProps {
  prepared: PreparedCompositionalGraph
  selected?: EndpointRef
  onSelect: (endpoint: EndpointRef) => void
  /** Disclose a collapsed/virtualized interface without changing selection. */
  proxy?: boolean
}

/** Native controls expose parts and ports even when their graphical marks are hidden. */
export function CompositionalNavigator({
  prepared,
  selected,
  onSelect,
  proxy
}: CompositionalNavigatorProps) {
  const owner =
    prepared.graph.nodes.find((n) => n.id === selected?.nodeId) ??
    prepared.graph.nodes[0]
  const ownerSelect = React.useRef<HTMLSelectElement>(null)
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([])
  const {
    items: interfaces,
    isRemoved,
    onOwnerKeyDown,
    onItemKeyDown
  } = useCompositionalInterfaces(prepared, owner?.id)
  const selectedKey = selected ? compositionalEndpointKey(selected) : undefined
  const removed = isRemoved(selected)
  const focus = {
    focusOwner: () => ownerSelect.current?.focus(),
    focusItem: (index: number) => buttons.current[index]?.focus()
  }
  return (
    <div
      className="compositional-navigator"
      aria-label="Semantic interface navigation"
    >
      <label>
        Inspect an interface owner
        <select
          ref={ownerSelect}
          value={owner?.id ?? ""}
          onChange={(event) => onSelect(endpoint(event.target.value))}
          onKeyDown={(event) => onOwnerKeyDown(event, focus)}
        >
          {prepared.graph.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label ?? n.id}
            </option>
          ))}
        </select>
      </label>
      <div role="group" aria-label="Parts and named ports">
        {interfaces.map((item, i) => (
          <button
            key={compositionalEndpointKey(item.ref)}
            type="button"
            ref={(element) => {
              buttons.current[i] = element
            }}
            aria-pressed={selectedKey === compositionalEndpointKey(item.ref)}
            onClick={() => onSelect(item.ref)}
            onKeyDown={(event) => onItemKeyDown(event, i, focus)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span role="status">
        {removed
          ? "Selected interface was removed from the supplied graph."
          : proxy
            ? "Selected interface is represented by a boundary proxy."
            : "Enter an owner to navigate its interfaces; Escape returns to the owner."}
      </span>
    </div>
  )
}
