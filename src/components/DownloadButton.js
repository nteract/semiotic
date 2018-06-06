// @flow
import React from "react"
import json2csv from "json2csv"

export const downloadCSV = (csvName: string, data: *) => {
  json2csv(Object.assign({}, { data: data }), (err, csv) => {
    const blob = new Blob([csv], { type: "text/csv" })

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
  })
}

type DownloadButtonProps = {
  csvName: string,
  width?: number,
  label?: string,
  data: *
}

class DownloadButton extends React.Component<DownloadButtonProps, null> {
  onClick = () => downloadCSV(this.props.csvName, this.props.data)

  render() {
    const { width, label = "Download" } = this.props
    return (
      <div className="download-div" style={{ width }}>
        <button alt="download" onClick={this.onClick}>
          <a>{label}</a>
        </button>
      </div>
    )
  }
}

export default DownloadButton
