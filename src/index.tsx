import { Action, ActionPanel, Form, getPreferenceValues, Icon, Keyboard, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { detectTargetLang } from "./lib/detect";
import type { TranslateLaunchContext } from "./lib/quick-translate";
import { readSourceText } from "./lib/source";
import { LANG_LABEL, translate, TranslationError, type JapaneseForm, type Lang } from "./lib/translate";

type Target = Lang | "auto";

const DEBOUNCE_MS = 300;

export default function Command({ launchContext }: LaunchProps<{ launchContext?: TranslateLaunchContext }>) {
  const prefs = getPreferenceValues<Preferences>();
  const [text, setText] = useState(launchContext?.text ?? "");
  const [target, setTarget] = useState<Target>(launchContext?.target ?? "auto");
  const [form, setForm] = useState<JapaneseForm>(prefs.japaneseForm as JapaneseForm);
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Prefill from the selection / clipboard unless another command handed us the text.
  useEffect(() => {
    if (launchContext?.text) return;
    readSourceText().then((initial) => setText((current) => current || initial));
  }, []);

  const resolved: Lang = target === "auto" ? detectTargetLang(text) : target;

  // Live translation: debounce keystrokes and cancel stale requests.
  useEffect(() => {
    if (!text.trim()) {
      setTranslation("");
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        setTranslation(await translate(text, { target: resolved, form, signal: controller.signal }));
      } catch (error) {
        if (controller.signal.aborted) return;
        await showFailureToast(error, {
          title: error instanceof TranslationError ? error.message : "翻訳に失敗しました",
          message: error instanceof TranslationError ? error.hint : undefined,
        });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, resolved, form]);

  function swap() {
    if (!translation) return;
    setText(translation);
    setTranslation(text);
    setTarget(resolved === "ja" ? "en" : "ja");
  }

  const sourceLang: Lang = resolved === "ja" ? "en" : "ja";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translation" content={translation} />
          <Action.Paste title="Paste Translation" content={translation} />
          <Action
            title="Swap Source and Translation"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={swap}
          />
          <Action.CopyToClipboard title="Copy Source Text" content={text} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="原文" placeholder="翻訳するテキスト" value={text} onChange={setText} />
      <Form.Dropdown id="target" title="翻訳先" value={target} onChange={(v) => setTarget(v as Target)}>
        <Form.Dropdown.Item value="auto" title="自動 (日 ⇄ 英)" icon={Icon.Wand} />
        <Form.Dropdown.Item value="ja" title="日本語へ" />
        <Form.Dropdown.Item value="en" title="英語へ" />
      </Form.Dropdown>
      {resolved === "ja" && (
        <Form.Dropdown id="form" title="文体" value={form} onChange={(v) => setForm(v as JapaneseForm)}>
          <Form.Dropdown.Item value="default" title="モデルに任せる" />
          <Form.Dropdown.Item value="polite" title="です・ます" />
          <Form.Dropdown.Item value="plain" title="だ・である" />
        </Form.Dropdown>
      )}
      <Form.Description title="方向" text={`${LANG_LABEL[sourceLang]} → ${LANG_LABEL[resolved]}`} />
      <Form.TextArea id="translation" title="訳文" value={translation} onChange={setTranslation} />
    </Form>
  );
}
