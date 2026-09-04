#!/usr/bin/env node
/**
 * G-Guest MCP — local stdio server.
 *
 * It is a proxy and nothing else. Every call is forwarded verbatim to the hosted
 * G-Guest endpoint and the reply is returned as it came back. There is no
 * availability logic here, no database, no slot arithmetic: that lives in the
 * service and stays there.
 *
 * Why a wrapper exists at all: the hosted server speaks streamable HTTP, and a
 * good half of the clients and directories out there expect a command they can
 * run — `npx -y g-guest-mcp` in a Claude Desktop or Cursor config. This is that
 * command. It is also what lets a sandbox build and introspect the server
 * without reaching our infrastructure.
 *
 * The tool list is never written down here. It is fetched from the live server
 * at start-up, so the wrapper cannot drift away from the engine when a tool
 * gains a field. If the network is not there — an offline build, a sandbox with
 * no egress — it falls back to the tools.json committed beside this file, which
 * is generated from the same live endpoint. Introspection therefore succeeds
 * either way, and it never invents a schema of its own.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REMOTE = process.env.GGUEST_MCP_URL ?? "https://g-guest.app/api/mcp";
/** Start-up must not hang a client that is waiting to show a tool list. */
const DISCOVERY_TIMEOUT_MS = 6000;
const CALL_TIMEOUT_MS = 30000;

const here = dirname(fileURLToPath(import.meta.url));

type JsonRpcReply = { result?: unknown; error?: { code: number; message: string } };

/**
 * One request to the hosted server.
 *
 * The endpoint answers streamable HTTP, so the body may arrive either as plain
 * JSON or as a single SSE frame. Both shapes are unwrapped here rather than at
 * the call sites, and the session id the server hands back on initialize is
 * carried into later requests.
 */
class Remote {
  private sessionId: string | null = null;
  private id = 0;

  constructor(private readonly url: string) {}

  async send(method: string, params: unknown, timeoutMs: number): Promise<JsonRpcReply> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params }),
        signal: ac.signal,
      });
      const given = res.headers.get("Mcp-Session-Id");
      if (given) this.sessionId = given;
      const raw = await res.text();
      return parseBody(raw);
    } finally {
      clearTimeout(timer);
    }
  }

  /** A session has to exist before tools/list or tools/call are accepted. */
  async handshake(timeoutMs: number): Promise<void> {
    await this.send(
      "initialize",
      {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "g-guest-mcp-stdio", version: "1.0.0" },
      },
      timeoutMs
    );
  }
}

function parseBody(raw: string): JsonRpcReply {
  for (const line of raw.split("\n")) {
    if (line.startsWith("data: ")) return JSON.parse(line.slice(6));
  }
  return JSON.parse(raw);
}

/** The list the live server reports, or the one committed next to this file. */
async function discoverTools(remote: Remote): Promise<{ tools: Tool[]; source: string }> {
  try {
    await remote.handshake(DISCOVERY_TIMEOUT_MS);
    const reply = await remote.send("tools/list", {}, DISCOVERY_TIMEOUT_MS);
    const tools = (reply.result as { tools?: Tool[] } | undefined)?.tools;
    if (Array.isArray(tools) && tools.length) return { tools, source: "live server" };
    throw new Error("no tools in reply");
  } catch {
    // No network, or the service is having a moment. The bundled list is the
    // same one, generated from the same endpoint, so introspection still works
    // and the schemas are still not hand-written.
    const path = join(here, "..", "tools.json");
    const tools = JSON.parse(await readFile(path, "utf8")) as Tool[];
    return { tools, source: "bundled tools.json" };
  }
}

async function main() {
  const remote = new Remote(REMOTE);
  const { tools, source } = await discoverTools(remote);
  // stderr, never stdout: stdout is the protocol channel.
  console.error(`g-guest-mcp: ${tools.length} tools from ${source} (${REMOTE})`);

  const server = new Server(
    { name: "g-guest", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const reply = await remote.send("tools/call", request.params, CALL_TIMEOUT_MS);
      if (reply.error) {
        return {
          content: [{ type: "text" as const, text: reply.error.message }],
          isError: true,
        };
      }
      // Handed back exactly as the service produced it: this wrapper does not
      // reshape, summarise or second-guess a booking result.
      return reply.result as { content: unknown[] };
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: `Could not reach the G-Guest booking service (${REMOTE}): ${why}`,
          },
        ],
        isError: true,
      };
    }
  });

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("g-guest-mcp failed to start:", err);
  process.exit(1);
});
