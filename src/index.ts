/**
 * TapColor Developer API — official TypeScript/JavaScript client.
 *
 * Docs:   https://developer.tapcolor.app
 * API:    https://api.tapcolor.app
 * Source: https://github.com/tapcolorapp
 *
 * Zero dependencies. Works in Node 18+, Deno, Bun and modern browsers
 * (uses the global `fetch`).
 */

/** A coloring category (one of the 25 top-level categories). */
export interface Category {
  /** Human-readable name, e.g. "Animals". */
  name: string;
  /** Slug — use it as the `category` filter, e.g. "animals". */
  slug: string;
  /** Number of collections in the category. */
  subtopics: number;
  /** Total coloring pages across the category. */
  pages: number;
  /** Public category page on tapcolor.app. */
  url: string;
}

/** A coloring collection (subtopic). */
export interface Collection {
  category: string;
  categorySlug: string;
  subtopic: string;
  subtopicSlug: string;
  count: number;
  url: string;
  /** Cover thumbnail URL; may be null when no cover is set. */
  image: string | null;
}

export interface CategoriesResponse {
  total: number;
  items: Category[];
}

export interface ColoringPagesResponse {
  total: number;
  limit: number;
  offset: number;
  count: number;
  items: Collection[];
}

export interface ColoringPagesParams {
  /** Filter by category slug (see {@link Category.slug}). */
  category?: string;
  /** Search collection names (partial, case-insensitive). */
  q?: string;
  /** Page size, 1–100. Defaults to 20 server-side. */
  limit?: number;
  /** Skip the first N items for pagination. */
  offset?: number;
}

export interface TapColorOptions {
  /** API key issued by TapColor (sent as the `api-key` header). */
  apiKey: string;
  /** Override the base URL. Defaults to `https://api.tapcolor.app`. */
  baseUrl?: string;
  /** Custom fetch implementation (e.g. for Node <18 or testing). */
  fetch?: typeof fetch;
}

/** Thrown on any non-2xx response. */
export class TapColorError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "TapColorError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_BASE = "https://api.tapcolor.app";

/**
 * TapColor API client.
 *
 * ```ts
 * import { TapColor } from "@tapcolorapp/api";
 * const tc = new TapColor({ apiKey: "YOUR_API_KEY" });
 * const { items } = await tc.coloringPages({ category: "animals", limit: 20 });
 * ```
 */
export class TapColor {
  #apiKey: string;
  #baseUrl: string;
  #fetch: typeof fetch;

  constructor(options: TapColorOptions) {
    if (!options || !options.apiKey) {
      throw new Error("TapColor: `apiKey` is required");
    }
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
    const f = options.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Error("TapColor: no global `fetch` found — pass options.fetch");
    }
    this.#fetch = f;
  }

  async #get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(this.#baseUrl + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const res = await this.#fetch(url.toString(), {
      headers: { "api-key": this.#apiKey },
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body — keep raw text */
    }
    if (!res.ok) {
      const msg =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : res.statusText || `HTTP ${res.status}`;
      throw new TapColorError(res.status, msg, data);
    }
    return data as T;
  }

  /** List all 25 categories with collection and page counts. */
  categories(): Promise<CategoriesResponse> {
    return this.#get<CategoriesResponse>("/v1/categories");
  }

  /** List collections with optional filter, search and pagination. */
  coloringPages(params: ColoringPagesParams = {}): Promise<ColoringPagesResponse> {
    return this.#get<ColoringPagesResponse>(
      "/v1/coloring-pages",
      params as Record<string, unknown>,
    );
  }

  /**
   * Async-iterate every collection matching `params`, auto-paginating with
   * `limit`/`offset` until the full result set is exhausted.
   *
   * ```ts
   * for await (const c of tc.allColoringPages({ category: "animals" })) {
   *   console.log(c.subtopic, c.url);
   * }
   * ```
   */
  async *allColoringPages(
    params: ColoringPagesParams = {},
  ): AsyncGenerator<Collection, void, unknown> {
    const limit = params.limit ?? 100;
    let offset = params.offset ?? 0;
    for (;;) {
      const page = await this.coloringPages({ ...params, limit, offset });
      for (const item of page.items) yield item;
      offset += page.count;
      if (page.count === 0 || offset >= page.total) break;
    }
  }
}

export default TapColor;
