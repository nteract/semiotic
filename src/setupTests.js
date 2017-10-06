import React from 'react'
import PropTypes from 'prop-types'
import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

// fix react-annotation
React.PropTypes = PropTypes // eslint-disable-line

configure({ adapter: new Adapter() })
