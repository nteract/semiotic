import * as React from "react"
import { NetworkFrame } from "../../components"
import { network_data, or_data } from "../sampledata/energy_time"
import { sankey } from "d3-sankey"

const mirroredNetworkData = [
  ...network_data.map((d) => ({
    source: d.source.id ? d.source.id : d.source,
    target: d.target.id ? d.target.id : d.target,
    value: d["2010"]
  })),
  ...network_data.map((d) => ({
    target: d.source.id ? d.source.id : d.source,
    source: d.target.id ? d.target.id : d.target,
    value: d["2050"]
  }))
]

const cyclicalData = [...network_data]

if (true) {
  cyclicalData.push({
    source: "Gas",
    target: "Gas reserves",
    value: 2500
  })
  cyclicalData.push({
    source: "Oil",
    target: "Oil reserves",
    value: 2500
  })
  cyclicalData.push({
    source: "Thermal generation",
    target: "Oil reserves",
    value: 2500
  })
}

const colors = {
  Oil: "#b3331d",
  Gas: "rgb(182, 167, 86)",
  Coal: "#00a2ce",
  Other: "grey"
}

const areaLegendGroups = [
  {
    styleFn: (d) => ({ fill: colors[d.label], stroke: "black" }),
    items: [
      { label: "Oil" },
      { label: "Gas" },
      { label: "Coal" },
      { label: "Other" }
    ]
  }
]

export default ({
  /* annotations = [], */
  type = "sankey",
  orient = "left",
  cyclical = false,
  direction,
  size = [700, 400]
}) => {
  let sankeyChart = {
    size: size,
    nodes: or_data.map((d) => Object.assign({}, d)),
    edges:
      type === "chord"
        ? mirroredNetworkData
        : cyclical
        ? cyclicalData
        : network_data,
    nodeStyle: (d) => ({
      fill: colors[d.category],
      stroke: "black"
    }),
    edgeStyle: (d) => ({
      stroke: "black",
      fill: colors[d.source.category],
      strokeWidth: 0.5,
      fillOpacity: 1,
      strokeOpacity: 1
    }),
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    nodeSizeAccessor: 5,
    hoverAnnotation: true,
    networkType: {
      type: type,
      orient: orient,
      iterations: 500,
      direction,
      nodePaddingRatio: 0.05,
      edgeSort: cyclical
        ? undefined
        : (a, b) => {
            return a.value - b.value
          },
      customSankey: sankey
    },
    legend: { legendGroups: areaLegendGroups },
    margin: { right: 130 }
  }

  if (type === "chord") {
    sankeyChart.edgeWidthAccessor = (d) => d.value
  }

  sankeyChart = {
    nodes: [{ id: "login", value: 200 }],
    edges: [
      {
        id: "login-shop-California-California",
        key: "login-shop-California-California",
        _NWFEdgeKey: "login-shop-California-California",
        source: "login",
        target: "shop",
        group: "California",
        value: 82
      },
      {
        id: "shop-cart-Colorado-Colorado",
        key: "shop-cart-Colorado-Colorado",
        _NWFEdgeKey: "shop-cart-Colorado-Colorado",
        source: "shop",
        target: "cart",
        group: "Colorado",
        value: 99
      },
      {
        id: "cart-checkout-Colombia-Colombia",
        key: "cart-checkout-Colombia-Colombia",
        _NWFEdgeKey: "cart-checkout-Colombia-Colombia",
        source: "cart",
        target: "checkout",
        group: "Colombia",
        value: 69
      }
    ],
    networkType: {
      type: "sankey",
      showArrows: true,
      zoom: direction === "off" ? false : undefined
    },
    nodeStyle: {
      fill: "#005066",
      stroke: "none"
    },
    edgeStyle: {
      fill: "blue",
      opacity: 0.5
    },
    size: size,
    margin: {
      left: 10,
      top: 10,
      bottom: 10,
      right: 10
    }
  }

  return (
    <div>
      <NetworkFrame {...sankeyChart} />
    </div>
  )
}
