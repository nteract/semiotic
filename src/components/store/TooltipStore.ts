import { createStore } from "./createStore"

let [TooltipProvider, useTooltip] = createStore((set) => ({
  tooltip: null,
  changeTooltip(tooltip) {
    set((store) => ({ ...store, tooltip }))
  }
}))

export { TooltipProvider, useTooltip }
