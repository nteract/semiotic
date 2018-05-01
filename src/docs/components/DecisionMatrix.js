import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DecisionMatrixRaw from "./DecisionMatrixRaw"

import Select from "material-ui/Select"
import { MenuItem } from "material-ui/Menu"
import { InputLabel } from "material-ui/Input"
import { FormControl } from "material-ui/Form"

import { extent, mean } from "d3-array"
import { scaleLinear } from "d3-scale"
import { format } from "d3-format"
import { AnnotationCalloutCircle } from "react-annotation"
import { MATRIX_DATA } from "../sampledata/matrixData"

const components = []
const MIN_RADIUS = 10
const MAX_RADIUS = 35

components.push({
  name: "Decision Matrix Example"
})

const decisionMatrixCode = `
  
  //Assuming array of objects with below structure
  const MATRIX_DATA = [{
   "Index": 1,
   "Vendor": "Widgets R Us",
   "Cost": 3,
   "Timeline": 2,
   "Number of Employees": 300,
   "Previous Contracts": 0
  } ... ]

  //Define dpilicate axes, visible on non-integer values,
  // hidden (with labels) on integer values
  const axes = [{
    key: 'yAxis',
    orient: 'left',
    className: 'showingTickLine',
    label: {
      name: "←  Expense  →",
      position: {
        anchor: 'middle',
      },
      locationDistance: 70,
    },
    tickValues: [0.5,1.5,2.5,3.5,4.5,5.5],
    tickFormat: (d) => { return '' }
  },
  {
    key: 'xAxis',
    orient: 'bottom',
    className: 'showingTickLine',
    label: {
      name: "←  Delivery Speed  →",
      position: {
        anchor: 'middle',
      },
      locationDistance: 60,
    },
    tickValues: [0.5,1.5,2.5,3.5,4.5,5.5],
    tickFormat: (d,i) => { return '' }
  },
  {
    key: 'yAxis_labs',
    orient: 'left',
    className: 'hiddenTickLine',
    tickValues: [1,2,3,4,5],
    tickFormat: (d) => { 
      return expenseLabels[d-1]
    }
  },
  {
    key: 'xAxis_labs',
    orient: 'bottom',
    className: 'hiddenTickLine',
    tickValues: [1,2,3,4,5],
    tickFormat: (d) => { 
      return speedLabels[d-1]
    }
  }]

  function processData(data,sizeBy){
    //Augment data with radius size, subject to scale
    const scale = scaleLinear()
      .domain(extent(data.map((d)=>{return +d[sizeBy]})))
      .range([MIN_RADIUS,MAX_RADIUS]);

    data = data.map((d,i)=>{
      d.radius = sizeBy === "None" ? 10 : scale(+d[sizeBy])
      return d
    })

    //Jitter points so they dont collide with one another when xy values are similar
    //Borrowed From: https://bl.ocks.org/mbostock/6526445e2b44303eebf21da3b6627320
    const simulation = forceSimulation(data)
      .force("x", forceX((d)=>{ return +d.Timeline }).strength(1))
      .force("y", forceY((d)=>{ return +d.Cost }).strength(1))
      .force("collide", forceCollide((d)=>{return d.radius/100}))
      .stop();

    for (var i = 0; i < 120; ++i) simulation.tick();

    return data
  }

  <XYFrame
      size={[750,550]}
      margin={{top:10,right:80,bottom:80,left:100}}
      name={'Decision Matrix'}
      className="decisionMatrix"
      points={processData(MATRIX_DATA, sizeBy)}
      pointStyle={(d)=>{ return { fill:'white', stroke:'black',strokeWidth: '3px'}}}
      customPointMark={({d})=>{ return <Mark markType="circle" r={d.radius}/> }}
      renderKey={(d)=>{return d['Index']}}
      axes={axes}
      xAccessor={(d) => d.x}
      yAccessor={(d) => d.y}
      xExtent={[0.5, 5.5]}
      yExtent={[0.5, 5.5]}
      backgroundGraphics={
        <rect fill={'url(#gradient)'} x={100} y={10} width={570} height={460} />
      }
      additionalDefs={
        //Linear Gradient gives stoplight color zones to encode desirability
        <linearGradient id="gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="10%"  stopColor="green" stopOpacity={0.30}/>
          <stop offset="50%" stopColor="gold" stopOpacity={0.30}/>
          <stop offset="90%"  stopColor="red" stopOpacity={0.30}/>
        </linearGradient>
      }
      hoverAnnotation={true}
      tooltipContent={(d) => { return fetchTooltipContent(d) }}
    />
`

