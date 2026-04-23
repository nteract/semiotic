"use client"
import { createStore } from "./createStore"

interface TooltipStoreState {
  tooltip: unknown
  changeTooltip: (tooltip: unknown) => void
}

const [TooltipProvider, useTooltip] = createStore<TooltipStoreState>((set) => ({
  tooltip: null,
  changeTooltip(tooltip: unknown) {
    set(() => ({ tooltip }))
  }
}))

export { TooltipProvider, useTooltip }
