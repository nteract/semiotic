Semiotic Charts Privacy Policy

Semiotic Charts is a ChatGPT app that renders charts from data and configuration provided by the user or generated during the conversation.

Data processed

The app may receive chart data, chart configuration, labels, titles, annotations, and related visualization instructions. This information is used to generate chart previews, chart specifications, SVG output, accessibility descriptions, and chart diagnostics.

Data storage

Semiotic Charts does not intentionally store user-submitted chart data, conversation content, or generated chart outputs. Server logs may contain bounded operational metadata such as request time, response status, latency, route category, and fixed error/rejection category for debugging and reliability.

The MCP process uses a metadata-only logging boundary. Its records are bounded and do not include request headers, credentials, cookies, query strings, JSON-RPC bodies or IDs, tool names or arguments, chart values/configuration/output, raw error messages, or stack traces. The process has no telemetry exporter.

The process declares a 30-day maximum log-retention policy by default (configurable from 1 to 90 days). The hosting provider's log bucket and any proxy/request logging must be configured to enforce that period; application code cannot retroactively delete provider logs. See the deployment README for the exact logging configuration and verification requirement.

Data sharing

Semiotic Charts does not sell user data. Data is not shared with advertisers. Data may be processed by hosting infrastructure and service providers only as necessary to operate the app.

User-provided data

Users should not submit sensitive personal data, confidential business data, regulated data, or secrets unless they are authorized to do so.

Contact

For questions about this policy, contact the maintainers through the Semiotic repository at https://github.com/nteract/semiotic.
