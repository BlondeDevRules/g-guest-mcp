# G-Guest MCP server

Book a table, an appointment or a place in a class at a real local business,
from an AI assistant, with no API key and no account.

G-Guest is the booking system those businesses run on. This server exposes it to
assistants over MCP: find a venue, read its real availability, and create a
booking that is confirmed instantly and appears in the venue's own panel.

**Endpoint** · `https://g-guest.app/api/mcp`
**Transport** · streamable HTTP (JSON-RPC 2.0 over POST)
**Auth** · none. Reading and booking are open; a booking must carry the guest's
name, phone and email.

## Tools

| Tool | What it does |
|---|---|
| `search` | Find bookable businesses by name or slug |
| `fetch` | Full details for one business: services, hours, how to book |
| `get_business` | The same card, by slug |
| `check_availability` | Real bookable slots for a date and party size |
| `create_booking` | A real, confirmed reservation |

Exact schemas: [`tools.json`](./tools.json), generated from the live endpoint,
not written by hand.

## Two ways to connect

**By URL**, if your client speaks streamable HTTP. Point it at
`https://g-guest.app/api/mcp`. Nothing to install.

**By command**, if your client expects a local stdio server, which is what
Claude Desktop and Cursor configs usually want:

```json
{
  "mcpServers": {
    "g-guest": {
      "command": "npx",
      "args": ["-y", "g-guest-mcp"]
    }
  }
}
```

That command runs the small proxy in this repository. It forwards every call to
the hosted endpoint and hands the answer back unchanged: no booking logic runs
on your machine, and no key is needed. `GGUEST_MCP_URL` overrides the endpoint
if you are pointing at something else.

The tool list is not written into the proxy. It asks the live server for it at
start-up, so the wrapper cannot fall behind the service; with no network it
falls back to the `tools.json` in this repository, which is generated from that
same endpoint.

## Try it without installing anything

```bash
curl -s -X POST https://g-guest.app/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

A live demo venue is `demo-studio` (a pilates studio) and `demo` (a restaurant).
Booking against those is real but harmless: they are ours.

## Adding it to an assistant

- **Claude, Codex, and custom agents**: point them at the endpoint. Nothing to
  install.
- **ChatGPT**: add it as a connector (developer mode). Step-by-step, with what
  we have actually tested and what we have not:
  https://g-guest.app/ai

## Honesty about what this is

Every venue reachable here is a paying or trialling customer of G-Guest, and a
booking made through this server is a real reservation that a real business will
honour. There is no marketplace in the middle and no commission on the booking.

We list only what we have tested ourselves. `https://g-guest.app/ai` says which
assistants have actually created a confirmed booking here, and on what date.

## Where the code lives

**The booking engine is not here and never will be.** Availability, slot
arithmetic, the guest list, everything that decides whether a table can be sold:
that lives inside the G-Guest application and stays there.

What this repository does hold is the stdio proxy in `src/`, about a hundred
lines whose entire job is to pass JSON-RPC through and return the reply as it
came. It exists because a good half of the clients and directories expect a
command to run rather than a URL to call, and because a sandbox has to be able
to build and introspect the server without reaching our infrastructure.

`tools.json` is regenerated from the live endpoint. If the two ever disagree,
the live endpoint is right.

## Links

- Service manifest · https://g-guest.app/.well-known/g-guest.json
- OpenAPI (plain HTTP, for agents without MCP) · https://g-guest.app/openapi.json
- What works today, per assistant · https://g-guest.app/ai
- G-Guest · https://g-guest.app

Made by [G-Lab Studio](https://g-lab.studio).
