import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { useLiveTranslation } from "../lib/live-translation";
import { toMarkdown } from "../lib/markdown";
import { buildParallel } from "../lib/parallel";
import { LANG_LABEL, type Lang } from "../lib/translate";

export type Layout = "stacked" | "parallel";

/** Full-window, scrollable view of a translation — the Form's text area is too short for long text. */
export function TranslationDetail({ initialLayout = "stacked" }: { initialLayout?: Layout }) {
  const { source, translation, target, isLoading } = useLiveTranslation();
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const sourceLang: Lang = target === "ja" ? "en" : "ja";
  const sourceLabel = `原文（${LANG_LABEL[sourceLang]}）`;

  const stacked = [toMarkdown(translation), "---", `**${sourceLabel}**`, toMarkdown(source)].join("\n\n");
  let markdown = stacked;
  if (layout === "parallel") {
    const parallel = buildParallel(source, translation, [sourceLabel, `訳文（${LANG_LABEL[target]}）`], isLoading);
    markdown = parallel.unit
      ? parallel.markdown
      : `> 原文と訳文の行数・段落数が一致しないため、対訳で並べられませんでした。\n\n${stacked}`;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${LANG_LABEL[sourceLang]} → ${LANG_LABEL[target]}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="訳文をコピー" content={translation} />
          <Action.Paste title="訳文をペースト" content={translation} />
          <Action
            title={layout === "parallel" ? "縦並びで表示" : "対訳で表示"}
            icon={layout === "parallel" ? Icon.AppWindow : Icon.AppWindowSidebarLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
            onAction={() => setLayout(layout === "parallel" ? "stacked" : "parallel")}
          />
          <Action.CopyToClipboard title="原文をコピー" content={source} />
        </ActionPanel>
      }
    />
  );
}
