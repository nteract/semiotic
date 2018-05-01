import React from "react"
import { OrdinalFrame } from "../../components"

import DocumentComponent from "../layout/DocumentComponent"

import { PatternWaves } from "@vx/pattern"

const glowyCanvas = (canvas, context, size) => {
  const dataURL = canvas.toDataURL("image/png")
  const baseImage = document.createElement("img")

  baseImage.src = dataURL
  baseImage.onload = () => {
    context.clearRect(0, 0, size[0] + 120, size[1] + 120)
    context.filter = "blur(10px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "blur(5px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "none"
    context.drawImage(baseImage, 0, 0)
  }
}

const gradient = (
  <linearGradient x1="0" x2="0" y1="0" y2="1" id="paleWoodGradient">
    <stop stopColor="#FF4E50" offset="0%" />
    <stop stopColor="#F9D423" offset="100%" />
  </linearGradient>
)

const trianglePattern = (
  <pattern id="Triangle" width="10" height="10" patternUnits="userSpaceOnUse">
    <rect fill="#b3331d" width="10" height="10" />
    <circle fill="rgb(211, 135, 121)" r="5" cx="3" cy="3" />
  </pattern>
)

const barChartSettings = {
  size: [220, 220],
  data: [5, 8, 2, 3, 10],
  type: "bar",
  oPadding: 5,
  margin: 20
}

const waves = (
  <PatternWaves
    id="waves-texture"
    key="Waves"
    height={6}
    width={6}
    background="#b6a756"
    stroke="black"
    strokeWidth={1}
    complement
  />
)

const components = []

components.push({
  name: "Using Patterns and Textures"
})

export default class UsingPatternsTextures extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Using Textures",
      demo: (
        <div>
          <iframe
            title="patterns-textures-video"
            width="560"
            height="315"
            src="https://www.youtube.com/embed/8A5P3p74pcQ"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          <p>
            We'll get started with using textures for a visualization like this
            bar chart. You can use textures in a couple different ways:
          </p>
          <ol>
            <li>Make your own textures by hand</li>
            <li>
              Use a texture generating library like textures.js (or the react
              equivalent: vx/patterns)
            </li>
          </ol>
          <p>
            This example uses both. Notice that textures are added to the defs
            of an SVG by adding them to the additionalDefs property of the frame
            and then referenced as the fill property of the items in the frame.
          </p>
          <div>
            <div
              style={{
                display: "inline-block",
                width: "220px",
                height: "220px"
              }}
            >
              <OrdinalFrame
                size={[220, 220]}
                title="vx/pattern"
                data={[5, 8, 2, 3, 10]}
                type="bar"
                style={{ fill: "url(#waves-texture)" }}
                additionalDefs={waves}
                oPadding={2}
                margin={20}
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "220px",
                height: "220px"
              }}
            >
              <OrdinalFrame
                size={[220, 220]}
                title="Basic Gradient"
                data={[5, 8, 2, 3, 10]}
                type="bar"
                style={{ fill: "url(#paleWoodGradient)" }}
                additionalDefs={gradient}
                oPadding={2}
                margin={20}
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "220px",
                height: "220px"
              }}
            >
              <OrdinalFrame
                size={[220, 220]}
                title="Custom Pattern"
                data={[5, 8, 2, 3, 10]}
                type="bar"
                style={{ fill: "url(#Triangle)" }}
                additionalDefs={trianglePattern}
                oPadding={2}
                margin={20}
              />
            </div>
          </div>
        </div>
      ),
      source: `
      import { PatternWaves } from "@vx/pattern"

      const barChartSettings = {
        size: [ 220, 220 ],
        data: [5, 8, 2, 3, 10],
        type: "bar",
        oPadding: 2,
        margin: 20
      }

      const waves = (
        <PatternWaves
          id="waves-texture"
          key="Waves"
          height={6}
          width={6}
          background="#00a2ce"
          stroke="black"
          strokeWidth={1}
          complement
        />
      )
      
      <OrdinalFrame
      {...barChartSettings}
      title="vx/pattern"
      style={{ fill: "url(#waves-texture)" }}
      additionalDefs={waves}
    />

    const gradient = (
      <linearGradient y2="1" id="paleWoodGradient">
        <stop stopColor="#8E0E00" offset="0%" />
        <stop stopColor="#1F1C18" offset="100%" />
      </linearGradient>
    )

    <OrdinalFrame
      {...barChartSettings}
      title="Basic Gradient"
      style={{ fill: "url(#paleWoodGradient)" }}
      additionalDefs={gradient}
    />

    const trianglePattern = (
      <pattern id="Triangle" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect fill="#b3331d" width="10" height="10" />
        <polygon fill="rgb(211, 135, 121)" points="5,0 10,10 0,10" />
      </pattern>
    )
    
    <OrdinalFrame
      {...barChartSettings}
      title="Custom Pattern"
      style={{ fill: "url(#Triangle)" }}
      additionalDefs={trianglePattern}
    />`
    })

    examples.push({
      name: "Semiotic Mark Render Modes",
      demo: (
        <div>
          <p>
            Under the hood, Semiotic uses the semiotic-mark library, which
            allows you to declare different render modes that can produce what's
            called non-photorealistic rendering, better known as "sketchy"
            rendering, as well as "painty" rendering. To enable this, you send
            the corresponding renderMode of the item you want rendered in a
            different fashion either "sketchy" or "painty" or a function that
            takes the item and returns "sketchy" or "painty". Sketchy fill
            density reflects the fillOpacity sent to the object, with higher
            opacity giving more fill lines.
          </p>
          <ol>
            <li>XYFrame: pointRenderMode, areaRenderMode, lineRenderMode</li>
            <li>OrdinalFrame: renderMode, summaryRenderMode</li>
            <li>NetworkFrame: nodeRenderMode, edgeRenderMode</li>
          </ol>
          <div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                title="sketchy"
                style={(d, i) => ({
                  fill: "#b6a756",
                  fillOpacity: 0.2 + i * 0.2
                })}
                oLabel={d => (
                  <text textAnchor="middle">{`${(0.2 + d * 0.2).toFixed(
                    1
                  )}`}</text>
                )}
                renderMode="sketchy"
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                title="painty"
                style={{ fill: "#b6a756" }}
                renderMode="painty"
                oPadding={10}
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                title="Sketchy + Gradient"
                style={{ fill: "url(#paleWoodGradient)" }}
                additionalDefs={gradient}
                renderMode="sketchy"
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                title="Painty + Gradient"
                style={{ fill: "url(#paleWoodGradient)" }}
                additionalDefs={gradient}
                oPadding={10}
                renderMode="painty"
              />
            </div>
          </div>
        </div>
      ),
      source: ``
    })

    examples.push({
      name: "Canvas Post-Processing",
      demo: (
        <div>
          <p>
            Except for summary types and custom shape types, frames can render
            their graphics in canvas. This can be useful to reduce the number of
            nodes in the DOM, which can show performance gains. Canvas graphics
            will not be animated.
          </p>
          <ol>
            <li>XYFrame: canvasPoints, canvasAreas, canvasLines</li>
            <li>OrdinalFrame: canvasPieces</li>
            <li>NetworkFrame: canvasNodes, canvasEdges</li>
          </ol>
          <p>
            Additionally the canvas itself can be used for post-processing
            effects using the frames canvasPostProcess property, which will be
            sent (canvas, context, size) is shown below using the demo
            "chuckClose" restyling (which does a fun Chuck Close style filter)
            and also a custom glow filter.
          </p>
          <div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                style={d => ({
                  fill: "#b6a756",
                  stroke: "#b6a756"
                })}
                oPadding={15}
                canvasPieces={true}
                canvasPostProcess={"chuckClose"}
              />
            </div>
            <div
              style={{
                display: "inline-block",
                width: "350px",
                height: "350px"
              }}
            >
              <OrdinalFrame
                {...barChartSettings}
                size={[350, 350]}
                title="painty"
                style={{ fill: "#b6a756" }}
                canvasPieces={true}
                canvasPostProcess={glowyCanvas}
              />
            </div>
          </div>
        </div>
      ),
      source: `
  const glowyCanvas = (canvas, context, size) => {
    const dataURL = canvas.toDataURL("image/png")
    const baseImage = document.createElement("img")
  
    baseImage.src = dataURL
    baseImage.onload = () => {
      context.clearRect(0, 0, size[0] + 120, size[1] + 120)
      context.filter = "blur(10px)"
      context.drawImage(baseImage, 0, 0)
      context.filter = "blur(5px)"
      context.drawImage(baseImage, 0, 0)
      context.filter = "none"
      context.drawImage(baseImage, 0, 0)
    }
  }

  <OrdinalFrame
  {...barChartSettings}
  size={[350, 350]}
  title="painty"
  style={{ fill: "#b6a756" }}
  canvasPieces={true}
  canvasPostProcess={glowyCanvas}
  />

  <OrdinalFrame
  {...barChartSettings}
  size={[350, 350]}
  style={(d, i) => ({
    fill: "#b6a756",
    stroke: "#b6a756"
  })}
  oPadding={15}
  canvasPieces={true}
  canvasPostProcess={"chuckClose"}
  />`
    })

    return (
      <DocumentComponent
        name="Using Patterns and Textures"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Semiotic does a few things to make it easier for you to use textures,
          render viz in a sketchy way, or otherwise modify the appearance of
          your data visualization. Below you'll find examples for how to use
          textures, gradients and Semiotic's built-in sketchy rendering, painty
          rendering and canvas post-processing.
        </p>
      </DocumentComponent>
    )
  }
}

UsingPatternsTextures.title = "Using Patterns and Textures"
