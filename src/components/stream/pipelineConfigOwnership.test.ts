import { describe, expect, it } from "vitest"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { CustomLayoutSelection } from "./customLayoutSelection"

const selected: CustomLayoutSelection = {
  isActive: true,
  predicate: (d) => d.id === "a"
}

function createStore(family: string, layoutSelection?: CustomLayoutSelection) {
  const shared = {
    windowSize: 100,
    windowMode: "sliding" as const,
    extentPadding: 0.1,
    colorScheme: "category10",
    ...(layoutSelection && { layoutSelection })
  }
  switch (family) {
    case "XY": {
      const config = Object.freeze({ ...shared, chartType: "scatter" as const, arrowOfTime: "right" as const })
      return { config, store: new PipelineStore(config) }
    }
    case "ordinal": {
      const config = Object.freeze({
        ...shared,
        chartType: "bar" as const,
        projection: "vertical" as const
      })
      return { config, store: new OrdinalPipelineStore(config) }
    }
    case "network": {
      const config = Object.freeze({ ...shared, chartType: "force" as const })
      return { config, store: new NetworkPipelineStore(config) }
    }
    case "geo": {
      const config = Object.freeze({
        ...shared,
        projection: "mercator" as const
      })
      return { config, store: new GeoPipelineStore(config) }
    }
    default:
      throw new Error(`Unknown family: ${family}`)
  }
}

describe.each(["XY", "ordinal", "network", "geo"])(
  "%s pipeline config ownership",
  (family) => {
    it.each([undefined, selected])(
      "keeps caller config unchanged through selection and style updates (%j)",
      (initialSelection) => {
        // Frames memoize this object. Mutating it makes their next comparison see
        // a spurious config change, turning selection dismissal into a relayout.
        const { config, store } = createStore(family, initialSelection)
        const original = { ...config }
        store.setLayoutSelection(selected)
        store.setLayoutSelection(null)
        store.updateConfig({ colorScheme: "tableau10" })
        expect(config).toEqual(original)
        expect(config.layoutSelection).toBe(initialSelection)
        expect(config.colorScheme).toBe("category10")
      }
    )
  }
)
