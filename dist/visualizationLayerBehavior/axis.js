"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var semiotic_mark_1 = require("semiotic-mark");
var horizontalTornTickGenerator = function (width, ticks, y, orient) {
    var step = width / ticks;
    var currentStep = 0;
    var tickPath = "M0," + y;
    var mod = orient === "right" ? -1 : 1;
    while (currentStep <= width) {
        tickPath += "L" + currentStep + "," + y;
        if (currentStep < width) {
            tickPath += "L" + (currentStep + step / 2) + "," + (y + 10 * mod);
        }
        currentStep += step;
    }
    return tickPath;
};
var verticalTornTickGenerator = function (height, ticks, x, orient) {
    var step = height / ticks;
    var currentStep = 0;
    var tickPath = "M" + x + ",0";
    var mod = orient === "bottom" ? -1 : 1;
    while (currentStep <= height) {
        tickPath += "L" + x + "," + currentStep;
        if (currentStep < height) {
            tickPath += "L" + (x + 10 * mod) + "," + (currentStep + step / 2);
        }
        currentStep += step;
    }
    return tickPath;
};
var generateTornBaseline = function (orient, baselineSettings) {
    var tornD = "";
    var x1 = baselineSettings.x1, x2 = baselineSettings.x2, y1 = baselineSettings.y1, y2 = baselineSettings.y2;
    if (orient === "left" || orient === "right") {
        var calcWidth = Math.abs(x2 - x1);
        var ticks = Math.ceil(calcWidth / 40);
        tornD = horizontalTornTickGenerator(calcWidth, ticks, orient === "right" ? 0 : y1, orient);
    }
    else {
        var calcHeight = Math.abs(y2 - y1);
        var ticks = Math.ceil(calcHeight / 40);
        tornD = verticalTornTickGenerator(calcHeight, ticks, x1, orient);
    }
    return tornD;
};
var defaultTickLineGenerator = function (_a) {
    var xy = _a.xy, orient = _a.orient, i = _a.i, baseMarkProps = _a.baseMarkProps, _b = _a.className, className = _b === void 0 ? "" : _b, jaggedBase = _a.jaggedBase;
    var genD = "M" + xy.x1 + "," + xy.y1 + "L" + xy.x2 + "," + xy.y2;
    if (jaggedBase && i === 0) {
        genD = generateTornBaseline(orient, xy);
    }
    return (React.createElement(semiotic_mark_1.Mark, __assign({ key: i, markType: "path", renderMode: xy.renderMode, fill: "none", stroke: "black", strokeWidth: "1px", simpleInterpolate: true, d: genD, className: "tick-line tick " + orient + " " + className }, baseMarkProps)));
};
function generateTickValues(tickValues, ticks, scale) {
    var axisSize = Math.abs(scale.range()[1] - scale.range()[0]);
    if (!tickValues) {
        if (!ticks) {
            ticks = Math.max(1, Math.floor(axisSize / 40));
        }
        tickValues = (scale.ticks && scale.ticks(ticks)) || scale.domain();
    }
    return tickValues;
}
exports.generateTickValues = generateTickValues;
function axisPieces(_a) {
    var _b = _a.renderMode, renderMode = _b === void 0 ? function () { return undefined; } : _b, _c = _a.padding, padding = _c === void 0 ? 5 : _c, scale = _a.scale, ticks = _a.ticks, _d = _a.tickValues, tickValues = _d === void 0 ? generateTickValues(undefined, ticks, scale) : _d, _e = _a.orient, orient = _e === void 0 ? "left" : _e, size = _a.size, _f = _a.footer, footer = _f === void 0 ? false : _f, _g = _a.tickSize, tickSize = _g === void 0 ? footer
        ? -10
        : ["top", "bottom"].find(function (d) { return d === orient; })
            ? size[1]
            : size[0] : _g, jaggedBase = _a.jaggedBase;
    //returns x1 (start of line), x2 (end of line) associated with the value of the tick
    var axisDomain = [], position1, position2, domain1, domain2, tposition1, tposition2, textPositionMod = 0, textPositionMod2 = 0, defaultAnchor = "middle";
    switch (orient) {
        case "top":
            position1 = "x1";
            position2 = "x2";
            domain1 = "y1";
            domain2 = "y2";
            axisDomain = [0, tickSize];
            tposition1 = "tx";
            tposition2 = "ty";
            textPositionMod -= 20 - padding;
            break;
        case "bottom":
            position1 = "x1";
            position2 = "x2";
            domain1 = "y2";
            domain2 = "y1";
            axisDomain = [size[1], size[1] - tickSize];
            tposition1 = "tx";
            tposition2 = "ty";
            textPositionMod += 20 + padding;
            break;
        case "right":
            position1 = "y2";
            position2 = "y1";
            domain1 = "x2";
            domain2 = "x1";
            axisDomain = [size[0], size[0] - tickSize];
            tposition1 = "ty";
            tposition2 = "tx";
            textPositionMod += 5 + padding;
            textPositionMod2 += 5;
            defaultAnchor = "start";
            break;
        //left
        default:
            position1 = "y1";
            position2 = "y2";
            domain1 = "x1";
            domain2 = "x2";
            axisDomain = [0, tickSize];
            tposition1 = "ty";
            tposition2 = "tx";
            textPositionMod -= 5 + padding;
            textPositionMod2 += 5;
            defaultAnchor = "end";
            break;
    }
    var generatedTicks = tickValues instanceof Function ? tickValues({ orient: orient }) : tickValues;
    if (jaggedBase &&
        generatedTicks.find(function (t) { return t === scale.domain()[0]; }) === undefined) {
        generatedTicks = __spread([scale.domain()[0]], generatedTicks);
    }
    return generatedTicks.map(function (tick, i) {
        var _a;
        var tickPosition = scale(tick);
        return _a = {},
            _a[position1] = tickPosition,
            _a[position2] = tickPosition,
            _a[domain1] = axisDomain[0],
            _a[domain2] = axisDomain[1],
            _a[tposition1] = tickPosition + textPositionMod2,
            _a[tposition2] = axisDomain[0] + textPositionMod,
            _a.defaultAnchor = defaultAnchor,
            _a.renderMode = renderMode(tick, i),
            _a.value = tick,
            _a;
    });
}
exports.axisPieces = axisPieces;
exports.axisLabels = function (_a) {
    var axisParts = _a.axisParts, tickFormat = _a.tickFormat, _b = _a.rotate, rotate = _b === void 0 ? 0 : _b, _c = _a.center, center = _c === void 0 ? false : _c, orient = _a.orient;
    return axisParts.map(function (axisPart, i) {
        var renderedValue = tickFormat(axisPart.value, i);
        if (typeof renderedValue !== "object" || renderedValue instanceof Date) {
            renderedValue = (React.createElement("text", { textAnchor: axisPart.defaultAnchor, className: "axis-label" }, renderedValue.toString ? renderedValue.toString() : renderedValue));
        }
        var textX = axisPart.tx;
        var textY = axisPart.ty;
        if (center) {
            switch (orient) {
                case "right":
                    textX -= (axisPart.x2 - axisPart.x1) / 2;
                    break;
                case "left":
                    textX += (axisPart.x2 - axisPart.x1) / 2;
                    break;
                case "top":
                    textY += (axisPart.y2 - axisPart.y1) / 2;
                    break;
                case "bottom":
                    textY -= (axisPart.y2 - axisPart.y1) / 2;
                    break;
            }
        }
        return (React.createElement("g", { key: i, pointerEvents: "none", transform: "translate(" + textX + "," + textY + ") rotate(" + rotate + ")", className: "axis-label" }, renderedValue));
    });
};
exports.baselineGenerator = function (orient, size, className) {
    var offsets = {
        left: { x: 0, y: 0, width: 0, height: size[1] },
        right: { x: size[0], y: 0, width: 0, height: size[1] },
        top: { x: 0, y: 0, width: size[0], height: 0 },
        bottom: { x: 0, y: size[1], width: size[0], height: 0 }
    };
    var orientOffset = offsets[orient];
    return (React.createElement("line", { key: "baseline", className: "axis-baseline " + className, stroke: "black", strokeLinecap: "square", x1: orientOffset.x, x2: orientOffset.x + orientOffset.width, y1: orientOffset.y, y2: orientOffset.y + orientOffset.height }));
};
exports.axisLines = function (_a) {
    var axisParts = _a.axisParts, orient = _a.orient, _b = _a.tickLineGenerator, tickLineGenerator = _b === void 0 ? defaultTickLineGenerator : _b, baseMarkProps = _a.baseMarkProps, className = _a.className, jaggedBase = _a.jaggedBase, scale = _a.scale;
    return axisParts.map(function (axisPart, i) {
        return tickLineGenerator({
            xy: axisPart,
            orient: orient,
            i: i,
            baseMarkProps: baseMarkProps,
            className: className,
            jaggedBase: jaggedBase,
            scale: scale
        });
    });
};
//# sourceMappingURL=axis.js.map