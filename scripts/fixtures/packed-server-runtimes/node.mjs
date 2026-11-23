import * as server from "semiotic/server"
import { fileURLToPath } from "node:url"
import verifyRender from "./render.cjs"

verifyRender(server)
console.log(fileURLToPath(import.meta.resolve("semiotic/server")))
