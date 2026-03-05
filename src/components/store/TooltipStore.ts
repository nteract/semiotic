"use client"
import { createStore } from "./createStore"

let [TooltipProvider, useTooltip] = createStore((set) => ({
  tooltip: null,
  changeTooltip(tooltip: any) {
    set(() => ({ tooltip }))
  }
}))

export { TooltipProvider, useTooltip }