export default class DecisionMatrixExample extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      sizeBy: "Previous Contracts"
    }
  }

  render() {
    const decisionMatrixFrame = DecisionMatrixRaw(this.state.sizeBy)
    const examples = []
    examples.push({
      name: `Vendor Evaluation`,
      demo: decisionMatrixFrame,
      source: decisionMatrixCode
    })

    const toolTipOptions = [
      "Previous Contracts",
      "Number of Employees",
      "None"
    ].map(d => (
      <MenuItem key={`size-by-option-${d}`} value={d}>
        {d}
      </MenuItem>
    ))

    let legend = null

    if (this.state.sizeBy !== "None") {
      const ext = extent(
        MATRIX_DATA.map(d => {
          return +d[this.state.sizeBy]
        })
      )

      const scale = scaleLinear()
        .domain(ext)
        .range([MIN_RADIUS, MAX_RADIUS])

      function fetchLabel(val, sizeBy) {
        let label = val
        switch (sizeBy) {
          case "Number of Employees":
            label = `${val} Employees`
            break
          case "Previous Contracts":
            label = `${val} Contracts`
            break
        }
        return label
      }

      const radiusArray = [
        {
          r: scale(ext[0]),
          val: format(",.0f")(ext[0])
        },
        {
          r: scale(mean(ext)),
          val: format(",.0f")(mean(ext))
        },
        {
          r: scale(ext[1]),
          val: format(",.0f")(ext[1])
        }
      ]

      const legendCircles = radiusArray.map((d, i) => {
        return (
          <AnnotationCalloutCircle
            x={40}
            y={90 - i * ((MAX_RADIUS - MIN_RADIUS) / 2)}
            dy={-(d.r + d.r * 0.15)}
            dx={MAX_RADIUS + 20}
            key={`circle_annotation_${i}`}
            color={"black"}
            note={{
              label: fetchLabel(d.val, this.state.sizeBy),
              lineType: "horizontal",
              align: "left"
            }}
            connector={{ type: "elbow" }}
            subject={{ radius: d.r, radiusPadding: 0 }}
          />
        )
      })

      legend = (
        <div style={{ marginTop: "20px" }}>
          <svg className="decisionMatrixLegend" width="210px">
            {legendCircles}
          </svg>
        </div>
      )
    }

    const buttons = [
      <FormControl key="button-1">
        <InputLabel htmlFor="hover-behavior-input">Size Nodes By</InputLabel>
        <Select
          id="tooltip-selection-option"
          value={this.state.sizeBy}
          onChange={e => this.setState({ sizeBy: e.target.value })}
        >
          {toolTipOptions}
        </Select>
      </FormControl>,
      legend
    ]

    return (
      <DocumentComponent
        name="Decision Matrix Example"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          As a visual metaphor, decision matrices reside in the space between a
          traditional scatterplot and an ordinal layout. They still take
          advantage of xy positioning, but are purposefully constrained to
          ordinal buckets along the x and y axes. This leads to the marker in a
          cell view seen below.
          <br />
          <br />
          Decision matrices are commonly sourced by manually generated, small
          data (less than 100 rows) and are used to compare two or three metrics
          within the data set.
          <br />
          <br />
          Below we’ve highlighted the potential use case of vendor evaluation.
          Delivery speed and price can be compared by position in the matrix,
          with an optional radius sizing for other, less critical, metrics.
        </p>
      </DocumentComponent>
    )
  }
}

DecisionMatrixExample.title = "Decision Matrix"
