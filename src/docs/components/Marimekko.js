import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import MarimekkoRaw from "./MarimekkoRaw"
const components = []

components.push({
  name: "Marimekko"
})

export default class MarimekkoDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: MarimekkoRaw,
      source: `
    const colors = {
        "Almond lovers": '#00a2ce',
        "Berry buyers": '#4d430c',
        "Carrots-n-more": '#b3331d',
        "Delicious-n-new": '#b6a756'
    }
    const data = [
        {"market": "Auburn, AL", "segment": "Almond lovers", "value": 3840, pct: .54},
        {"market": "Auburn, AL", "segment": "Berry buyers", "value": 1920, pct: .27 },
        {"market": "Auburn, AL", "segment": "Carrots-n-more", "value": 960, pct: .135},
        {"market": "Auburn, AL", "segment": "Delicious-n-new", "value": 400, pct: .055},
        {"market": "Birmingham, AL", "segment": "Almond lovers", "value": 1600, pct: .36},
        {"market": "Birmingham, AL", "segment": "Berry buyers", "value": 1440, pct: .33},
        {"market": "Birmingham, AL", "segment": "Carrots-n-more", "value": 960, pct: .22},
        {"market": "Birmingham, AL", "segment": "Delicious-n-new", "value": 400, pct: .091},
        {"market": "Gainesville, FL", "segment": "Almond lovers", "value": 640, pct: .24},
        {"market": "Gainesville, FL", "segment": "Berry buyers", "value": 960, pct: .36},
        {"market": "Gainesville, FL", "segment": "Carrots-n-more", "value": 640, pct: .24},
        {"market": "Gainesville, FL", "segment": "Delicious-n-new", "value": 400, pct: .16},
        {"market": "Durham, NC", "segment": "Almond lovers", "value": 320, pct: .17},
        {"market": "Durham, NC", "segment": "Berry buyers", "value": 480, pct: .26},
        {"market": "Durham, NC", "segment": "Carrots-n-more", "value": 640, pct: .35},
        {"market": "Durham, NC", "segment": "Delicious-n-new", "value": 400, pct: .22}
    ]
      <ORFrame
    size={[ 700,400 ]}
    data={data}
    rAccessor={d => d.pct}
    oAccessor={d => d.market}
    dynamicColumnWidth={"value"}
    style={(d,i) => ({ fill: colors[d.segment], stroke: "white", strokeWidth: 1 })}
    type={"bar"}
    axis={{ orient: 'left', tickFormat: d => Math.floor(d * 100) + "%"}}
    margin={{ left: 45, top: 10, bottom: 80, right: 50 }}
    oPadding={0}
    oLabel={d => <text transform="rotate(45)">{d}</text>
      `
    })

    return (
      <DocumentComponent
        name="Marimekko Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The Marimekko chart shows aggregate value of segments along with
          percent breakdown in each segment. It takes advantage of using the
          dynamicColumnWidth setting to encode one value (raw value of sales in
          a region) while the rAccessor uses a separate value (percent of sales
          in a region by brand).
        </p>
      </DocumentComponent>
    )
  }
}

MarimekkoDocs.title = "Marimekko Chart"
