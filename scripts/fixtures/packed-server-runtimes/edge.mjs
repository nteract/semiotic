import * as server from "semiotic/server/edge"
import verifyRender from "./render.cjs"

if (
  typeof document !== "undefined" ||
  typeof window !== "undefined" ||
  typeof Buffer !== "undefined" ||
  typeof process !== "undefined"
) {
  throw new Error(
    "The edge fixture requires an isolate without DOM or Node globals"
  )
}
verifyRender(server)
