import { describe, expect, it } from "vitest";
import { detectTargetLang } from "../src/lib/detect";

describe("detectTargetLang", () => {
  it.each([
    ["会議は来週の月曜日に変更されました。", "en"],
    ["RAGを使うとハルシネーションが減る", "en"],
    ["Kubernetes の Deployment を更新してください", "en"],
    ["東京", "en"],
    ["The meeting has been rescheduled.", "ja"],
    ["The word kawaii (かわいい) means cute", "ja"],
    ["git commit -m 'fix: 修正'", "ja"],
    ["OK", "ja"],
    ["", "ja"],
  ])("%j → %s", (text, expected) => {
    expect(detectTargetLang(text)).toBe(expected);
  });
});
