import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getServers,
  isPlamoModel,
  listModels,
  normalizeEndpoint,
  pickPlamoModel,
  type ModelInfo,
} from "../src/lib/servers";
import { json, mockFetch } from "./fetch";
import { preferences, resetRaycast } from "./raycast-api";

beforeEach(resetRaycast);
afterEach(() => vi.unstubAllGlobals());

describe("normalizeEndpoint", () => {
  it.each([
    ["localhost:1234", "http://localhost:1234/v1"],
    ["localhost:1234/", "http://localhost:1234/v1"],
    ["http://localhost:1234/v1/", "http://localhost:1234/v1"],
    ["192.168.1.20:1234", "http://192.168.1.20:1234/v1"],
    ["https://api.openai.com/v1", "https://api.openai.com/v1"],
    ["https://openrouter.ai/api/v1", "https://openrouter.ai/api/v1"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeEndpoint(input)).toBe(expected);
  });

  it.each(["", "   ", "http://"])("rejects %j", (input) => {
    expect(normalizeEndpoint(input)).toBeUndefined();
  });
});

describe("getServers", () => {
  it("probes LM Studio and Ollama by default", () => {
    expect(getServers().map((s) => s.name)).toEqual(["LM Studio", "Ollama"]);
  });

  it("does not duplicate an auto-probed server", () => {
    preferences.customEndpoint = "localhost:1234";
    expect(getServers().map((s) => s.name)).toEqual(["LM Studio", "Ollama"]);
  });

  it("adds a custom server with its API key", () => {
    preferences.customEndpoint = "https://api.openai.com/v1";
    preferences.customApiKey = "sk-test";
    expect(getServers().at(-1)).toEqual({ name: "Custom", endpoint: "https://api.openai.com/v1", apiKey: "sk-test" });
  });
});

describe("isPlamoModel", () => {
  it.each([
    ["plamo-3-translate-2b", true],
    ["hf.co/pfnet/plamo-3-translate-2b-GGUF:Q4_K_M", true],
    ["plamo-2-translate", false],
    ["gemma-4-26b", false],
  ])("%s → %s", (id, expected) => {
    expect(isPlamoModel(id)).toBe(expected);
  });
});

describe("pickPlamoModel", () => {
  const server = { name: "LM Studio", endpoint: "http://localhost:1234/v1" };
  const m = (id: string, loaded?: boolean): ModelInfo => ({ id, server, loaded });

  it("prefers a loaded model", () => {
    expect(pickPlamoModel([m("plamo-3-translate-0.8b"), m("plamo-3-translate-8b", true)])?.id).toBe(
      "plamo-3-translate-8b",
    );
  });

  it("otherwise prefers the smallest", () => {
    expect(
      pickPlamoModel([m("plamo-3-translate-8b"), m("plamo-3-translate-0.8b"), m("plamo-3-translate-2b")])?.id,
    ).toBe("plamo-3-translate-0.8b");
  });

  it("ignores other models", () => {
    expect(pickPlamoModel([m("gemma-4-26b", true)])).toBeUndefined();
  });
});

describe("listModels", () => {
  const server = { name: "LM Studio", endpoint: "http://localhost:1234/v1" };

  it("uses LM Studio's native API and drops embedding models", async () => {
    mockFetch(() =>
      json({
        data: [
          { id: "plamo-3-translate-2b", type: "llm", state: "loaded" },
          { id: "text-embedding-nomic", type: "embeddings", state: "not-loaded" },
        ],
      }),
    );
    expect(await listModels(server)).toEqual([{ id: "plamo-3-translate-2b", server, loaded: true }]);
  });

  it("falls back to /v1/models for other servers", async () => {
    const requests = mockFetch((req) =>
      req.url.endsWith("/api/v0/models")
        ? json({}, 404)
        : json({ data: [{ id: "llama3.2" }, { id: "nomic-embed-text" }] }),
    );
    expect(await listModels(server)).toEqual([{ id: "llama3.2", server }]);
    expect(requests.map((r) => r.url)).toEqual([
      "http://localhost:1234/api/v0/models",
      "http://localhost:1234/v1/models",
    ]);
  });

  it("returns [] when the server is down", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await listModels(server)).toEqual([]);
  });
});
