import { Action, ActionPanel, Detail } from "@raycast/api";
import { LANG_LABEL, type Lang } from "../lib/translate";

/** Render plain text verbatim in Markdown: escape syntax and keep single line breaks. */
function toMarkdown(text: string): string {
  return text
    .replace(/([\\`*_{}[\]()#+\-.!|<>~])/g, "\\$1")
    .split("\n")
    .join("  \n");
}

interface Props {
  source: string;
  translation: string;
  target: Lang;
}

/** Full-window, scrollable view of a translation — the Form's text area is too short for long text. */
export function TranslationDetail({ source, translation, target }: Props) {
  const sourceLang: Lang = target === "ja" ? "en" : "ja";
  const markdown = [toMarkdown(translation), "---", `**原文（${LANG_LABEL[sourceLang]}）**`, toMarkdown(source)].join(
    "\n\n",
  );

  return (
    <Detail
      navigationTitle={`${LANG_LABEL[sourceLang]} → ${LANG_LABEL[target]}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translation" content={translation} />
          <Action.Paste title="Paste Translation" content={translation} />
          <Action.CopyToClipboard title="Copy Source Text" content={source} />
        </ActionPanel>
      }
    />
  );
}
