# Как обновить это описание

Оно генерируется, а не пишется. Схемы инструментов тянутся из живого эндпоинта,
чтобы репозиторий не мог разойтись с продуктом.

```bash
cd ~/G-Lab/g-guest-mcp
curl -s -X POST https://g-guest.app/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin)["result"]["tools"], indent=2, ensure_ascii=False))' \
  > tools.json
git commit -am "tools.json: пересобран с живого эндпоинта" && git push
```

⛔ **Здесь не пишется код.** Сервер живёт в `g-lab-site/app/api/mcp/route.ts`.
Правки поведения — только там; сюда приезжает описание.
