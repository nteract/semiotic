import { useMemo } from "react"
import type { KeyboardEvent } from "react"
import type { EndpointRef, PreparedCompositionalGraph } from "./types"
import { endpoint } from "./identity"

/** A semantic interface reference, independent of the caller's DOM controls. */
export interface CompositionalInterfaceItem {
  ref: EndpointRef
  label: string
  kind: "part" | "port"
}
/** Focus adapters supplied by the host's own controls. */
export interface CompositionalInterfaceFocus {
  focusOwner: () => void
  focusItem: (index: number) => void
}

/** Headless interface inventory and keyboard handlers; callers own markup and focus. */
export function useCompositionalInterfaces(
  prepared: PreparedCompositionalGraph,
  ownerId?: string
) {
  const owner = prepared.graph.nodes.find((n) => n.id === ownerId)
  const items = useMemo<CompositionalInterfaceItem[]>(
    () =>
      owner
        ? [
            ...(owner.ports ?? []).map((p) => ({
              ref: endpoint(owner.id, { kind: "node", portId: p.id }),
              label: `${p.label ?? p.id} (${p.direction})`,
              kind: "port" as const
            })),
            ...(owner.parts ?? []).flatMap((p) => [
              {
                ref: endpoint(owner.id, { kind: "part", partId: p.id }),
                label: p.label ?? p.id,
                kind: "part" as const
              },
              ...(p.ports ?? []).map((port) => ({
                ref: endpoint(owner.id, {
                  kind: "part",
                  partId: p.id,
                  portId: port.id
                }),
                label: `${p.label ?? p.id} / ${port.label ?? port.id} (${port.direction})`,
                kind: "port" as const
              }))
            ])
          ]
        : [],
    [owner]
  )
  return {
    items,
    isRemoved(selected?: EndpointRef): boolean {
      if (!selected) return false
      const node = prepared.graph.nodes.find((n) => n.id === selected.nodeId)
      if (!node) return true
      const local = selected.endpoint
      const part =
        local.kind === "part"
          ? node.parts?.find((p) => p.id === local.partId)
          : undefined
      if (local.kind === "part" && !part) return true
      return (
        !!local.portId &&
        !(local.kind === "part" ? part?.ports : node.ports)?.some(
          (p) => p.id === local.portId
        )
      )
    },
    onOwnerKeyDown(event: KeyboardEvent, focus: CompositionalInterfaceFocus) {
      if (event.key === "Enter" && items.length) {
        event.preventDefault()
        focus.focusItem(0)
      }
    },
    onItemKeyDown(
      event: KeyboardEvent,
      index: number,
      focus: CompositionalInterfaceFocus
    ) {
      if (event.key === "Escape") {
        event.preventDefault()
        focus.focusOwner()
      } else if (
        items.length &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
      ) {
        event.preventDefault()
        focus.focusItem(
          (index + items.length + (event.key === "ArrowDown" ? 1 : -1)) %
            items.length
        )
      }
    }
  }
}
