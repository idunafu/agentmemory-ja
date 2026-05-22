# @idunafu/agentmemory-ja-mcp

Standalone MCP server shim for [agentmemory-ja](https://github.com/idunafu/agentmemory-ja).

For local fork usage, prefer the main package binary so it cannot resolve to the
upstream npm package by accident:

```bash
agentmemory-ja mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "agentmemory": {
      "command": "agentmemory-ja",
      "args": ["mcp"]
    }
  }
}
```

If this shim package is published, it forwards to
`@idunafu/agentmemory-ja/dist/standalone.mjs`.

## License

Apache-2.0
