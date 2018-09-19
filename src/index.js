import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import App from "./App"
import registerServiceWorker from "./registerServiceWorker"

const render = () => {
  const hash = window.location && window.location.hash
  ReactDOM.render(<App hash={hash} />, document.getElementById("root"))
}

render()
window.onpopstate = render

registerServiceWorker()
