import React from 'react'
import { select } from 'd3-selection'
import { annotation } from 'd3-svg-annotation'

class Annotation extends React.Component {
    constructor(props){
        super(props);
        this.createAnnotation = this.createAnnotation.bind(this)
    }

    componentDidMount() {
      this.createAnnotation()
    }

    componentDidUpdate() {
      this.createAnnotation()
    }

    createAnnotation() {
        const node = this.node
        const noteData = this.props.noteData

     const makeAnnotations = annotation()
        .type(noteData.noteType)
        .annotations([ noteData ])

      select(node)
        .call(makeAnnotations)
    }


    render() {
        return <g ref={node => this.node = node} >
        </g>
    }
}

Annotation.propTypes = {
};

export default Annotation;
