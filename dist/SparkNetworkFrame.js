"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var NetworkFrame_1 = __importDefault(require("./NetworkFrame"));
var SparkFrame_1 = __importDefault(require("./SparkFrame"));
var SparkFrame_2 = require("./SparkFrame");
exports.default = SparkFrame_1.default(NetworkFrame_1.default, SparkFrame_2.networkFrameDefaults, "SparkNetworkFrame");
//# sourceMappingURL=SparkNetworkFrame.js.map