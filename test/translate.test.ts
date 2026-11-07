import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSelection } from "../src/lib/selection";
import { getBackend, translate } from "../src/lib/translate";
import { json, mockFetch } from "./fetch";
import { preferences, resetRaycast } from "./raycast-api";

beforeEach(resetRaycast);
afterEach(() => vi.unstubAllGlobals());

const endpoint = "http://localhost:1234/v1";

describe("getBackend", () => {
  it("routes a selected PLaMo model to the PLaMo protocol", async () => {
    await setSelection({ kind: "model", endpoint, model: "plamo-3-translate-0.8b" });
    const requests = mockFetch(() => json({ choices: [{ message: { content: "x" } }] }));
    await translate("a", { target: "en" });
    expect((requests[0].body.messages as { content: string }[])[0].content).toMatch(/^\[plamo-translate\]/);
  });

  it("routes any other model to the general LLM prompt", async () => {
    await setSelection({ kind: "model", endpoint, model: "gemma-4-26b" });
    const requests = mockFetch(() => json({ choices: [{ message: { content: "x" } }] }));
    await translate("a", { target: "en" });
    expect((requests[0].body.messages as { content: string }[])[0].content).toMatch(
      /^You are a professional translator/,
    );
  });

  it("selects DeepL", async () => {
    preferences.deeplApiKey = "abc:fx";
    await setSelection({ kind: "deepl" });
    expect((await getBackend()).name).toBe("DeepL");
  });

  it("auto-detects PLaMo when nothing is selected", async () => {
    mockFetch((req) =>
      req.url === "http://localhost:1234/api/v0/models"
        ? json({
            data: [
              { id: "gemma-4-26b", type: "llm", state: "loaded" },
              { id: "plamo-3-translate-2b", type: "llm" },
            ],
          })
        : Promise.reject(new TypeError("fetch failed")),
    );
    expect((await getBackend()).name).toBe("plamo-3-translate-2b");
  });
});
