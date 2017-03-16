import React     from 'react'
import TestUtils from 'react-addons-test-utils'


const renderComponent = (component, props, ...children) =>
  TestUtils.renderIntoDocument(React.createElement(
    component,
    props,
    children.length > 1 ? children : children[0]
  ))


export { renderComponent }

export default renderComponent
