'use strict';

import React from 'react'
import json2csv from 'json2csv';

const PropTypes = React.PropTypes;

export const downloadCSV = (csvName, data) => {
    json2csv(Object.assign({}, { data: data }), (err, csv) => {
        const blob = new Blob([ csv ], { type: 'text/csv' })

        const dlink = document.createElement('a');
        dlink.download = csvName ? csvName.replace(/ /g, '_') + ".csv" : "vis.csv"
        dlink.href = window.URL.createObjectURL(blob);
        dlink.onclick = function() {
            // revokeObjectURL needs a delay to work properly
            const that = this;
            setTimeout(function() {
                window.URL.revokeObjectURL(that.href);
            }, 1500);
        };

        dlink.click();
        dlink.remove();
    })
}

class DownloadButton extends React.Component {

    renderBody({ csvName, data }) {
        return <div className="download-div">
                <button alt="download" onClick={downloadCSV.bind(this, csvName, data)} className="download-data-button">
                    <a>Download</a>
                </button>
            </div>
    }

    render(){
        const { csvName, data, width } = this.props
        return <div className="download-div" style={{ width }}>
            <button alt="download" onClick={downloadCSV.bind(this, csvName, data)} className="download-data-button">
                <a>Download</a>
            </button>
        </div>
    }
}

DownloadButton.propTypes = {
    csvName: PropTypes.string,
    data: PropTypes.array,
    renderBody: PropTypes.func
};

export default DownloadButton;


