import { Clipboard, getPreferenceValues, launchCommand, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { detectTargetLang } from "./detect";
import { readSourceText } from "./source";
import { LANG_LABEL, translate, TranslationError, type JapaneseForm, type Lang } from "./translate";

export interface TranslateLaunchContext {
  text?: string;
  target?: Lang | "auto";
}

/** Shared implementation of the no-view commands. */
export async function quickTranslate(target: Lang | "auto", argumentText?: string) {
  const prefs = getPreferenceValues<Preferences>();
  const text = argumentText?.trim() || (await readSourceText());
  if (!text) {
    await showHUD("翻訳するテキストがありません");
    return;
  }

  const resolved = target === "auto" ? detectTargetLang(text) : target;

  if (prefs.onTranslateAction === "view") {
    const context: TranslateLaunchContext = { text, target };
    await launchCommand({ name: "index", type: LaunchType.UserInitiated, context });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: `${LANG_LABEL[resolved]}に翻訳中…` });
  let translation: string;
  try {
    translation = await translate(text, { target: resolved, form: prefs.japaneseForm as JapaneseForm });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = error instanceof TranslationError ? error.message : "翻訳に失敗しました";
    toast.message = error instanceof TranslationError ? error.hint : String(error);
    return;
  }

  if (prefs.onTranslateAction === "paste") {
    await Clipboard.paste(translation);
    await showHUD(`→ ${LANG_LABEL[resolved]}: ペーストしました`);
  } else {
    await Clipboard.copy(translation);
    await showHUD(`→ ${LANG_LABEL[resolved]}: コピーしました`);
  }
}
