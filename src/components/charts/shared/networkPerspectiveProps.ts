import type { NetworkPerspective } from "../../stream/networkPerspective"

/** Props shared by every network-family chart. */
export interface NetworkPerspectiveProps {
  /**
   * Render the laid-out network in a parallel projection. A preset name —
   * `"isometric"` (true 30° isometric), `"pixel"` (2:1), `"dimetric"`,
   * `"military"`, `"cabinet"` — or a config object adding `elevation`,
   * `marks: "extrude"`, a ground `grid`/`plate`, `regions`, orthogonal edge
   * routing, ground-aligned labels and an animated `transition`. Layout is
   * unchanged: point marks stay upright, areas and edges lie on the ground,
   * and tooltips, keyboard focus, annotations and SSR follow the projection.
   * Best for categorical or topological positions (architecture, lineage,
   * org charts); avoid it when position encodes a measured quantity.
   * @default "flat"
   */
  perspective?: NetworkPerspective
}
