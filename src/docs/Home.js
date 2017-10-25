import React from "react";
import { PrismCode } from "react-prism";
import Button from "material-ui/Button";
import { Link } from "react-router-dom";

const Home = ({ match }) => {
  // const documentation = <Documentation
  //   selected={match && match.params.component}
  // />
  return (
    <div>
      <div className="row">
        <div className="col-xs-8 col-xs-offset-2">
          <header className="box-row center nav-buttons">
            <h1 className="accent-font">semiotic</h1>
            <h2 className="tagline">charts that carry the conversation</h2>
            <p>
              <a href="https://github.com/emeeks/semiotic">Semiotic</a> is an
              opinionated framework optimized to enable effective communication
              through data visualization.
            </p>
            <Button color="primary" raised>
              <Link style={{ color: "black" }} to="examples">
                Interactive Examples
              </Link>
            </Button>
            <Button
              color="primary"
              raised
              onTouchTap={() =>
                window.open(`https://github.com/emeeks/semiotic`)}
            >
              Github Repo
            </Button>
            <Button
              color="primary"
              raised
              onTouchTap={() =>
                window.open(
                  `https://github.com/emeeks/semiotic/wiki/API-Reference`
                )}
            >
              API Docs
            </Button>
            <Button
              color="primary"
              raised
              onTouchTap={() =>
                window.open(
                  `https://github.com/emeeks/semiotic/wiki/Tutorials`
                )}
            >
              Tutorials
            </Button>
          </header>
        </div>
      </div>
      <div className="row">
        <div className="col-xs-8 col-xs-offset-2">
          <p>
            <span style={{ fontWeight: 900 }}>
              Semiotic is a data visualization framework for React.
            </span>{" "}
            It provides three types of frames (<Link to="xyframe">XYFrame</Link>,{" "}
            <Link to="orframe">ORFrame</Link>,{" "}
            <Link to="networkframe">NetworkFrame</Link>) which allow you to
            deploy a wide variety of charts that share the same rules for how to
            display information. By adjusting the settings of a frame, you can
            produce very different looking charts that despite their visual
            difference are the same in the way they model information.
          </p>
          <h2>Getting Started</h2>
          <hr />
          <p>Install and save the component to your project.</p>
          <pre>
            <PrismCode className="language-bash">npm i -SE semiotic</PrismCode>
          </pre>
          <p>These examples use some CSS to make things look nice.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
