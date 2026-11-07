import { describe, expect, it } from "vitest";
import { toMarkdown } from "../src/lib/markdown";

describe("toMarkdown", () => {
  it("leaves brackets alone so Raycast does not render \\( \\) as LaTeX", () => {
    expect(toMarkdown("key (e.g., Quick Look) [x](y) {z}")).toBe("key (e.g., Quick Look) [x](y) {z}");
  });

  it("escapes a literal backslash so \\( stays literal", () => {
    expect(toMarkdown(String.raw`\(x\)`)).toBe(String.raw`\\(x\\)`);
  });

  it("escapes emphasis, code, math, HTML and table syntax", () => {
    expect(toMarkdown("a*b*c snake_case `code` ~x~ $5 <tag> a|b")).toBe(
      String.raw`a\*b\*c snake\_case \`code\` \~x\~ \$5 \<tag> a\|b`,
    );
  });

  it("escapes headings only at line start", () => {
    expect(toMarkdown("# title\nissue #12")).toBe("\\# title  \nissue #12");
  });

  it("keeps lists and single line breaks", () => {
    expect(toMarkdown("- a\n1. b\nc")).toBe("- a  \n1. b  \nc");
  });
});
