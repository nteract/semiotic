import {
  clusterBarLayout,
  barLayout,
  pointLayout,
  swarmLayout,
  timelineLayout
} from "../svg/pieceLayouts"

import { genericFunction } from "../generic_utilities/functions"

export const layoutHash = {
  clusterbar: clusterBarLayout,
  bar: barLayout,
  point: pointLayout,
  swarm: swarmLayout,
  timeline: timelineLayout
}

export const midMod = (d) => (d.middle ? d.middle : 0)

export const zeroFunction = genericFunction(0)
export const twoPI = Math.PI * 2

export const naturalLanguageTypes = {
  bar: { items: "bar", chart: "bar chart" },
  clusterbar: { items: "bar", chart: "grouped bar chart" },
  swarm: { items: "point", chart: "swarm plot" },
  point: { items: "point", chart: "point plot" },
  timeline: { items: "bar", chart: "timeline" }
}
