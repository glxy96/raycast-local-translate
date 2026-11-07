import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeeplBackend } from "../src/lib/backends/deepl";
import { buildPrompt, createLlmBackend, DEFAULT_PROMPT } from "../src/lib/backends/llm";
import { createPlamoBackend } from "../src/lib/backends/plamo";
import { TranslationError } from "../src/lib/backends/types";
import { json, mockFetch, sse } from "./fetch";
import { preferences, resetRaycast } from "./raycast-api";

beforeEach(resetRaycast);
afterEach(() => vi.unstubAllGlobals());

const target = { endpoint: "http://localhost:1234/v1", model: "plamo-3-translate-2b" };
const reply = (content: string) => json({ choices: [{ message: { content } }] });

describe("PLaMo 3 Translate", () => {
  it("sends settings in the [plamo-translate] system message with PFML3 stop tokens", async () => {
    const requests = mockFetch(() => reply(" Hello "));
    const result = await createPlamoBackend(target).translate({ text: "こんにちは", target: "en", form: "default" });
    expect(result).toBe("Hello");
    expect(requests[0].url).toBe("http://localhost:1234/v1/chat/completions");
    expect(requests[0].body).toMatchObject({
      model: "plamo-3-translate-2b",
      messages: [
        { role: "system", content: "[plamo-translate]\ntarget_lang=en" },
        { role: "user", content: "こんにちは" },
      ],
      stop: ["<|plamo:tag|>", "<|plamo:bos|>"],
      temperature: 0,
      stream: false,
    });
    expect(requests[0].headers.Authorization).toBeUndefined();
  });

  it("adds form only when translating into Japanese", async () => {
    const requests = mockFetch(() => reply("x"));
    const backend = createPlamoBackend(target);
    await backend.translate({ text: "a", target: "ja", form: "polite" });
    await backend.translate({ text: "a", target: "en", form: "polite" });
    const system = requests.map((r) => (r.body.messages as { content: string }[])[0].content);
    expect(system).toEqual(["[plamo-translate]\ntarget_lang=ja\nform=polite", "[plamo-translate]\ntarget_lang=en"]);
  });

  it("streams partial results across chunk boundaries", async () => {
    mockFetch(() => sse(["The ", "meeting ", "moved."], 5));
    const partials: string[] = [];
    const result = await createPlamoBackend(target).translate({
      text: "会議が移動",
      target: "en",
      form: "default",
      onPartial: (p) => partials.push(p),
    });
    // Leading whitespace is trimmed; a trailing space just means the next word is still coming.
    expect(partials).toEqual(["The ", "The meeting ", "The meeting moved."]);
    expect(result).toBe("The meeting moved.");
  });

  it("reports an unreachable server as a TranslationError", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    const error = await createPlamoBackend(target)
      .translate({ text: "a", target: "en", form: "default" })
      .catch((e) => e);
    expect(error).toBeInstanceOf(TranslationError);
    expect(error.message).toBe("http://localhost:1234/v1 に接続できません");
    expect(error.hint).toContain("lms server start");
  });

  it("passes the server's error message through", async () => {
    mockFetch(() => json({ error: { message: "Model not found" } }, 404));
    const error = await createPlamoBackend(target)
      .translate({ text: "a", target: "en", form: "default" })
      .catch((e) => e);
    expect(error).toBeInstanceOf(TranslationError);
    expect(error.hint).toBe("Model not found");
  });
});

describe("general LLM", () => {
  it("builds the prompt from the template", () => {
    expect(buildPrompt("Into {{target}}. {{style}}", "ja", "plain")).toBe("Into Japanese. Use the plain da/dearu style.");
    expect(buildPrompt("Into {{target}}. {{style}}", "en", "plain")).toBe("Into English.");
  });

  it("uses the built-in prompt, a custom one, and the API key", async () => {
    const requests = mockFetch(() => reply("x"));
    const llm = { endpoint: "https://api.openai.com/v1", model: "gpt-x", apiKey: "sk-test" };
    await createLlmBackend(llm).translate({ text: "a", target: "en", form: "default" });
    preferences.llmPrompt = "Translate to {{target}}.";
    await createLlmBackend(llm).translate({ text: "a", target: "en", form: "default" });

    const system = requests.map((r) => (r.body.messages as { content: string }[])[0].content);
    expect(system[0]).toBe(buildPrompt(DEFAULT_PROMPT, "en", "default"));
    expect(system[1]).toBe("Translate to English.");
    expect(requests[0].headers.Authorization).toBe("Bearer sk-test");
    expect(requests[0].body.stop).toBeUndefined();
  });

  it("drops inline <think> blocks from reasoning models", async () => {
    mockFetch(() => reply("<think>The user wants English.</think>\nHello"));
    const llm = { endpoint: "http://localhost:11434/v1", model: "qwen3" };
    expect(await createLlmBackend(llm).translate({ text: "a", target: "en", form: "default" })).toBe("Hello");
  });
});

describe("DeepL", () => {
  it("requires an API key", async () => {
    await expect(createDeeplBackend().translate({ text: "a", target: "en", form: "default" })).rejects.toThrow(
      "DeepL の API キーが未設定です",
    );
  });

  it("uses the Free host for :fx keys and maps style to formality", async () => {
    preferences.deeplApiKey = "abc:fx";
    const requests = mockFetch(() => json({ translations: [{ text: "こんにちは" }] }));
    expect(await createDeeplBackend().translate({ text: "Hello", target: "ja", form: "polite" })).toBe("こんにちは");
    expect(requests[0].url).toBe("https://api-free.deepl.com/v2/translate");
    expect(requests[0].headers.Authorization).toBe("DeepL-Auth-Key abc:fx");
    expect(requests[0].body).toEqual({ text: ["Hello"], target_lang: "JA", formality: "prefer_more" });
  });

  it("uses the Pro host and omits formality for English", async () => {
    preferences.deeplApiKey = "abc";
    const requests = mockFetch(() => json({ translations: [{ text: "Hello" }] }));
    await createDeeplBackend().translate({ text: "こんにちは", target: "en", form: "polite" });
    expect(requests[0].url).toBe("https://api.deepl.com/v2/translate");
    expect(requests[0].body).toEqual({ text: ["こんにちは"], target_lang: "EN-US" });
  });

  it("explains a rejected key", async () => {
    preferences.deeplApiKey = "bad";
    mockFetch(() => json({}, 403));
    const error = await createDeeplBackend()
      .translate({ text: "a", target: "en", form: "default" })
      .catch((e) => e);
    expect(error.hint).toBe("API キーを確認してください");
  });
});
