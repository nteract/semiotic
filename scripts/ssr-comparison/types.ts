export interface Fixture {
  id: string
  component: string
  props: Record<string, unknown>
  coveredProps: string[]
  sha256: string
}

export interface RenderResult {
  svg: string
  evidence: Record<string, unknown> | null
}

export interface Artifact {
  source: string
  kind: "published" | "tarball" | "built"
  name: string
  version: string
  sha256: string
  integrity: string
  registry?: string
  publishedIntegrity?: string
  gitHead?: string
  checkout?: { commit: string; dirty: boolean }
  tarball: string
  packageRoot: string
}

export interface SideResult {
  status: "rendered" | "unsupported" | "error"
  reasons?: string[]
  error?: string
  renders?: RenderResult[]
  normalized?: string
  svgHash?: string
}

export interface FixtureResult {
  id: string
  component: string
  inputSha256: string
  status: "equal" | "different" | "unsupported" | "error"
  svgChanged?: boolean
  evidenceChanged?: boolean
  evidenceComparison?: "compared" | "unavailable"
  previous: SideResult
  current: SideResult
}
