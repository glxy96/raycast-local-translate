/**
 * Render plain text in Markdown while keeping it readable.
 *
 * Escape only what would visibly mangle prose (emphasis, code spans, HTML, tables, headings).
 * Do NOT escape brackets: Raycast renders `\(…\)` / `\[…\]` as LaTeX math.
 * Lists ("- ", "1. ") are intentionally left to render as lists.
 */
export function toMarkdown(text: string): string {
  return text
    .replace(/([\\`*_~$<|])/g, "\\$1")
    .replace(/^(\s*)#/gm, "$1\\#")
    .split("\n")
    .join("  \n");
}
