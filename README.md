# @tapcolorapp/api

Official TypeScript/JavaScript client for the [TapColor Developer API](https://developer.tapcolor.app) —
browse coloring **categories** and **collections** over a simple REST API.

Zero dependencies. Works in Node 18+, Deno, Bun and modern browsers.

- 📚 Docs & live explorer: <https://developer.tapcolor.app>
- 🔑 Request an API key: <https://tapcolor.app/contact/>
- 🧩 OpenAPI spec: <https://api.tapcolor.app/openapi.json>

## Install

```bash
# npm
npm install @tapcolorapp/api

# JSR (Deno / Node / Bun)
deno add jsr:@tapcolorapp/api
npx jsr add @tapcolorapp/api
```

## Quickstart

```ts
import { TapColor } from "@tapcolorapp/api";

const tc = new TapColor({ apiKey: "YOUR_API_KEY" });

// List categories
const cats = await tc.categories();
console.log(cats.total, "categories");

// List collections (filter + search + pagination)
const page = await tc.coloringPages({ category: "animals", limit: 20 });
page.items.forEach((c) => console.log(c.subtopic, "->", c.url));

// Iterate EVERY collection, auto-paginated
for await (const c of tc.allColoringPages({ category: "animals" })) {
  console.log(c.subtopicSlug);
}
```

## API

### `new TapColor(options)`

| Option    | Type               | Default                       | Notes                               |
| --------- | ------------------ | ----------------------------- | ----------------------------------- |
| `apiKey`  | `string`           | —                             | Required. Sent as the `api-key` header. |
| `baseUrl` | `string`           | `https://api.tapcolor.app`    | Override for testing/staging.       |
| `fetch`   | `typeof fetch`     | global `fetch`                | Custom fetch for Node <18 / tests.  |

### `tc.categories(): Promise<CategoriesResponse>`

Lists all 25 categories.

### `tc.coloringPages(params?): Promise<ColoringPagesResponse>`

| Param      | Type     | Description                                        |
| ---------- | -------- | -------------------------------------------------- |
| `category` | `string` | Category slug, e.g. `animals`.                     |
| `q`        | `string` | Search collection names (partial, case-insensitive). |
| `limit`    | `number` | 1–100 (default 20).                                |
| `offset`   | `number` | Pagination offset.                                 |

### `tc.allColoringPages(params?): AsyncGenerator<Collection>`

Auto-paginates and yields every matching collection.

## Errors

Any non-2xx response throws a `TapColorError` with `status` and `body`:

```ts
import { TapColor, TapColorError } from "@tapcolorapp/api";

try {
  await new TapColor({ apiKey: "bad" }).categories();
} catch (err) {
  if (err instanceof TapColorError) {
    console.error(err.status, err.message); // 401 "invalid or missing api-key"
  }
}
```

Rate limit: **120 requests / 10 minutes per key** → `429`.

## License

MIT © TapColor
