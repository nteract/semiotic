import { NetworkLayoutMap } from "./types"
import { chordLayout } from "./chordLayout"
import { sankeyLayout } from "./sankeyLayout"
import { forceLayout, motifsLayout } from "./forceLayout"
import { hierarchyLayouts } from "./hierarchyLayout"
import { simpleLayouts } from "./simpleLayouts"

export { NetworkLayoutHandler, NetworkLayoutMap } from "./types"
export { chordLayout } from "./chordLayout"
export { sankeyLayout, sankeyOrientHash } from "./sankeyLayout"
export { forceLayout, motifsLayout } from "./forceLayout"
export { hierarchyLayouts, hierarchicalTypeHash } from "./hierarchyLayout"
export { simpleLayouts, matrixLayout, arcLayout } from "./simpleLayouts"

export const allNetworkLayouts: NetworkLayoutMap = {
  chord: chordLayout,
  sankey: sankeyLayout,
  flowchart: sankeyLayout,
  force: forceLayout,
  motifs: motifsLayout,
  ...hierarchyLayouts,
  ...simpleLayouts
}
