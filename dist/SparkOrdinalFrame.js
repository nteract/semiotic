"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var OrdinalFrame_1 = __importDefault(require("./OrdinalFrame"));
var SparkFrame_1 = __importDefault(require("./SparkFrame"));
var SparkFrame_2 = require("./SparkFrame");
exports.default = SparkFrame_1.default(OrdinalFrame_1.default, SparkFrame_2.ordinalFrameDefaults, "SparkOrdinalFrame");
//# sourceMappingURL=SparkOrdinalFrame.js.map