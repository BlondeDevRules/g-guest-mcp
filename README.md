# G-Guest MCP server

Book a table, an appointment or a place in a class at a real local business —
from an AI assistant, with no API key and no account.

G-Guest is the booking system those businesses run on. This server exposes it to
assistants over MCP: find a venue, read its real availability, and create a
booking that is confirmed instantly and appears in the venue's own panel.

**Endpoint** — `https://g-guest.app/api/mcp`
**Transport** — streamable HTTP (JSON-RPC 2.0 over POST)
**Auth** — none. Reading and booking are open; a booking must carry the guest's
name, phone and email.

## Tools

| Tool | What it does |
|---|---|
| `search` | Find bookable businesses by name or slug |
| `fetch` | Full details for one business: services, hours, how to book |
| `get_business` | The same card, by slug |
| `check_availability` | Real bookable slots for a date and party size |
| `create_booking` | A real, confirmed reservation |

Exact schemas: [`tools.json`](./tools.json) — generated from the live endpoint,
not written by hand.

## Try it without installing anything

```bash
curl -s -X POST https://g-guest.app/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

A live demo venue is `demo-studio` (a pilates studio) and `demo` (a restaurant).
Booking against those is real but harmless — they are ours.

## Adding it to an assistant

- **Claude, Codex, and custom agents** — point them at the endpoint. Nothing to
  install.
- **ChatGPT** — add it as a connector (developer mode). Step-by-step, with what
  we have actually tested and what we have not:
  https://g-guest.app/ai

## Honesty about what this is

Every venue reachable here is a paying or trialling customer of G-Guest, and a
booking made through this server is a real reservation that a real business will
honour. There is no marketplace in the middle and no commission on the booking.

We list only what we have tested ourselves. `https://g-guest.app/ai` says which
assistants have actually created a confirmed booking here, and on what date.

## Where the code lives

⚠️ **This repository contains no server code, and never should.** The MCP server
is implemented inside the G-Guest application itself (private), and this repo is
its public description: the endpoint, the tool schemas and the docs, so registries
and assistants can find it. `tools.json` is regenerated from the live endpoint —
if the two ever disagree, the live endpoint is right.

## Links

- Service manifest — https://g-guest.app/.well-known/g-guest.json
- OpenAPI (plain HTTP, for agents without MCP) — https://g-guest.app/openapi.json
- What works today, per assistant — https://g-guest.app/ai
- G-Guest — https://g-guest.app

Made by [G-Lab Studio](https://g-lab.studio).
