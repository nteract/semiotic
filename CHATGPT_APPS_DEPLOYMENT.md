# ChatGPT Apps Deployment Playbook

This guide describes how to turn the `semiotic-mcp` ChatGPT Apps experiment into a public ChatGPT app. The important distinction:

- A public HTTPS MCP endpoint lets you test and share a developer-mode connector.
- "Anyone using ChatGPT can use it" requires OpenAI app review and publication through the OpenAI Platform Dashboard.

## What This Repo Provides

The current MCP server already exposes:

- `renderInteractiveChart` — renders a Semiotic chart server-side and returns a ChatGPT/MCP Apps widget payload.
- `ui://semiotic/chart-widget.html` — the `text/html;profile=mcp-app` widget template used by ChatGPT.
- Streamable HTTP mode via `semiotic-mcp --http --port <port>`.

The deployable unit should be this repo or an npm package version that includes these changes.

## 1. Prepare The Production Build

Build from a clean checkout on the host or CI system:

```bash
npm ci
npm run dist:prod
npm run build:mcp
npm run typescript:mcp
npx vitest run src/__tests__/scenarios/mcp-protocol.test.ts
```

Start command:

```bash
node ai/dist/mcp-server.js --http --port "$PORT"
```

If the host does not set `PORT`, use a fixed port:

```bash
node ai/dist/mcp-server.js --http --port 3001
```

The server accepts MCP requests on the HTTP server regardless of path, so a reverse proxy can expose `/mcp` to ChatGPT while forwarding to the Node process.

## 2. Host A Stable HTTPS Endpoint

For developer-mode testing, a tunnel is acceptable. For public submission, use a stable public HTTPS domain, not a local tunnel.

Recommended requirements:

- Public URL: `https://mcp.yourdomain.example/mcp`
- TLS certificate from the hosting provider or reverse proxy.
- Long-lived HTTP responses and server-sent events supported.
- No proxy buffering for MCP streaming responses.
- Logs for request ID, tool name, response status, latency, and uncaught errors.
- Restart policy for the Node process.

Suitable hosts include Fly.io, Render, Railway, Google Cloud Run, Azure Container Apps, Kubernetes, or a VM behind nginx/Caddy. Vercel can work only if the chosen runtime supports the MCP Streamable HTTP behavior without timing out or buffering.

Example reverse proxy shape:

```nginx
location /mcp {
  proxy_pass http://127.0.0.1:3001;
  proxy_http_version 1.1;
  proxy_buffering off;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 3. Smoke-Test The Endpoint

Use MCP Inspector first:

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect it to:

```text
https://mcp.yourdomain.example/mcp
```

Verify:

- `tools/list` includes `renderInteractiveChart`.
- `resources/list` includes `ui://semiotic/chart-widget.html`.
- Calling `renderInteractiveChart` with a small `BarChart` returns `structuredContent`, `_meta.svg`, and no tool error.
- The widget renders in the inspector without console errors.

Use this minimal test payload:

```json
{
  "component": "BarChart",
  "props": {
    "title": "Revenue by Quarter",
    "data": [
      { "quarter": "Q1", "revenue": 120 },
      { "quarter": "Q2", "revenue": 180 }
    ],
    "categoryAccessor": "quarter",
    "valueAccessor": "revenue",
    "width": 420,
    "height": 280
  }
}
```

## 4. Connect It In ChatGPT Developer Mode

In ChatGPT:

1. Open `Settings -> Apps & Connectors -> Advanced settings`.
2. Enable Developer Mode if your organization allows it.
3. Go to `Settings -> Connectors -> Create`.
4. Fill in:
   - Connector name: `Semiotic Charts`
   - Description: `Render interactive Semiotic charts from pasted or generated data. Use for chart selection, configuration diagnosis, static SVG rendering, and interactive chart previews.`
   - Connector URL: `https://mcp.yourdomain.example/mcp`
5. Create the connector and confirm ChatGPT discovers the tool list.
6. In a new chat, add the connector with `+ -> More`.
7. Prompt: `Use Semiotic Charts to render an interactive bar chart for this data: ...`

Refresh the connector metadata in ChatGPT settings whenever tool names, descriptions, input schemas, output schemas, or widget metadata change.

## 5. Production Hardening Before Public Submission

Before asking OpenAI to review the app:

- Confirm the endpoint is stable under repeated `initialize`, `tools/list`, `resources/read`, and `tools/call` requests.
- Keep `renderInteractiveChart` read-only and idempotent.
- Do not remove or rename published tools or UI resource URIs once users depend on them.
- Keep the widget CSP exact. The current widget uses no external fetches or assets, so empty `connectDomains` and `resourceDomains` are intentional.
- Put abuse controls in front of the Node process. The server itself ships with open CORS (`*`), no auth, no request body size limit, and no rate limiting — acceptable for developer-mode testing, not for a public endpoint that renders arbitrary payloads. At minimum configure rate limiting and a request body size cap (e.g. 1 MB) at the reverse proxy, and consider an idle-session eviction policy (sessions are only removed when the client closes its transport).
- Add operational monitoring and error alerts.
- Create a privacy policy page, even if the app stores no user data.
- Prepare screenshots showing the widget in ChatGPT.
- Prepare golden prompts and expected outputs for review.
- Test ChatGPT web and mobile layouts.

If auth is added later, implement OAuth before submission. Do not submit a public app that depends on a temporary secret, local environment, or organization-only endpoint.

## 6. Submit For Public ChatGPT Distribution

Use the OpenAI Platform Dashboard app management flow.

Prerequisites:

- Your organization or individual publisher identity is verified.
- You have `api.apps.write` to create/submit drafts.
- You have `api.apps.read` to view drafts and review status.
- The MCP server URL is a real public endpoint OpenAI can reach during review.
- The app complies with the ChatGPT app submission guidelines.

Submission package:

- App name.
- Publisher name.
- Short and long descriptions.
- App icon and screenshots.
- Privacy policy URL.
- Public MCP server URL, usually `https://mcp.yourdomain.example/mcp`.
- Tool list discovered from the endpoint.
- Widget/resource metadata discovered from the endpoint.
- Test account details if auth is required.
- Example prompts and expected behavior.
- Notes explaining that the app renders user-provided or model-generated chart data and does not need external data access.

After approval, click `Publish` in the Platform Dashboard. Publication creates the public ChatGPT app listing and the Codex plugin distribution derived from the approved app metadata.

## 7. Versioning And Maintenance

OpenAI snapshots app metadata during review. The live server still handles tool calls, but changed metadata does not automatically update the published app.

For server-only fixes:

- Safe if tool names, schemas, widget URIs, CSP, and behavior remain backward-compatible.
- Deploy normally.

For metadata or contract changes:

1. Deploy the backward-compatible server change.
2. Create or update a draft app version in the Platform Dashboard.
3. Scan the MCP endpoint.
4. Submit the new version for review.
5. Publish after approval.

Avoid breaking changes:

- Do not remove `renderInteractiveChart`.
- Do not remove `ui://semiotic/chart-widget.html`.
- Do not make required input fields stricter without keeping old calls working.
- Do not change the widget URI unless the old URI remains available.

## References

- OpenAI Apps SDK: Connect from ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- OpenAI Apps SDK: Deploy your app: https://developers.openai.com/apps-sdk/deploy
- OpenAI Apps SDK: Test your integration: https://developers.openai.com/apps-sdk/deploy/testing
- OpenAI Apps SDK: Submit and maintain your app: https://developers.openai.com/apps-sdk/deploy/submission
- OpenAI Apps SDK: App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines
