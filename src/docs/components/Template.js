import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { ORFrame } from "../../components";

const components = [];

components.push({
  name: "Template",
  proptypes: `
    {
      name: PropTypes.string.isRequired,
      options: PropTypes.array, 
        //Array of objects with value, label, category(optional) properties
      className: PropTypes.string,
      label: PropTypes.string,
      categories: PropTypes.bool,
      onChange: PropTypes.func   
        //Calls onChange with func(this.props.name, newValue, option)

    }
  `
});

export default class TemplateDocs extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <svg height="500" width="500">
          <Template
            parameters={parameters}
            data={[data]}
            lineDataAccessor={d => d}
            customAccessors={{ x: d => d.x, y: d => d.y }}
            interpolate={curveBasis}
            searchIterations={20}
          />
        </svg>
      ),
      source: `
      import { Template } from 'semiotic';

        <svg height='500' width='500'>
          <Template
            parameters={parameters}
            data={[ data ]}
            lineDataAccessor={d => d}
            customAccessors={{ x: d => d.x, y: d => d.y }}
            interpolate={curveBasis}
            searchIterations={20}
          />
        </svg>
      `
    });

    return (
      <DocumentComponent
        name="Template"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The Template lets you create a line that is split based on a
          parameters function, which checks each point and applies a different
          style object to line segments that fall into the declared parameters.
        </p>
      </DocumentComponent>
    );
  }
}

TemplateDocs.title = "Template";
