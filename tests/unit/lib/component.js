import React from 'react';
import Sinon from 'sinon';
import stringifyJSX from 'react-element-to-jsx-string';
import { createRenderer, renderIntoDocument } from 'react-addons-test-utils';

export const SpyAgency = (t, Component, props) => {
  const createComponent = () => render(Component, props)

  // Call a method named `componentMethodName` on `component` with `args`,
  // which results each of `propsStubMethodNames` being called on `component.props`
  const spyWithProps = (componentMethodName, args: Array<any>, ...propsStubMethodNames) =>
    t.test(`${componentMethodName} calls methods passed via props`, t => {
      propsStubMethodNames.forEach(k => (props[k] = Sinon.stub()))
      createComponent()[componentMethodName](...args)
      propsStubMethodNames.forEach(k => {
        t.ok(props[k].calledOnce)
        delete props[k]
      })
      t.end()
    })

  // Call a method named `methodName1` on `component` with `args`,
  // which results in `methodName2` being called on `component`
  const spy = (methodName1, args: Array<any>, methodName2) =>
    t.test(`${methodName1} calls ${methodName2}`, t => {
      const component = createComponent(...args)
      const method2 = Sinon.spy(component, methodName2)
      component[methodName1]()
      t.ok(method2.calledOnce)
      method2.restore()
      t.end()
    })

  return { spy, spyWithProps }
}

const createElement = (component, props, ...children) =>
  React.createElement(component, props,
    children.length > 1 ? children : children[0])

const render = (component, props, ...children) =>
  renderIntoDocument(createElement(component, props, ...children))

const shallowRender = (component, props, ...children) => {
  const rndr = createRenderer()
  rndr.render(createElement(component, props, ...children))
  return rndr.getRenderOutput()
}

/*
  EXPORTS
*/
export { createElement, render, shallowRender, stringifyJSX }

export default render
