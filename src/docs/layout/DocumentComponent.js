import React from "react";
import { PrismCode } from "react-prism";
import { dedent } from "dentist";
import CodeIcon from "material-ui-icons/Code";
import IconButton from "material-ui/IconButton";

const DocumentProptypes = props => {
  const { name, proptypes } = props.component;
  return (
    <div className="docs-component-props">
      <h3>{name} - PropTypes</h3>
      <pre>
        <PrismCode className="language-jsx">
          {`${name}.propTypes = ${dedent(proptypes)}`}
        </PrismCode>
      </pre>
    </div>
  );
};

const DocumentExamples = props => {
  const { name, demo, source } = props.component;
  return (
    <div className="docs-component-props">
      <h3>{name}</h3>
      {demo && <div className="docs-example">{demo}</div>}
      {source && (
        <pre>
          <PrismCode className="language-jsx">{dedent(source)}</PrismCode>
        </pre>
      )}
    </div>
  );
};

const DocumentComponent = props => {
  const {
    name,
    children,
    components = [],
    examples = [],
    buttons = [],
    api
  } = props;
  return (
    <div className="docs-component-section">
      <h1>
        {name}{" "}
        {api ? (
          <IconButton
            tooltip="API documentation"
            onTouchTap={() => window.open(api)}
          >
            <CodeIcon />
          </IconButton>
        ) : null}
      </h1>

      {children}
      <div>
        <div style={{ width: "850px" }}>
          <div style={{ width: "750px", display: "inline-block" }}>
            {examples.map((example, i) => (
              <DocumentExamples key={i} component={example} />
            ))}
          </div>
          <div
            style={{
              verticalAlign: "top",
              width: "100px",
              display: "inline-block"
            }}
          >
            {buttons.length > 0 ? (
              <div style={{ padding: "10px" }}>
                <h3>Adjust chart settings</h3>
                {buttons}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {components.map(
        (component, i) =>
          component.proptypes ? (
            <DocumentProptypes key={i} component={component} />
          ) : (
            ""
          )
      )}
    </div>
  );
};

export default DocumentComponent;
