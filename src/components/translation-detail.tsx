import { Action, ActionPanel, Detail } from "@raycast/api";
import { useLiveTranslation } from "../lib/live-translation";
import { toMarkdown } from "../lib/markdown";
import { LANG_LABEL, type Lang } from "../lib/translate";

/** Full-window, scrollable view of a translation — the Form's text area is too short for long text. */
export function TranslationDetail() {
  const { source, translation, target, isLoading } = useLiveTranslation();
  const sourceLang: Lang = target === "ja" ? "en" : "ja";
  const markdown = [toMarkdown(translation), "---", `**原文（${LANG_LABEL[sourceLang]}）**`, toMarkdown(source)].join(
    "\n\n",
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${LANG_LABEL[sourceLang]} → ${LANG_LABEL[target]}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="訳文をコピー" content={translation} />
          <Action.Paste title="訳文をペースト" content={translation} />
          <Action.CopyToClipboard title="原文をコピー" content={source} />
        </ActionPanel>
      }
    />
  );
}
