import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
// import registerServiceWorker from "./registerServiceWorker"

const render = () => {
  const pathname = window.location && window.location.pathname.slice(1);
  ReactDOM.render(<App pathname={pathname} />, document.getElementById("root"));
};

render();
window.onpopstate = render;

// registerServiceWorker()
