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
        id: "home-error-California-California",
        key: "home-error-California-California",
        _NWFEdgeKey: "home-error-California-California",
        source: "home",
        target: "error",
        group: "California",
        value: 2
      },
      {
        id: "home-login-California-California",
        key: "home-login-California-California",
        _NWFEdgeKey: "home-login-California-California",
        source: "home",
        target: "login",
        group: "California",
        value: 221
      },
      {
        id: "home-login-Colorado-Colorado",
        key: "home-login-Colorado-Colorado",
        _NWFEdgeKey: "home-login-Colorado-Colorado",
        source: "home",
        target: "login",
        group: "Colorado",
        value: 133
      },
      {
        id: "home-shop-Colorado-Colorado",
        key: "home-shop-Colorado-Colorado",
        _NWFEdgeKey: "home-shop-Colorado-Colorado",
        source: "home",
        target: "shop",
        group: "Colorado",
        value: 50
      },
      {
        id: "home-cart-Colorado-Colorado",
        key: "home-cart-Colorado-Colorado",
        _NWFEdgeKey: "home-cart-Colorado-Colorado",
        source: "home",
        target: "cart",
        group: "Colorado",
        value: 27
      },
      {
        id: "cart-checkout-Colorado-Colorado",
        key: "cart-checkout-Colorado-Colorado",
        _NWFEdgeKey: "cart-checkout-Colorado-Colorado",
        source: "cart",
        target: "checkout",
        group: "Colorado",
        value: 107
      },
      {
        id: "cart-login-Colorado-Colorado",
        key: "cart-login-Colorado-Colorado",
        _NWFEdgeKey: "cart-login-Colorado-Colorado",
        source: "cart",
        target: "login",
        group: "Colorado",
        value: 34
      },
      {
        id: "checkout-login-California-California",
        key: "checkout-login-California-California",
        _NWFEdgeKey: "checkout-login-California-California",
        source: "checkout",
        target: "login",
        group: "California",
        value: 138
      },
      {
        id: "home-login-Colombia-Colombia",
        key: "home-login-Colombia-Colombia",
        _NWFEdgeKey: "home-login-Colombia-Colombia",
        source: "home",
        target: "login",
        group: "Colombia",
        value: 3
      },
      {
        id: "home-checkout-Colombia-Colombia",
        key: "home-checkout-Colombia-Colombia",
        _NWFEdgeKey: "home-checkout-Colombia-Colombia",
        source: "home",
        target: "checkout",
        group: "Colombia",
        value: 20
      },
      {
        id: "home-cart-Colombia-Colombia",
        key: "home-cart-Colombia-Colombia",
        _NWFEdgeKey: "home-cart-Colombia-Colombia",
        source: "home",
        target: "cart",
        group: "Colombia",
        value: 21
      },
      {
        id: "home-home-Colombia-Colombia",
        key: "home-home-Colombia-Colombia",
        _NWFEdgeKey: "home-home-Colombia-Colombia",
        source: "home",
        target: "home",
        group: "Colombia",
        value: 92
      },
      {
        id: "home-error-Colombia-Colombia",
        key: "home-error-Colombia-Colombia",
        _NWFEdgeKey: "home-error-Colombia-Colombia",
        source: "home",
        target: "error",
        group: "Colombia",
        value: 35
      },
      {
        id: "checkout-login-Colorado-Colorado",
        key: "checkout-login-Colorado-Colorado",
        _NWFEdgeKey: "checkout-login-Colorado-Colorado",
        source: "checkout",
        target: "login",
        group: "Colorado",
        value: 53
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
        id: "shop-login-Colorado-Colorado",
        key: "shop-login-Colorado-Colorado",
        _NWFEdgeKey: "shop-login-Colorado-Colorado",
        source: "shop",
        target: "login",
        group: "Colorado",
        value: 50
      },
      {
        id: "shop-checkout-Colorado-Colorado",
        key: "shop-checkout-Colorado-Colorado",
        _NWFEdgeKey: "shop-checkout-Colorado-Colorado",
        source: "shop",
        target: "checkout",
        group: "Colorado",
        value: 21
      },
      {
        id: "cart-checkout-Colombia-Colombia",
        key: "cart-checkout-Colombia-Colombia",
        _NWFEdgeKey: "cart-checkout-Colombia-Colombia",
        source: "cart",
        target: "checkout",
        group: "Colombia",
        value: 69
      },
      {
        id: "cart-OLD_CHECKOUT-Colombia-Colombia",
        key: "cart-OLD_CHECKOUT-Colombia-Colombia",
        _NWFEdgeKey: "cart-OLD_CHECKOUT-Colombia-Colombia",
        source: "cart",
        target: "OLD_CHECKOUT",
        group: "Colombia",
        value: 9
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
    size: [700, 500],
    margin: {
      left: 10,
      top: 10,
      bottom: 10,
      right: 10
    },
    baseMarkProps: {
      forceUpdate: true
    }
  }

  return (
    <div>
      <NetworkFrame {...sankeyChart} />
    </div>
  )
}
