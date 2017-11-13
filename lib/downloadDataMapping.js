"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var cleanDates = function cleanDates(value) {
  if (value && value.toJSON) {
    return value.toJSON();
  }
  return value;
};

var xyDownloadMapping = exports.xyDownloadMapping = function xyDownloadMapping(_ref) {
  var data = _ref.data,
      xAccessor = _ref.xAccessor,
      yAccessor = _ref.yAccessor,
      _ref$fields = _ref.fields,
      fields = _ref$fields === undefined ? [] : _ref$fields;

  var csvData = [];
  data.forEach(function (datum) {
    if (Array.isArray(datum)) {
      datum.forEach(function (a) {
        var row = {};
        if (xAccessor) {
          row.x = cleanDates(xAccessor(a));
        } else if (a.x) {
          row.x = a.x;
        }

        if (yAccessor) {
          row.y = cleanDates(yAccessor(a));
        } else if (a.y) {
          row.y = a.y;
        }

        if (datum.id !== undefined) row.id = datum.id;

        if (fields && Array.isArray(fields)) {
          fields.forEach(function (f) {
            row[f] = cleanDates(a[f]);
          });
        }

        csvData.push(row);
      });
    } else {
      var row = {};
      if (xAccessor) {
        row.x = cleanDates(xAccessor(datum));
      } else if (datum.x) {
        row.x = datum.x;
      }

      if (yAccessor) {
        row.y = cleanDates(yAccessor(datum));
      } else if (datum.y) {
        row.y = datum.y;
      }

      if (datum.id !== undefined) {
        row.id = datum.id;
      }

      fields.forEach(function (f) {
        row[f] = datum[f];
      });
      csvData.push(row);
    }
  });
  return csvData;
};

var orDownloadMapping = exports.orDownloadMapping = function orDownloadMapping(_ref2) {
  var data = _ref2.data,
      columns = _ref2.columns,
      oAccessor = _ref2.oAccessor,
      rAccessor = _ref2.rAccessor,
      _ref2$fields = _ref2.fields,
      fields = _ref2$fields === undefined ? [] : _ref2$fields;

  var dataKeys = Object.keys(data);
  var csvData = [];

  dataKeys.forEach(function (key) {
    data[key].pieceData.forEach(function (piece) {
      var row = {};
      if (oAccessor) {
        row.column = oAccessor(piece);
      } else if (piece.x) {
        row.column = piece.x;
      }

      if (rAccessor) {
        row.value = rAccessor(piece);
      } else if (piece.renderKey) {
        row.value = piece.renderKey;
      }

      if (piece.id !== undefined) row.id = piece.id;

      fields.forEach(function (f) {
        row[f] = cleanDates(piece[f]);
      });

      csvData.push(row);
    });
  });

  return csvData;
};

var networkNodeDownloadMapping = exports.networkNodeDownloadMapping = function networkNodeDownloadMapping(_ref3) {
  var data = _ref3.data,
      _ref3$fields = _ref3.fields,
      fields = _ref3$fields === undefined ? [] : _ref3$fields;

  var csvData = [];
  data.forEach(function (d) {
    var row = {};
    row.id = d.id;
    fields.forEach(function (f) {
      row[f] = d[f];
    });
    csvData.push(row);
  });
  return csvData;
};

var networkEdgeDownloadMapping = exports.networkEdgeDownloadMapping = function networkEdgeDownloadMapping(_ref4) {
  var data = _ref4.data,
      _ref4$fields = _ref4.fields,
      fields = _ref4$fields === undefined ? [] : _ref4$fields;

  var csvData = [];
  data.forEach(function (d) {
    var row = {};
    row.source = d.source.id;
    row.target = d.target.id;
    fields.forEach(function (f) {
      row[f] = d[f];
    });
    csvData.push(row);
  });

  return csvData;
};