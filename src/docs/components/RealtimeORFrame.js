import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { ORFrame } from "../../components";

const components = [];

let fakeRealtimeDataInterval;

components.push({
  name: "Realtime Connected Bar Chart"
});

let columnNumber = 1;

const eventTypes = ["warning", "error", "information"];

const eventColors = {
  warning: "#4d430c",
  error: "#b3331d",
  information: "#b6a756"
};
const dataStart = new Date();

const barData = [
  {
    time: dataStart.getTime(),
    eventType: "information",
    number: 2,
    column: "column-1"
  },
  {
    time: dataStart.getTime(),
    eventType: "warning",
    number: 5,
    column: "column-1"
  },
  {
    time: dataStart.getTime(),
    eventType: "error",
    number: 1,
    column: "column-1"
  }
];
const orAnnotation = {
  type: "or",
  time: dataStart.getTime(),
  number: 2,
  dy: -20,
  dx: 0,
  id: "semiotic",
  label: "awesome?"
};

export default class RealtimeORFrame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: barData,
      calloutAnnotations: [
        orAnnotation,
        {
          type: "enclose",
          rp: "top",
          rd: 25,
          coordinates: [
            { time: dataStart.getTime(), number: 7, column: "column-1" },
            { time: dataStart.getTime(), number: 8, column: "column-1" }
          ],
          label: "Error"
        }
      ]
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

      newData.push({
        time: now.getTime(),
        eventType: "information",
        number: infoAmount,
        column: `column-${columnNumber}`
      });
      newData.push({
        time: now.getTime(),
        eventType: "warning",
        number: warningAmount,
        column: `column-${columnNumber}`
      });
      newData.push({
        time: now.getTime(),
        eventType: "error",
        number: errorAmount,
        column: `column-${columnNumber}`
      });
      if (newData.length > 60) {
        newData.splice(0, 3);
      }
      orAnnotation.time = now.getTime();
      orAnnotation.column = `column-${columnNumber}`;
      orAnnotation.number = totalEvents - errorAmount;
      orAnnotation.label = `Non-Errrors: ${totalEvents - errorAmount}`;
      orAnnotation.label = (
        <tspan
          dy={12}
          style={{
            fontWeight: 900,
            fill: "black",
            stroke: "darkred",
            strokeWidth: 0.5
          }}
        >{`Non-Errrors: ${totalEvents - errorAmount}`}</tspan>
      );
      this.setState({
        data: newData,
        calloutAnnotations: [
          orAnnotation,
          {
            type: "enclose",
            rp: "top",
            rd: 25,
            coordinates: [
              {
                time: now.getTime(),
                number: totalEvents - errorAmount,
                column: `column-${columnNumber}`
              },
              {
                time: now.getTime(),
                number: totalEvents,
                column: `column-${columnNumber}`
              }
            ],
            label: `Errors: ${errorAmount}`
          }
        ]
      });
    }, 1000);
  }

  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <ORFrame
          size={[700, 300]}
          data={barData}
          oAccessor={"column"}
          rAccessor={"number"}
          type={barData.length > 28 ? "point" : "bar"}
          style={d => ({
            fill: eventColors[d.eventType],
            stroke: eventColors[d.eventType]
          })}
          renderKey={d => d.time + d.eventType}
          axis={{ orient: "left" }}
          margin={{ top: 50, bottom: 0, left: 50, right: 50 }}
          connectorStyle={d => ({
            fill: eventColors[d.source.eventType],
            stroke: eventColors[d.source.eventType]
          })}
          connectorType={d => d.eventType}
          annotations={barData.length > 28 ? [] : this.state.calloutAnnotations}
          oPadding={10}
          hoverAnnotation={true}
          tooltipContent={({ pieces }) => (
            <div className="tooltip-content">
              <p>Errors: {pieces[2].number}</p>
              <p>Warnings: {pieces[1].number}</p>
              <p>Information: {pieces[0].number}</p>
            </div>
          )}
        />
      ),
      source: `
      `
    });

    return (
      <DocumentComponent
        name="Realtime Bars"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p />
      </DocumentComponent>
    );
  }
}

RealtimeORFrame.title = "Realtime Bars";
