import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getSelection, setSelection, type Selection } from "./lib/selection";
import { getServers, isPlamoModel, listModels, pickPlamoModel, type ModelInfo, type Server } from "./lib/servers";

function sameSelection(a: Selection | undefined, b: Selection | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export default function Command() {
  const { deeplApiKey } = getPreferenceValues<Preferences>();
  const [current, setCurrent] = useState<Selection | undefined>();
  useEffect(() => {
    getSelection().then(setCurrent);
  }, []);

  const servers = getServers();
  const { data: models, isLoading } = usePromise(async () => {
    const lists = await Promise.all(servers.map(listModels));
    return new Map(servers.map((server, i) => [server.endpoint, lists[i]]));
  });
  // Derived from the same listing, so opening this view probes each server only once.
  const autoPick = models ? pickPlamoModel([...models.values()].flat()) : undefined;
  // Same "server / model" wording as the rest of the list; the checkmark alone tells what is in use.
  const autoTitle = autoPick
    ? `自動（${autoPick.server.name} / ${autoPick.id}）`
    : models
      ? "自動（PLaMo 3 Translate が見つかりません）"
      : "自動";

  async function choose(selection: Selection | undefined, label: string) {
    await setSelection(selection);
    setCurrent(selection);
    await showToast({ style: Toast.Style.Success, title: "翻訳モデルを変更しました", message: label });
  }

  const checkmark = (selection: Selection | undefined) =>
    sameSelection(current, selection) ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green } } : {};

  function modelItem(model: ModelInfo) {
    const selection: Selection = { kind: "model", endpoint: model.server.endpoint, model: model.id };
    const plamo = isPlamoModel(model.id);
    return (
      <List.Item
        key={`${model.server.endpoint} ${model.id}`}
        title={model.id}
        icon={plamo ? Icon.Stars : Icon.SpeechBubble}
        accessories={[
          ...(model.loaded ? [{ tag: { value: "Loaded", color: Color.Green } }] : []),
          { tag: plamo ? { value: "PLaMo", color: Color.Purple } : { value: "LLM", color: Color.SecondaryText } },
          ...(sameSelection(current, selection) ? [checkmark(selection)] : []),
        ]}
        actions={
          <ActionPanel>
            <Action title="Use This Model" icon={Icon.Check} onAction={() => choose(selection, model.id)} />
            <Action.CopyToClipboard title="Copy Model Identifier" content={model.id} />
          </ActionPanel>
        }
      />
    );
  }

  function serverSection(server: Server) {
    const list = models?.get(server.endpoint);
    if (!list?.length) return null;
    // PLaMo first: it is the translation-specialized option.
    const sorted = [...list].sort((a, b) => Number(isPlamoModel(b.id)) - Number(isPlamoModel(a.id)));
    return (
      <List.Section key={server.endpoint} title={server.name} subtitle={server.endpoint}>
        {sorted.map(modelItem)}
      </List.Section>
    );
  }

  const unreachable = servers.filter((s) => models && !models.get(s.endpoint)?.length).map((s) => s.name);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="モデルを検索">
      <List.Section title="自動">
        <List.Item
          title={autoTitle}
          icon={Icon.Wand}
          accessories={current ? [] : [checkmark(undefined)]}
          actions={
            <ActionPanel>
              <Action title="Use Auto-Detect" icon={Icon.Check} onAction={() => choose(undefined, "自動検出")} />
            </ActionPanel>
          }
        />
      </List.Section>
      {servers.map(serverSection)}
      <List.Section title="クラウド">
        <List.Item
          title="DeepL"
          icon={Icon.Globe}
          subtitle={deeplApiKey ? undefined : "API キー未設定"}
          accessories={sameSelection(current, { kind: "deepl" }) ? [checkmark({ kind: "deepl" })] : []}
          actions={
            <ActionPanel>
              {deeplApiKey ? (
                <Action title="Use DeepL" icon={Icon.Check} onAction={() => choose({ kind: "deepl" }, "DeepL")} />
              ) : (
                <Action title="Set DeepL API Key" icon={Icon.Key} onAction={openExtensionPreferences} />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          title="サーバーを追加"
          subtitle="OpenAI 互換の別サーバーやクラウド API を設定で追加"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
      {unreachable.length > 0 && (
        <List.Section title="応答なし">
          <List.Item title={unreachable.join(" / ")} subtitle="起動していないか、モデルがありません" icon={Icon.Info} />
        </List.Section>
      )}
    </List>
  );
}
