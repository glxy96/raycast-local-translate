import { getPreferenceValues } from "@raycast/api";

/** An OpenAI-compatible server that may host translation models. */
export interface Server {
  name: string;
  endpoint: string;
  apiKey?: string;
}

export interface ModelInfo {
  id: string;
  server: Server;
  /** Known only for LM Studio. */
  loaded?: boolean;
}

/** Local servers probed automatically, on their default ports. */
const LOCAL_SERVERS: Server[] = [
  { name: "LM Studio", endpoint: "http://localhost:1234/v1" },
  { name: "Ollama", endpoint: "http://localhost:11434/v1" },
];

const PROBE_TIMEOUT_MS = 1500;

export function isPlamoModel(id: string): boolean {
  return /plamo-3-translate/i.test(id);
}

/**
 * Accept what people naturally type: "localhost:1234" → "http://localhost:1234/v1".
 * A path other than "/" is kept as is (e.g. "https://openrouter.ai/api/v1").
 */
export function normalizeEndpoint(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path || "/v1"}`;
  } catch {
    return undefined;
  }
}

/** Local servers plus the custom server from the preferences, if any. */
export function getServers(): Server[] {
  const { customEndpoint, customApiKey } = getPreferenceValues<Preferences>();
  const servers = [...LOCAL_SERVERS];
  const endpoint = normalizeEndpoint(customEndpoint ?? "");
  // Skip it when it points at a server that is already probed.
  if (endpoint && !servers.some((s) => s.endpoint === endpoint)) {
    servers.push({ name: "Custom", endpoint, apiKey: customApiKey || undefined });
  }
  return servers;
}

/** API key to use for an endpoint: only the custom server has one. */
export function apiKeyFor(endpoint: string): string | undefined {
  return getServers().find((s) => s.endpoint === endpoint)?.apiKey;
}

async function getJson(url: string, apiKey?: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * List chat models on a server. Returns [] when the server is not running.
 * LM Studio's native `/api/v0/models` also tells the model type and whether it is loaded,
 * so it is tried first; any other server falls back to the standard `/v1/models`.
 */
export async function listModels(server: Server): Promise<ModelInfo[]> {
  const origin = server.endpoint.replace(/\/v1$/, "");
  try {
    const body = (await getJson(`${origin}/api/v0/models`, server.apiKey)) as {
      data?: { id: string; type?: string; state?: string }[];
    };
    if (Array.isArray(body.data)) {
      return body.data
        .filter((m) => m.type !== "embeddings")
        .map((m) => ({ id: m.id, server, loaded: m.state === "loaded" }));
    }
  } catch {
    // Not LM Studio (or an old version): fall through to the standard endpoint.
  }
  try {
    const body = (await getJson(`${server.endpoint}/models`, server.apiKey)) as { data?: { id: string }[] };
    return (body.data ?? []).filter((m) => !/embed/i.test(m.id)).map((m) => ({ id: m.id, server }));
  } catch {
    return [];
  }
}

export async function listAllModels(): Promise<ModelInfo[]> {
  return (await Promise.all(getServers().map(listModels))).flat();
}

/**
 * Pick a PLaMo 3 Translate model without any configuration:
 * a loaded one first (no load wait), then the smallest (fastest) available.
 */
export function pickPlamoModel(models: ModelInfo[]): ModelInfo | undefined {
  const size = (id: string) => parseFloat(id.match(/translate-([\d.]+)b/i)?.[1] ?? "99");
  return models
    .filter((m) => isPlamoModel(m.id))
    .sort((a, b) => Number(b.loaded ?? false) - Number(a.loaded ?? false) || size(a.id) - size(b.id))[0];
}

export async function findPlamoModel(): Promise<ModelInfo | undefined> {
  return pickPlamoModel(await listAllModels());
}
