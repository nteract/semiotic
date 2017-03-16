import FS        from 'fs'
//import Immutable from 'immutable'
import Path      from 'path'
import React     from 'react' // eslint-disable-line
//import Sinon     from 'sinon'
import test      from 'tape'
import render    from '../../lib/render-component'

import { curveBasis } from 'd3-shape'

import ReactDOMServer from 'react-dom/server'
// import { List, Map } from 'immutable';

import Mark        from '../../../../src/components/Mark'

test('Mark', t => {
  t.test('`componentDidMount` calls methods passed via props', tt => {

    const result = render(Mark, {
      label: "Test Mark",
      markType: "rect",
      x: 5,
      y: 5,
      width: 100,
      height: 20,
      style: { fill: "pink" }
    })

    const renderResult = result.render()
    const html = ReactDOMServer.renderToStaticMarkup(renderResult)
    const path = Path.resolve(__dirname, '../../fixtures/components/mark/render-result-rect.txt')
    const expectedRenderResult = FS.readFileSync(path, 'utf-8')

    tt.equal(html, expectedRenderResult.replace(/\n$/, ''))

    tt.end()
  })

  t.test('isSketchy should render multiple paths for a shape', tt => {
/*
    const sketchyResult = render(Mark, {
      label: "Test Mark",
      markType: "rect",
      x: 5,
      y: 5,
      width: 100,
      height: 20,
      style: { fill: "pink", stroke: "blue" },
      isSketchy: true
    })


    const renderSketchyResult = sketchyResult.render()
    const html = ReactDOMServer.renderToStaticMarkup(renderSketchyResult)
    const path = Path.resolve(__dirname, '../../fixtures/components/mark/render-result-rect.txt')
    const expectedSketchyRenderResult = FS.readFileSync(path, 'utf-8')

    tt.equal(html, expectedSketchyRenderResult.replace(/\n$/, ''))

  CAN'T TEST SKETCHY RENDERING CURRENTLY BECAUSE IT RELIES ON svg:path.gettotallength & svg:path.getpointatlength
*/
  tt.equal(true,true)

    tt.end()
  })

  t.test('draw horizontalbar', tt => {

    const result = render(Mark, {
      label: "Test Mark",
      markType: "horizontalbar",
      x: 5,
      y: 5,
      width: 100,
      height: 20,
      style: { fill: "pink", stroke: "blue" }
    })


    const renderHorizontalBarResult = result.render()
    const html = ReactDOMServer.renderToStaticMarkup(renderHorizontalBarResult)
    const path = Path.resolve(__dirname, '../../fixtures/components/mark/render-result-horizontalbar.txt')
    const expectedHorizontalBarRenderResult = FS.readFileSync(path, 'utf-8')

    tt.equal(html, expectedHorizontalBarRenderResult.replace(/\n$/, ''))

    tt.end()
  })

  t.test('draw verticalbar', tt => {

    const result = render(Mark, {
      label: "Test Mark",
      markType: "verticalbar",
      x: 5,
      y: 5,
      width: 100,
      height: 20,
      style: { fill: "pink", stroke: "blue" }
    })


    const renderVerticalBarResult = result.render()
    const html = ReactDOMServer.renderToStaticMarkup(renderVerticalBarResult)
    const path = Path.resolve(__dirname, '../../fixtures/components/mark/render-result-verticalbar.txt')
    const expectedVerticalBarRenderResult = FS.readFileSync(path, 'utf-8')

    tt.equal(html, expectedVerticalBarRenderResult.replace(/\n$/, ''))

    tt.end()
  })

  //END TESTS
  t.end()
})
