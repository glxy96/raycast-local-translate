import { describe, expect, it } from "vitest";
import { buildParallel } from "../src/lib/parallel";

const headers: [string, string] = ["原文", "訳文"];

describe("buildParallel", () => {
  it("aligns by line when line counts match, ignoring blank lines", () => {
    const result = buildParallel("Intro.\n\n- a\n- b", "導入。\n\n- あ\n- い", headers, false);
    expect(result.unit).toBe("line");
    expect(result.markdown).toBe(["| 原文 | 訳文 |", "| --- | --- |", "| Intro. | 導入。 |", "| - a | - あ |", "| - b | - い |"].join("\n"));
  });

  it("falls back to paragraphs when lines re-flow", () => {
    const result = buildParallel("A long\nwrapped sentence.\n\nSecond.", "折り返された長い文。\n\n二つ目。", headers, false);
    expect(result.unit).toBe("paragraph");
    expect(result.markdown).toContain("| A long wrapped sentence. | 折り返された長い文。 |");
    expect(result.markdown).toContain("| Second. | 二つ目。 |");
  });

  it("gives up when neither lines nor paragraphs align", () => {
    expect(buildParallel("A.\nB.\n\nC.", "AとBとC。", headers, false).unit).toBeUndefined();
  });

  it("fills rows by line while streaming", () => {
    const result = buildParallel("One.\nTwo.\nThree.", "一。\n二", headers, true);
    expect(result.markdown.split("\n").slice(2)).toEqual(["| One. | 一。 |", "| Two. | 二 |", "| Three. |  |"]);
  });

  it("escapes pipes and markdown inside cells", () => {
    const result = buildParallel("a | b *c*", "a | b *c*", headers, false);
    expect(result.markdown).toContain(String.raw`| a \| b \*c\* | a \| b \*c\* |`);
  });
});
