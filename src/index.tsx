import { Action, ActionPanel, Form, getPreferenceValues, Icon, Keyboard, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { TranslationDetail } from "./components/translation-detail";
import { detectTargetLang } from "./lib/detect";
import { updateLiveTranslation, useLiveTranslation } from "./lib/live-translation";
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
  // Translation lives in a shared store so the pushed full view keeps streaming too.
  const { translation, isLoading } = useLiveTranslation();
  const setTranslation = (value: string) => updateLiveTranslation({ translation: value });
  const setIsLoading = (value: boolean) => updateLiveTranslation({ isLoading: value });
  // Raycast leaves no field focused after popping back from a pushed view, which makes
  // action shortcuts (⌘Y, ⌘K, …) dead until the user clicks a field. Refocus on pop.
  const translationRef = useRef<Form.TextArea>(null);

  // Prefill from the selection / clipboard unless another command handed us the text.
  useEffect(() => {
    if (launchContext?.text) return;
    readSourceText().then((initial) => setText((current) => current || initial));
  }, []);

  const resolved: Lang = target === "auto" ? detectTargetLang(text) : target;

  useEffect(() => updateLiveTranslation({ source: text, target: resolved }), [text, resolved]);

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
        const result = await translate(text, {
          target: resolved,
          form,
          signal: controller.signal,
          // Stream tokens into the field: first token arrives in <0.5s even when the full text takes seconds.
          onPartial: (partial) => !controller.signal.aborted && setTranslation(partial),
        });
        setTranslation(result);
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
          <Action.Push
            title="Show Translation in Full View"
            icon={Icon.Maximize}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            target={<TranslationDetail />}
            onPop={() => translationRef.current?.focus()}
          />
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
      <Form.TextArea
        id="translation"
        ref={translationRef}
        title="訳文"
        info="⌘Y で全画面表示"
        value={translation}
        onChange={setTranslation}
      />
      <Form.Dropdown id="target" title="翻訳先" value={target} onChange={(v) => setTarget(v as Target)}>
        <Form.Dropdown.Item
          value="auto"
          title={`自動（${LANG_LABEL[sourceLang]} → ${LANG_LABEL[resolved]}）`}
          icon={Icon.Wand}
        />
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
    </Form>
  );
}
