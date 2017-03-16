/* eslint-disable no-unused-vars */
import React from 'react'
/* eslint-enable no-unused-vars */

import ReactDOM from 'react-dom'
import MarkExamples from './components/MarkExamples'
import DragAndDropExample from './components/DragAndDropExample'
import XYFrameExamples from './components/XYFrameExamples'
import XYFrameWithMinimapExamples from './components/XYFrameWithMinimapExamples'
import XYFrameExamplesMisc from './components/XYFrameExamplesMisc'
import XYAnnotationExamples from './components/XYAnnotationExamples'
import XYFramePointExamples from './components/XYFramePointExamples'
import ORFramePieceExamples from './components/ORFramePieceExamples'
import ORFrameConnectorExamples from './components/ORFrameConnectorExamples'
import ORFrameGroupExamples from './components/ORFrameGroupExamples'
import DividedLineExamples from './components/DividedLineExamples'
import BarLineChartExample from './components/BarLineChartExample'


ReactDOM.render(
    <div>
        <MarkExamples label="Mark" />
    </div>,
    document.getElementById('mark-examples')
)

ReactDOM.render(
    <div>
        <DragAndDropExample label="Mark" />
    </div>,
    document.getElementById('drag-and-drop-examples')
)

ReactDOM.render(
    <div>
        <DividedLineExamples label="Divided Line" />
    </div>,
    document.getElementById('dividedLine-examples')
)

ReactDOM.render(
    <div>
        <XYFrameExamples label="XYFrame" />
    </div>,
    document.getElementById('xyFrame-examples-customlinetype')
)

ReactDOM.render(
    <div>
        <XYFrameExamplesMisc label="XYFrame" />
    </div>,
    document.getElementById('xyFrame-examples-misc')
)


ReactDOM.render(
    <div>
        <XYFramePointExamples label="XYFrame Points" />
    </div>,
    document.getElementById('xyFramePoint-examples')
)

ReactDOM.render(
    <div>
        <XYFrameWithMinimapExamples label="XYFrame" />
    </div>,
    document.getElementById('xyFrame-examples-minimap')
)

ReactDOM.render(
    <div>
        <XYAnnotationExamples label="XY Annotation Examples" />
    </div>,
    document.getElementById('xyFrame-examples-annotation')
)

ReactDOM.render(
    <div>
        <ORFramePieceExamples label="ORFrame Pieces" />
    </div>,
    document.getElementById('orFramePiece-examples')
)

ReactDOM.render(
    <div>
        <ORFrameConnectorExamples label="ORFrame Connectors" />
    </div>,
    document.getElementById('orFrameConnector-examples')
)

ReactDOM.render(
    <div>
        <ORFrameGroupExamples label="ORFrame Groups" />
    </div>,
    document.getElementById('orFrameGroup-examples')
)

ReactDOM.render(
    <div>
        <BarLineChartExample label="Bar Line Chart" />
    </div>,
    document.getElementById('barLine-examples')
)
