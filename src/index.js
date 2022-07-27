import * as React from "react"
import Docs from "./docs"
import "../public/prism.js"
import { createRoot } from "react-dom/client"

const root = createRoot(document.getElementById("root"))
root.render(<Docs />)
