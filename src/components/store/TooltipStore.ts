import { createStore } from "./createStore"

let [TooltipProvider, useTooltip] = createStore((set) => ({
  tooltip: null,
  changeTooltip(tooltip) {
    set(() => ({ tooltip }))
  }
}))

export { TooltipProvider, useTooltip }
