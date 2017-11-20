import React from "react";
import json2csv from "json2csv";

import PropTypes from "prop-types";

export const downloadCSV = (csvName, data) => {
  json2csv(Object.assign({}, { data: data }), (err, csv) => {
    const blob = new Blob([csv], { type: "text/csv" });

    const dlink = document.createElement("a");
    dlink.download = csvName ? csvName.replace(/ /g, "_") + ".csv" : "vis.csv";
    dlink.href = window.URL.createObjectURL(blob);
    dlink.onclick = () => {
      // revokeObjectURL needs a delay to work properly
      const revokeFn = () => {
        window.URL.revokeObjectURL(this.href);
      };
      setTimeout(revokeFn.bind(this), 1500);
    };

    dlink.click();
    dlink.remove();
  });
};

class DownloadButton extends React.Component {
  /*
    renderBody({ csvName, data }) {
        return <div className='download-div'>
                <button alt='download' onClick={downloadCSV.bind(this, csvName, data)} className='download-data-button'>
                    <a>Download</a>
                </button>
            </div>
    }
*/
  render() {
    const { csvName, data, width, label = "Download" } = this.props;
    return (
      <div className="download-div" style={{ width }}>
        <button
          alt="download"
          onClick={downloadCSV.bind(this, csvName, data)}
          className="download-data-button"
        >
          <a>{label}</a>
        </button>
      </div>
    );
  }
}

DownloadButton.propTypes = {
  csvName: PropTypes.string,
  data: PropTypes.array,
  width: PropTypes.number
};

export default DownloadButton;
