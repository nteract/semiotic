/**
 * sankey-plus layout engine by Tom Shanley (@tomshanley)
 * Type declarations for Semiotic integration
 */

export interface SankeyNode {
  index: number
  x0: number
  x1: number
  y0: number
  y1: number
  value: number
  depth: number
  height: number
  column: number
  sourceLinks: SankeyLink[]
  targetLinks: SankeyLink[]
  partOfCycle: boolean
  circularLinkType?: "top" | "bottom"
  [key: string]: any
}

export interface SankeyLink {
  index: number
  source: SankeyNode | string | number
  target: SankeyNode | string | number
  value: number
  y0: number
  y1: number
  width: number
  circular: boolean
  circularLinkID?: number
  circularLinkType?: "top" | "bottom"
  circularPathData?: any
  path?: string
  [key: string]: any
}

export interface SankeyGraph {
  nodes: SankeyNode[]
  links: SankeyLink[]
  x0: number
  y0: number
  x1: number
  y1: number
  py: number
  ky: number
}

export interface SankeyLayout {
  (): SankeyGraph
  update(graph: SankeyGraph): SankeyGraph
  nodeWidth(): number
  nodeWidth(_: number): SankeyLayout
  nodePadding(): number
  nodePadding(_: number): SankeyLayout
  nodePaddingRatio(): number | null
  nodePaddingRatio(_: number): SankeyLayout
  nodes(): any
  nodes(_: any[] | ((graph: any) => any[])): SankeyLayout
  links(): any
  links(_: any[] | ((graph: any) => any[])): SankeyLayout
  nodeId(): any
  nodeId(_: ((d: any) => any)): SankeyLayout
  nodeAlign(): any
  nodeAlign(_: ((node: any, n: number) => number)): SankeyLayout
  nodeSort(): any
  nodeSort(_: ((a: any, b: any) => number) | undefined): SankeyLayout
  iterations(): number
  iterations(_: number): SankeyLayout
  circularLinkGap(): number
  circularLinkGap(_: number): SankeyLayout
  extent(): [[number, number], [number, number]]
  extent(_: [[number, number], [number, number]]): SankeyLayout
  size(): [number, number]
  size(_: [number, number]): SankeyLayout
}

export function sankeyCircular(): SankeyLayout
export function sankeyLeft(node: any): number
export function sankeyRight(node: any, n: number): number
export function sankeyCenter(node: any): number
export function sankeyJustify(node: any, n: number): number
