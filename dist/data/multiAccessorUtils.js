"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstAccessorValue = function (accessorArray, data) {
    for (var i = 0; i < accessorArray.length; i++) {
        var valueCheck = accessorArray[i](data);
        if (valueCheck !== undefined &&
            !Number.isNaN(valueCheck) &&
            valueCheck !== null)
            return valueCheck;
    }
    return undefined;
};
//# sourceMappingURL=multiAccessorUtils.js.map