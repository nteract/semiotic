import * as React from "react"
import { Parser } from "json2csv"

const json2csv = new Parser()

export const downloadCSV = (csvName: string, data: any) => {
  const CSV = json2csv.parse(data)
  const blob = new Blob([CSV], { type: "text/csv" })

  const dlink = document.createElement("a")
  dlink.download = csvName ? `${csvName.replace(/ /g, "_")}.csv` : "vis.csv"
  dlink.href = window.URL.createObjectURL(blob)
  dlink.onclick = () => {
    // revokeObjectURL needs a delay to work properly
    const revokeFn = () => {
      window.URL.revokeObjectURL(dlink.href)
    }
    setTimeout(revokeFn, 1500)
  }

  dlink.click()
  dlink.remove()
}

type DownloadButtonProps = {
  csvName: string
  width?: number
  label?: string
  data: any
}

class DownloadButton extends React.Component<DownloadButtonProps, null> {
  onClick = () => downloadCSV(this.props.csvName, this.props.data)

  render() {
    const { width, label = "Download" } = this.props
    const style: { width?: string } = {}
    if (width) {
      style.width = `${width}px`
    }
    return (
      <div className="download-div" style={style}>
        <button onClick={this.onClick}>
          <a>{label}</a>
        </button>
      </div>
    )
  }
}

export default DownloadButton
