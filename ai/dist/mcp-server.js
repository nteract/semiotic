#!/usr/bin/env node
"use strict";
/**
 * Semiotic MCP Server
 *
 * Exposes five tools:
 *   1. renderChart — renders any HOC chart to static SVG
 *   2. diagnoseConfig — anti-pattern detector for chart configurations
 *   3. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
 *   4. getSchema — returns the prop schema for a specific component
 *   5. suggestChart — recommends chart types for a given data shape
 *
 * Usage (Claude Desktop / claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "semiotic": {
 *       "command": "npx",
 *       "args": ["semiotic-mcp"]
 *     }
 *   }
 * }
 *
 * HTTP mode (for remote inspectors / web clients):
 *   npx semiotic-mcp --http --port 3001
 */
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
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const renderHOCToSVG_1 = require("./renderHOCToSVG");
const componentRegistry_1 = require("./componentRegistry");
const ai_1 = require("semiotic/ai");
// Load schema.json for version info
const schemaPath = path.resolve(__dirname, "../schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
// Build component name → schema lookup from schema.json
const schemaByComponent = {};
for (const tool of schema.tools) {
    schemaByComponent[tool.function.name] = tool.function;
}
const componentNames = Object.keys(componentRegistry_1.COMPONENT_REGISTRY).sort();
const REPO = "nteract/semiotic";
async function getSchemaHandler(args) {
    const component = args.component;
    if (!component) {
        const all = Object.keys(schemaByComponent).sort();
        const renderable = new Set(Object.keys(componentRegistry_1.COMPONENT_REGISTRY));
        const list = all.map(name => renderable.has(name) ? `${name} [renderable]` : name);
        return {
            content: [{ type: "text", text: `Available components (${all.length}):\n${list.join(", ")}\n\nComponents marked [renderable] can be rendered to SVG via renderChart. Others (Realtime*) require a browser environment.\n\nPass { component: '<name>' } to get the prop schema for a specific component.` }],
        };
    }
    const entry = schemaByComponent[component];
    if (!entry) {
        const available = Object.keys(schemaByComponent).sort();
        return {
            content: [{ type: "text", text: `Unknown component "${component}". Available: ${available.join(", ")}` }],
            isError: true,
        };
    }
    const renderableNote = componentRegistry_1.COMPONENT_REGISTRY[component] ? "This component can be rendered to SVG via renderChart." : "This component requires a browser environment and cannot be rendered via renderChart.";
    return {
        content: [{ type: "text", text: `${renderableNote}\n\n${JSON.stringify(entry, null, 2)}` }],
    };
}
async function suggestChartHandler(args) {
    const data = args.data;
    const intent = args.intent;
    if (!data || !Array.isArray(data) || data.length === 0) {
        return {
            content: [{ type: "text", text: "Pass { data: [{ ... }, ...] } with 1-5 sample data objects. Optionally include intent: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'geographic' | 'network' | 'hierarchy'." }],
            isError: true,
        };
    }
    const sample = data[0];
    if (!sample || typeof sample !== "object") {
        return {
            content: [{ type: "text", text: "Data items must be objects with key-value pairs." }],
            isError: true,
        };
    }
    const keys = Object.keys(sample);
    const suggestions = [];
    // Classify fields
    const numericFields = [];
    const stringFields = [];
    const dateFields = [];
    const geoFields = {};
    const networkFields = {};
    const hierarchyFields = {};
    for (const key of keys) {
        const values = data.map(d => d[key]).filter(v => v != null);
        if (values.length === 0)
            continue;
        const first = values[0];
        if (typeof first === "number") {
            numericFields.push(key);
        }
        else if (typeof first === "string") {
            if (/^\d{4}[-/]\d{2}/.test(first) && !isNaN(Date.parse(first))) {
                dateFields.push(key);
            }
            else {
                stringFields.push(key);
            }
        }
        const kl = key.toLowerCase();
        if (kl === "lat" || kl === "latitude")
            geoFields.lat = key;
        if (kl === "lon" || kl === "lng" || kl === "longitude")
            geoFields.lon = key;
        if (kl === "source" || kl === "from")
            networkFields.source = key;
        if (kl === "target" || kl === "to")
            networkFields.target = key;
        if (kl === "value" || kl === "weight" || kl === "amount")
            networkFields.value = key;
        if (kl === "children" || kl === "values")
            hierarchyFields.children = key;
        if (kl === "parent")
            hierarchyFields.parent = key;
    }
    const hasTime = dateFields.length > 0;
    const hasCat = stringFields.length > 0;
    const hasNum = numericFields.length > 0;
    const hasGeo = geoFields.lat && geoFields.lon;
    const hasNetwork = networkFields.source && networkFields.target;
    const hasHierarchy = hierarchyFields.children || hierarchyFields.parent;
    // Network data
    if (hasNetwork && (!intent || intent === "network")) {
        const src = networkFields.source;
        const tgt = networkFields.target;
        if (networkFields.value) {
            suggestions.push({
                component: "SankeyDiagram",
                confidence: "high",
                reason: `Data has ${src}→${tgt} with ${networkFields.value} — ideal for flow visualization`,
                props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"`, valueAccessor: `"${networkFields.value}"` },
            });
        }
        suggestions.push({
            component: "ForceDirectedGraph",
            confidence: networkFields.value ? "medium" : "high",
            reason: `Data has ${src}→${tgt} edges — force layout shows network structure. Nodes are auto-inferred from edges when not provided.`,
            props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"` },
        });
    }
    // Hierarchy data
    if (hasHierarchy && (!intent || intent === "hierarchy")) {
        suggestions.push({
            component: "Treemap",
            confidence: "high",
            reason: `Data has nested ${hierarchyFields.children || "parent"} structure — treemap shows hierarchical proportions`,
            props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"`, ...(numericFields[0] ? { valueAccessor: `"${numericFields[0]}"` } : {}) },
        });
        suggestions.push({
            component: "TreeDiagram",
            confidence: "medium",
            reason: "Tree layout shows hierarchical relationships",
            props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"` },
        });
    }
    // Geographic data
    if (hasGeo && (!intent || intent === "geographic")) {
        const sizeField = numericFields.find(f => f !== geoFields.lat && f !== geoFields.lon);
        suggestions.push({
            component: "ProportionalSymbolMap",
            confidence: "high",
            reason: `Data has ${geoFields.lat}/${geoFields.lon} coordinates — map shows spatial distribution`,
            props: { points: "data", xAccessor: `"${geoFields.lon}"`, yAccessor: `"${geoFields.lat}"`, ...(sizeField ? { sizeBy: `"${sizeField}"` } : {}) },
        });
    }
    // Time series
    if (hasTime && hasNum && (!intent || intent === "trend")) {
        const timeField = dateFields[0];
        const valueField = numericFields[0];
        suggestions.push({
            component: "LineChart",
            confidence: "high",
            reason: `Data has dates (${timeField}) and numeric values (${valueField}) — line chart shows trends over time`,
            props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, ...(hasCat ? { lineBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` } : {}) },
        });
        if (hasCat) {
            suggestions.push({
                component: "StackedAreaChart",
                confidence: "medium",
                reason: `Multiple categories (${stringFields[0]}) over time — stacked area shows composition trends`,
                props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, areaBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` },
            });
        }
    }
    // Categorical + numeric
    if (hasCat && hasNum && (!intent || intent === "comparison" || intent === "composition" || intent === "distribution")) {
        const catField = stringFields[0];
        const valField = numericFields[0];
        if (!intent || intent === "comparison") {
            suggestions.push({
                component: "BarChart",
                confidence: hasTime ? "medium" : "high",
                reason: `Categorical field (${catField}) with values (${valField}) — bar chart for comparison`,
                props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
            });
        }
        if (stringFields.length >= 2 && (!intent || intent === "composition")) {
            suggestions.push({
                component: "StackedBarChart",
                confidence: "medium",
                reason: `Two categorical fields (${stringFields.join(", ")}) — stacked bar shows composition within categories`,
                props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"`, stackBy: `"${stringFields[1]}"` },
            });
        }
        if (!intent || intent === "distribution") {
            suggestions.push({
                component: "Histogram",
                confidence: "medium",
                reason: `Numeric distribution of ${valField} — histogram shows value spread`,
                props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
            });
        }
        if (!intent || intent === "composition") {
            const uniqueCats = new Set(data.map(d => d[catField])).size;
            if (uniqueCats <= 8) {
                suggestions.push({
                    component: "DonutChart",
                    confidence: "medium",
                    reason: `${uniqueCats} categories — donut chart shows proportional composition`,
                    props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
                });
            }
        }
    }
    // Two numeric fields → scatterplot
    if (numericFields.length >= 2 && (!intent || intent === "relationship")) {
        const xField = numericFields[0];
        const yField = numericFields[1];
        suggestions.push({
            component: "Scatterplot",
            confidence: "high",
            reason: `Two numeric fields (${xField}, ${yField}) — scatterplot shows relationships`,
            props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, ...(hasCat ? { colorBy: `"${stringFields[0]}"` } : {}), ...(numericFields[2] ? { sizeBy: `"${numericFields[2]}"` } : {}) },
        });
        if (numericFields.length >= 3) {
            suggestions.push({
                component: "BubbleChart",
                confidence: "medium",
                reason: `Three numeric fields — bubble chart adds size dimension to scatter`,
                props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, sizeBy: `"${numericFields[2]}"` },
            });
        }
        if (numericFields.length >= 2 && hasCat) {
            suggestions.push({
                component: "Heatmap",
                confidence: "medium",
                reason: `Numeric values across dimensions — heatmap shows density/intensity`,
                props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${hasCat ? stringFields[0] : yField}"`, valueAccessor: `"${hasCat ? numericFields[0] : numericFields[2] || yField}"` },
            });
        }
    }
    // Fallback
    if (suggestions.length === 0) {
        const fieldSummary = `Fields: ${keys.join(", ")} (${numericFields.length} numeric, ${stringFields.length} categorical, ${dateFields.length} date)`;
        return {
            content: [{ type: "text", text: `Could not confidently recommend a chart type.\n\n${fieldSummary}\n\nTry providing intent ('comparison', 'trend', 'distribution', 'relationship', 'composition', 'geographic', 'network', 'hierarchy') to narrow recommendations, or use getSchema to browse available components.` }],
        };
    }
    // Format output
    const lines = suggestions.map((s, i) => {
        const propsStr = Object.entries(s.props).map(([k, v]) => `${k}=${v}`).join(" ");
        return `${i + 1}. **${s.component}** (${s.confidence} confidence)\n   ${s.reason}\n   \`<${s.component} ${propsStr} />\``;
    });
    return {
        content: [{ type: "text", text: lines.join("\n\n") }],
    };
}
async function renderChartHandler(args) {
    const component = args.component;
    const props = args.props ?? {};
    if (!component) {
        return {
            content: [{ type: "text", text: `Missing 'component' field. Provide { component: '<name>', props: { ... } }. Available: ${componentNames.join(", ")}` }],
            isError: true,
        };
    }
    if (!componentRegistry_1.COMPONENT_REGISTRY[component]) {
        return {
            content: [{ type: "text", text: `Unknown component "${component}". Available: ${componentNames.join(", ")}` }],
            isError: true,
        };
    }
    const result = (0, renderHOCToSVG_1.renderHOCToSVG)(component, props);
    if (result.error) {
        return {
            content: [{ type: "text", text: result.error }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: result.svg }],
    };
}
async function diagnoseConfigHandler(args) {
    const component = args.component;
    const props = args.props ?? {};
    if (!component) {
        return {
            content: [{ type: "text", text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
            isError: true,
        };
    }
    const result = (0, ai_1.diagnoseConfig)(component, props);
    if (result.ok) {
        const warnings = result.diagnoses.filter((d) => d.severity === "warning");
        const msg = warnings.length > 0
            ? `Configuration looks good with ${warnings.length} warning(s):\n${warnings.map((w) => `⚠ [${w.code}] ${w.message}\n  Fix: ${w.fix}`).join("\n")}`
            : `✓ Configuration looks good — no issues detected.`;
        return { content: [{ type: "text", text: msg }] };
    }
    const lines = result.diagnoses.map((d) => {
        const icon = d.severity === "error" ? "✗" : "⚠";
        const fixLine = d.fix ? `\n  Fix: ${d.fix}` : "";
        return `${icon} [${d.code}] ${d.message}${fixLine}`;
    });
    return {
        content: [{ type: "text", text: lines.join("\n") }],
        isError: true,
    };
}
async function reportIssueHandler(args) {
    const title = args.title;
    const body = args.body;
    const labels = args.labels;
    if (!title) {
        return {
            content: [{ type: "text", text: "Missing 'title' field. Provide { title: 'Bug: ...', body: '...', labels?: ['bug'] }." }],
            isError: true,
        };
    }
    const params = new URLSearchParams();
    params.set("title", title);
    if (body)
        params.set("body", body);
    if (labels) {
        const labelList = Array.isArray(labels) ? labels.join(",") : labels;
        params.set("labels", labelList);
    }
    const url = `https://github.com/${REPO}/issues/new?${params.toString()}`;
    return {
        content: [{ type: "text", text: `Open this URL to submit the issue:\n\n${url}` }],
    };
}
// ── Server factory ───────────────────────────────────────────────────────
// Creates a fresh McpServer with all tools registered.
// HTTP mode needs one instance per session (McpServer can only connect to one transport).
// Stdio mode uses a single instance.
function createServer() {
    const srv = new mcp_js_1.McpServer({
        name: "semiotic",
        version: schema.version || "3.0.0",
    });
    srv.tool("getSchema", `Return the prop schema for a Semiotic chart component. Pass { component: '<name>' } to get its props, or omit component to list all available components. Components marked [renderable] can be passed to renderChart for static SVG output.`, { component: zod_1.z.string().optional().describe("Component name, e.g. 'LineChart'. Omit to list all.") }, getSchemaHandler);
    srv.tool("suggestChart", "Recommend Semiotic chart types for a given data sample. Pass { data: [...] } with 1-5 sample objects. Optionally pass intent to narrow suggestions. Returns ranked recommendations with example props.", {
        data: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).min(1).max(5).describe("1-5 sample data objects"),
        intent: zod_1.z.enum(["comparison", "trend", "distribution", "relationship", "composition", "geographic", "network", "hierarchy"]).optional().describe("Visualization intent to narrow suggestions"),
    }, suggestChartHandler);
    srv.tool("renderChart", `Render a Semiotic chart to static SVG. Returns SVG string or validation errors. Available components: ${componentNames.join(", ")}.`, {
        component: zod_1.z.string().describe("Chart component name, e.g. 'LineChart', 'BarChart'"),
        props: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
    }, renderChartHandler);
    srv.tool("diagnoseConfig", "Diagnose a Semiotic chart configuration for common problems (empty data, bad dimensions, missing accessors, wrong data shape, etc). Returns a human-readable diagnostic report with actionable fixes.", {
        component: zod_1.z.string().describe("Chart component name, e.g. 'LineChart'"),
        props: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
    }, diagnoseConfigHandler);
    srv.tool("reportIssue", "Generate a GitHub issue URL for Semiotic bug reports or feature requests. Returns a URL the user can open to submit. For rendering bugs, include the component name, props summary, and any diagnoseConfig output in the body.", {
        title: zod_1.z.string().describe("Issue title, e.g. 'Bug: BarChart tooltip shows undefined'"),
        body: zod_1.z.string().optional().describe("Issue body with details, reproduction steps, diagnoseConfig output"),
        labels: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional().describe("GitHub labels, e.g. ['bug'] or 'bug'"),
    }, reportIssueHandler);
    return srv;
}
// ── Startup ──────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);
const httpMode = cliArgs.includes("--http");
const portFlagIndex = cliArgs.indexOf("--port");
const parsedPort = portFlagIndex !== -1 && cliArgs[portFlagIndex + 1] != null
    ? parseInt(cliArgs[portFlagIndex + 1], 10)
    : NaN;
const port = Number.isFinite(parsedPort) ? parsedPort : 3001;
async function main() {
    if (httpMode) {
        // HTTP mode — session-based, one server+transport per session
        const sessions = new Map();
        const httpServer = http.createServer(async (req, res) => {
            // CORS headers for browser-based inspectors
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
            res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
            if (req.method === "OPTIONS") {
                res.writeHead(204);
                res.end();
                return;
            }
            const sessionId = req.headers["mcp-session-id"];
            if (sessionId && sessions.has(sessionId)) {
                // Existing session — route to its transport
                const session = sessions.get(sessionId);
                await session.transport.handleRequest(req, res);
            }
            else if (!sessionId) {
                // New session — create server + transport
                const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                    sessionIdGenerator: () => `semiotic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                });
                const srv = createServer();
                await srv.connect(transport);
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid)
                        sessions.delete(sid);
                };
                await transport.handleRequest(req, res);
                const sid = transport.sessionId;
                if (sid) {
                    sessions.set(sid, { server: srv, transport });
                }
            }
            else {
                // Session ID provided but not found — stale session
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Unknown session. Send a request without mcp-session-id to start a new session." }, id: null }));
            }
        });
        httpServer.listen(port, () => {
            console.error(`Semiotic MCP server (HTTP) listening on http://localhost:${port}`);
            console.error("Tools: getSchema, suggestChart, renderChart, diagnoseConfig, reportIssue");
        });
    }
    else {
        // Default: stdio mode for Claude Desktop, Claude Code, Cursor, etc.
        const srv = createServer();
        const transport = new stdio_js_1.StdioServerTransport();
        await srv.connect(transport);
    }
}
main().catch((err) => {
    console.error("MCP server error:", err);
    process.exit(1);
});
