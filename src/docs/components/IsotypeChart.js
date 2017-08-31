import React from "react";
import DocumentComponent from "../layout/DocumentComponent";

const components = [];

components.push({
  name: "Template"
});

export default class TemplateDocs extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <svg height="500" width="500">
          <Template
          />
        </svg>
      ),
      source: `
      `
    });

    return (
      <DocumentComponent
        name="Template"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p></p>
      </DocumentComponent>
    );
  }
}

TemplateDocs.title = "Template";
