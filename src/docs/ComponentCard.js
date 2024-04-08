import * as React from "react"
import { Link } from "react-router-dom"

const ComponentCard = ({ path, title, selected }) => {
  const labelStyle = {
    textTransform: "normal"
  }

  const style = {
    margin: 10
  }
  return (
    <Link to={`/${path}`}>
      <button
        label={title}
        labelStyle={labelStyle}
        style={style}
        primary={selected}
      />
    </Link>
  )
}

export default ComponentCard
