import * as React from "react"
import type { EndpointRef, PreparedCompositionalGraph } from "./types"
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
  const interfaces: Array<{ ref: EndpointRef; label: string }> = owner
    ? [
        ...(owner.ports ?? []).map((p) => ({
          ref: endpoint(owner.id, { kind: "node", portId: p.id }),
          label: `${p.label ?? p.id} (${p.direction})`
        })),
        ...(owner.parts ?? []).flatMap((p) => [
          {
            ref: endpoint(owner.id, { kind: "part", partId: p.id }),
            label: p.label ?? p.id
          },
          ...(p.ports ?? []).map((port) => ({
            ref: endpoint(owner.id, {
              kind: "part",
              partId: p.id,
              portId: port.id
            }),
            label: `${p.label ?? p.id} / ${port.label ?? port.id} (${port.direction})`
          }))
        ])
      ]
    : []
  const selectedKey = selected ? compositionalEndpointKey(selected) : undefined
  const removed =
    !!selected &&
    (!prepared.graph.nodes.some((n) => n.id === selected.nodeId) ||
      (selected.endpoint.kind === "part" &&
        !prepared.graph.nodes
          .find((n) => n.id === selected.nodeId)
          ?.parts?.some(
            (p) => p.id === (selected.endpoint as { partId: string }).partId
          )))
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && interfaces.length) {
              event.preventDefault()
              buttons.current[0]?.focus()
            }
          }}
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
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                ownerSelect.current?.focus()
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                buttons.current[
                  (i +
                    interfaces.length +
                    (event.key === "ArrowDown" ? 1 : -1)) %
                    interfaces.length
                ]?.focus()
              }
            }}
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
