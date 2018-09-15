import React, { Component } from "react"
import Sidebar from "./Sidebar"

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="flex algin-bottom">
          <div className="logo">
            <img src="/semiotic.png" alt="Semiotic" />
          </div>
          <div>
            <h1>Page Title</h1>
          </div>
        </header>
        <div className="flex">
          <div className="sidebar">
            <Sidebar />
          </div>
          <div className="container">
            <p className="App-intro">
              To get started, edit <code>src/App.js</code> and save to reload.
            </p>
          </div>
        </div>
      </div>
    )
  }
}

export default App
