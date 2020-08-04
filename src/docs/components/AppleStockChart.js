import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import AppleStockChartRaw from "./AppleStockChartRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "AppleStockChart"
})

export default class AppleStockChart extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      editMode: true,
      overridePosition: {},
      annotationLabel: "annotate"
    }
  }

  render() {
    const buttons = [
      <button
        key="button-name"
        onClick={() => {
          this.setState({ annotationLabel: "change" })
        }}
      ></button>
    ]

    const examples = []
    examples.push({
      name: "Basic",
      demo: AppleStockChartRaw(
        this.state.editMode,
        {},
        () => {},
        this.state.annotationLabel
      ),
      source: ``
    })

    examples.push({
      name: "Editable Annotations",
      demo: (
        <div>
          <p>
            react-annotation already has built in functionality for adjusting
            the annotations it creates. You can activate the note editing
            control points by setting `editMode: true` on any of your
            annotations. With that in place, you can also set the drag,
            dragStart or dragEnd properties of the annotation to pass the new
            annotation position data to whatever you're using to manage state.
            In this simple example, I just override the dx/dy based on the new
            values but you could pass this back to a central annotation store or
            other method of saving changes.
          </p>
          <button
            style={{ color: "black" }}
            onClick={() => this.setState({ editMode: !this.state.editMode })}
          >
            {this.state.editMode ? "Turn off editMode" : "Turn on editMode"}
          </button>
          <button
            style={{ color: "black" }}
            onClick={() => this.setState({ annotationLabel: "birdbirdbird" })}
          >
            Change Annotation
          </button>
          {AppleStockChartRaw(
            this.state.editMode,
            this.state.overridePosition,
            d => {
              this.setState({
                overridePosition: {
                  ...this.state.overridePosition,
                  [d.noteIndex]: {
                    dx: d.updatedSettings.dx,
                    dy: d.updatedSettings.dy
                  }
                }
              })
            },
            this.state.annotationLabel
          )}
        </div>
      ),
      source: ``
    })
    return (
      <DocumentComponent
        name="Stock Chart with Annotations and Divided Line"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          A detailed example of a single chart with annotations and rich
          information display. It leverages the DividedLine component and
          built-in annotation handling to reproduce{" "}
          <a
            href="https://bl.ocks.org/susielu/23dc3082669ee026c552b85081d90976"
            target="_blank"
            rel="noopener noreferrer"
          >
            Susie Lu's Apple stock chart
          </a>
          .
        </p>
        <p>
          It also uses a custom x scale using xScaleType to pass a scale built
          with D3's scaleTime, as well as tooltip processing rules using
          tooltipContent.
        </p>
        <p>
          (If you want to see how to allow your users to edit annotations, check
          out the second example below)
        </p>
      </DocumentComponent>
    )
  }
}

AppleStockChart.title = "Annotations"
