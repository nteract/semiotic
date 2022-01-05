import { useLayoutEffect } from "react"
import { useNavigationType } from "react-router-dom"

export function useScrollRestoration() {
  let type = useNavigationType()
  useLayoutEffect(() => {
    if (type === "PUSH" || type === "REPLACE") {
      window.scrollTo(0, 0)
    }
  }, [type])
}
