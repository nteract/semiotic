"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHOCToSVG = renderHOCToSVG;
/**
 * Render a Semiotic HOC chart component to static SVG markup.
 *
 * Uses ReactDOMServer.renderToStaticMarkup which supports hooks
 * (useMemo, custom hooks) used by the HOC components.
 */
const React = __importStar(require("react"));
const ReactDOMServer = __importStar(require("react-dom/server"));
const componentRegistry_1 = require("./componentRegistry");
const ai_1 = require("semiotic/ai");
function renderHOCToSVG(componentName, props) {
    // Look up component
    const entry = componentRegistry_1.COMPONENT_REGISTRY[componentName];
    if (!entry) {
        return {
            svg: null,
            error: `Unknown component "${componentName}". Available: ${Object.keys(componentRegistry_1.COMPONENT_REGISTRY).join(", ")}`,
        };
    }
    // Validate props (skip for components not in the validation map, e.g. geo)
    const validation = (0, ai_1.validateProps)(componentName, props);
    const errors = validation.errors ?? [];
    const isUnknownComponentOnly = errors.length === 1 && errors[0].startsWith("Unknown component");
    if (!validation.valid && !isUnknownComponentOnly) {
        return {
            svg: null,
            error: `Validation errors:\n${errors.join("\n")}`,
        };
    }
    // Disable hover (not useful in static SVG)
    const renderProps = { ...props, enableHover: false };
    try {
        const element = React.createElement(entry.component, renderProps);
        const svg = ReactDOMServer.renderToStaticMarkup(element);
        return { svg, error: null };
    }
    catch (err) {
        return {
            svg: null,
            error: `Render error: ${err.message || String(err)}`,
        };
    }
}
