import React from "react"
import { StreamOrdinalFrame } from "semiotic"

import theme from "../../theme"

import { funnelData } from "./funnelData"
import "./bar-to-parallel.css"

const stepColors = {
  home: theme[0],
  shop: theme[1],
  basket: theme[2],
  purchase: theme[3],
  return: theme[4],
  extra: theme[5],
}

export class BarToParallel extends React.Component {
  constructor(props) {
    super(props)
    this.containerRef = React.createRef()
    this._observer = null
  }

  state = {
    containerWidth: null,
  }

  componentDidMount() {
    const el = this.containerRef.current
    if (el) {
      this._observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.setState({ containerWidth: entry.contentRect.width })
        }
      })
      this._observer.observe(el)
    }
  }

  componentWillUnmount() {
    if (this._observer) this._observer.disconnect()
  }

  render() {
    const w = this.state.containerWidth
    const frameSize = w ? [w, 500] : null

    const contentDiv = (
      <div className="infomodel-proto infomodel">
        {frameSize && <StreamOrdinalFrame
          size={frameSize}
          rAccessor={"people"}
          oAccessor={"step"}
          data={funnelData}
          barPadding={10}
          oLabel={true}
          margin={{ left: 50, bottom: 50, right: 0, top: 30 }}
          showAxes={true}
          chartType="bar"
          stackBy="country"
          pieceStyle={(d) => ({
            fill: stepColors[d.step],
            stroke: stepColors[d.step],
          })}
        />}
      </div>
    )

    return (
      <div className="bar-to-parallel__container" ref={this.containerRef}>
        <h2>Ideating within an information model</h2>
        <p>
          This simplified example shows funnel data as a bar chart using StreamOrdinalFrame.
          The original interactive stepper (bar → stacked bar → connectors → point → swarm →
          percent → brush/parallel coordinates → radial) relied on OrdinalFrame features
          not yet available in StreamOrdinalFrame (connectorType, interaction.columnsBrush,
          dynamic type switching).
        </p>
        {contentDiv}
      </div>
    )
  }
}
