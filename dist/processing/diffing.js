"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var simpleTypeDistill = function (typeProp) {
    if (typeProp && typeProp.type) {
        return typeProp.type;
    }
    return typeProp;
};
exports.basicPropDiffing = function (previousProp, nextProp) {
    return simpleTypeDistill(previousProp) !== simpleTypeDistill(nextProp);
};
exports.basicDataChangeCheck = function (prevData, newData) {
    return prevData !== newData ||
        (Array.isArray(prevData) &&
            Array.isArray(newData) &&
            !!prevData.find(function (p) { return newData.indexOf(p) === -1; }));
};
//# sourceMappingURL=diffing.js.map