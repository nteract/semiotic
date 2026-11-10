/** Test-corpus metadata, not a new chart config or public renderer API. */
export interface PortableConfig {
  component: string
  props: Record<string, unknown>
}

export interface ConsumerContract {
  id: string
  file: string
  attribution: string
  useCase: string
  sources: { path: string; reference: string }[]
  coveredProps: string[]
  expected: {
    evidence: {
      frameType: "xy" | "ordinal"
      markCountByType: Record<string, number>
      annotationCount: number
      ariaLabel: string
      xDomain?: number[]
      yDomain?: number[]
      legendItems?: number
    }
    svg: {
      selector: string
      count: number
      texts?: string[]
      attributes?: Record<string, string>
      attributeIncludes?: Record<string, string>
    }[]
    startAngle?: number
    legendBelowLabel?: string
    diagnoses: string[]
    accessibilityFailures: string[]
    knownLimitations: string
  }
}

export interface LoadedContract {
  contract: ConsumerContract
  config: PortableConfig
}
