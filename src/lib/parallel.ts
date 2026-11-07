import { toMarkdown } from "./markdown";

export type ParallelUnit = "line" | "paragraph";

export interface ParallelResult {
  /** How rows were aligned, or undefined when the source and translation could not be aligned. */
  unit?: ParallelUnit;
  markdown: string;
}

const nonEmptyLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** A table cell cannot contain line breaks; lines inside one paragraph are joined with a space. */
const cell = (text: string) => toMarkdown(text.replace(/\s*\n\s*/g, " "));

function table(headers: [string, string], rows: [string, string][]): string {
  return [
    `| ${headers[0]} | ${headers[1]} |`,
    "| --- | --- |",
    ...rows.map(([a, b]) => `| ${cell(a)} | ${cell(b)} |`),
  ].join("\n");
}

/**
 * Lay out source and translation side by side as a Markdown table.
 *
 * Rows are aligned by line when both sides have the same number of non-empty lines (lists
 * line up item by item), else by paragraph. While streaming, the translation is shorter than
 * the source, so rows are filled by line as they arrive. When neither unit lines up, the
 * result has no `unit` and the caller should fall back to the stacked layout.
 */
export function buildParallel(
  source: string,
  translation: string,
  headers: [string, string],
  isStreaming: boolean,
): ParallelResult {
  const sourceLines = nonEmptyLines(source);
  const translatedLines = nonEmptyLines(translation);
  if (isStreaming || sourceLines.length === translatedLines.length) {
    const rows = sourceLines.map((line, i): [string, string] => [line, translatedLines[i] ?? ""]);
    return { unit: "line", markdown: table(headers, rows) };
  }

  const sourceParagraphs = paragraphs(source);
  const translatedParagraphs = paragraphs(translation);
  if (sourceParagraphs.length === translatedParagraphs.length) {
    const rows = sourceParagraphs.map((p, i): [string, string] => [p, translatedParagraphs[i]]);
    return { unit: "paragraph", markdown: table(headers, rows) };
  }

  return { markdown: "" };
}
