import { useNavigationType } from "react-router-dom"

export function useScrollRestoration() {
  let type = useNavigationType()
  if (type === "PUSH" || type === "REPLACE") {
    window.scrollTo(0, 0)
  }
}
