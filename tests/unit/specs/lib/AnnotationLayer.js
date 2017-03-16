import FS        from 'fs'
//import Immutable from 'immutable'
import Path      from 'path'
import React     from 'react' // eslint-disable-line
//import Sinon     from 'sinon'
import test      from 'tape'
import render    from '../../lib/render-component'

import ReactDOMServer from 'react-dom/server'
// import { List, Map } from 'immutable';

import AnnotationLayer        from '../../../../src/components/AnnotationLayer'

test('AnnotationLayer', t => {
  t.test('render a basic annotation layer with some SVG and HTML rules', tt => {

    const svgRule = d => {
      if (d.type === "xy") {
        return <circle
          cx={d.x}
          cy={d.y}
          r={5}
          style={{ fill: "red" }}
        />
      }
      if (d.type === "x") {
        return <line
          x1={d.x}
          x2={d.x}
          y1={0}
          y2={500}
          style={{ stroke: "blue" }}
        />
      }
    }

    const htmlRule = d => {
        return <div style={{ position: "relative",
          left: d.x + "px",
          top: "75px",
          width: "20px",
          height: "20px",
          border: "1px solid black"
        }} />
    }

    const result = render(AnnotationLayer, {
      annotations: [ { type: "x", label: "Test an X", x: 100 }, { type: "xy", label: "Test an XY", x: 250, y: 250 } ],
      size: [ 500, 500 ],
      position: [ 50, 50 ],
      svgAnnotationRule: svgRule,
      htmlAnnotationRule: htmlRule
    })

    const renderResult = result.render()
    const html = ReactDOMServer.renderToStaticMarkup(renderResult)

    const path = Path.resolve(__dirname, '../../fixtures/components/annotation-layer/render-result-basic-with-annotations.txt')
    const expectedRenderResult = FS.readFileSync(path, 'utf-8')

    tt.equal(html, expectedRenderResult.replace(/\n$/, ''))

    tt.end()
  })

  //END TESTS
  t.end()
})
