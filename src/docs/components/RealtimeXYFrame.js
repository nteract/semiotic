import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { XYFrame } from "../../components"
import { curveCardinal } from "d3-shape"

const components = []

components.push({
  name: "Realtime Line CHart"
})

let fakeRealtimeDataInterval

let columnNumber = 1

const dataStart = new Date()
const eventLines = {
  information: {
    lineID: "Information",
    color: "#b6a756",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 5
      }
    ]
  },
  error: {
    lineID: "Error",
    color: "#b3331d",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 1
      }
    ]
  },
  warning: {
    lineID: "Warning",
    color: "#4d430c",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 2
      }
    ]
  }
}
const eventData = [eventLines.error, eventLines.warning, eventLines.information]

const xyAnnotation = {
  type: "xy",
  time: dataStart.getTime(),
  dy: 5,
  dx: 0,
  lineID: "Error"
}

export default class RealtimeXYFrame extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      data: eventData,
      calloutAnnotations: [xyAnnotation]
    }
  }

  componentWillUnmount() {
    clearInterval(fakeRealtimeDataInterval)
  }

  componentDidMount() {
    fakeRealtimeDataInterval = setInterval(() => {
      const newData = this.state.data
      const now = new Date()
      columnNumber += 1
      if (now.getTime() - dataStart.getTime() > 60000) {
        clearInterval(fakeRealtimeDataInterval)
      }
      const errorAmount = parseInt(Math.random() * 3, 10)
      const infoAmount = parseInt(Math.random() * 8, 10)
      const warningAmount = parseInt(Math.random() * 5, 10)

      eventLines.error.coordinates.push({
        time: now.getTime(),
        number: errorAmount
      })
      eventLines.warning.coordinates.push({
        time: now.getTime(),
        number: warningAmount
      })
      eventLines.information.coordinates.push({
        time: now.getTime(),
        number: infoAmount
      })

      xyAnnotation.column = `column-${columnNumber}`
      this.setState({
        data: newData,
        calloutAnnotations: [xyAnnotation]
      })
      xyAnnotation.time = now.getTime()
      xyAnnotation.label = (
        <tspan
          dy={-12}
          style={{
            fontWeight: 900,
            fill: "black",
            stroke: "black",
            strokeWidth: 0.5
          }}
        >{`ERRORS: ${errorAmount}`}</tspan>
      )
    }, 1000)
  }

  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: (
        <XYFrame
          size={[700, 300]}
          lines={eventData}
          lineDataAccessor={d =>
            d.coordinates.filter((p, q) => q > d.coordinates.length - 10)
          }
          xAccessor={"time"}
          yAccessor={"number"}
          lineType={{
            type:
              eventData[0].coordinates.length < 10
                ? "line"
                : eventData[0].coordinates.length < 20
                  ? "stackedarea"
                  : "bumparea",
            interpolator: curveCardinal
          }}
          lineIDAccessor="lineID"
          lineStyle={d => ({
            fill: d.color,
            stroke: d.color
          })}
          renderKey={d => d.lineID}
          axes={[{ orient: "left" }]}
          margin={{ top: 50, bottom: 0, left: 50, right: 50 }}
          annotations={this.state.calloutAnnotations}
          hoverAnnotation={true}
        />
      ),
      source: `
let fakeRealtimeDataInterval;

let columnNumber = 1;

const dataStart = new Date();
const eventLines = {
  information: {
    lineID: "Information",
    color: "#b6a756",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 5
      }
    ]
  },
  error: {
    lineID: "Error",
    color: "#b3331d",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 1
      }
    ]
  },
  warning: {
    lineID: "Warning",
    color: "#4d430c",
    coordinates: [
      {
        time: dataStart.getTime(),
        number: 2
      }
    ]
  }
};
const eventData = [
  eventLines.error,
  eventLines.warning,
  eventLines.information
];

const xyAnnotation = {
  type: "xy",
  time: dataStart.getTime(),
  dy: 5,
  dx: 0,
  lineID: "Error"
};

export default class RealtimeXYFrame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: eventData,
      calloutAnnotations: [xyAnnotation]
    };
  }

  componentWillUnmount() {
    clearInterval(fakeRealtimeDataInterval);
  }

  componentDidMount() {
    fakeRealtimeDataInterval = setInterval(() => {
      const newData = this.state.data;
      const now = new Date();
      columnNumber += 1;
      if (now.getTime() - dataStart.getTime() > 60000) {
        clearInterval(fakeRealtimeDataInterval);
      }
      const errorAmount = parseInt(Math.random() * 3);
      const infoAmount = parseInt(Math.random() * 8);
      const warningAmount = parseInt(Math.random() * 5);
      const totalEvents = errorAmount + infoAmount + warningAmount;

      eventLines.error.coordinates.push({
        time: now.getTime(),
        number: errorAmount
      });
      eventLines.warning.coordinates.push({
        time: now.getTime(),
        number: warningAmount
      });
      eventLines.information.coordinates.push({
        time: now.getTime(),
        number: infoAmount
      });

      xyAnnotation.column = ${"`column-${columnNumber}`"};
      this.setState({
        data: newData,
        calloutAnnotations: [xyAnnotation]
      });
      xyAnnotation.time = now.getTime();
      xyAnnotation.label = (
        <tspan
          dy={-12}
          style={{
            fontWeight: 900,
            fill: "black",
            stroke: "black",
            strokeWidth: 0.5
          }}
        >{${"`ERRORS: ${errorAmount}`}</tspan>"}
      );
    }, 1000);
  }

  render() {
   <XYFrame
          size={[700, 300]}
          lines={eventData}
          lineDataAccessor={d =>
            d.coordinates.filter((p, q) => q > d.coordinates.length - 10)}
          xAccessor={"time"}
          yAccessor={"number"}
          lineType={{
            type:
              eventData[0].coordinates.length < 10
                ? "line"
                : eventData[0].coordinates.length < 20
                  ? "stackedarea"
                  : "bumparea",
            interpolator: curveCardinal
          }}
          lineIDAccessor="lineID"
          lineStyle={d => ({
            fill: d.color,
            stroke: d.color
          })}
          renderKey={d => d.lineID}
          axes={[{ orient: "left" }]}
          margin={{ top: 50, bottom: 0, left: 50, right: 50 }}
          annotations={this.state.calloutAnnotations}
          hoverAnnotation={true}
        />
    }
  }

      `
    })

    return (
      <DocumentComponent
        name="Realtime Lines"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          A simple example of how to serve streaming data into an XYFrame. This
          creates a stream using a simple setInterval script. The settings are
          the same as you would see elsewhere (except with some behavior to
          filter the data and update annotations) but the important thing to
          notice is the use of{" "}
          <span style={{ fontWeight: 900 }}>renderKey</span>. When you set
          renderKey you're telling the frame how to identify a data
          visualization element--similar to the optional key function in D3's
          data(). Without setting renderKey, elements are considered to be the
          same based on array position. When you specify a renderKey this
          ensures that animated elements don't change when the amount of
          elements being sent as data to the frame changes.
        </p>
        <p>
          This example demonstrates why there needs to be a nice solution to
          interpolation of a growing line/area.
        </p>
      </DocumentComponent>
    )
  }
}

RealtimeXYFrame.title = "Realtime Lines"
