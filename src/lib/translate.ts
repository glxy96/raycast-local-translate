import { getPreferenceValues } from "@raycast/api";
import { createDeeplBackend } from "./backends/deepl";
import { createLlmBackend } from "./backends/llm";
import { createPlamoBackend } from "./backends/plamo";
import type { Backend, JapaneseForm, Lang } from "./backends/types";

export { LANG_LABEL, TranslationError, type JapaneseForm, type Lang } from "./backends/types";

/** The backend chosen in the extension preferences. */
export function getBackend(): Backend {
  switch (getPreferenceValues<Preferences>().backend) {
    case "llm":
      return createLlmBackend();
    case "deepl":
      return createDeeplBackend();
    default:
      return createPlamoBackend();
  }
}

export interface TranslateOptions {
  target: Lang;
  form?: JapaneseForm;
  signal?: AbortSignal;
  /** When given and the backend supports it, the result is streamed and this is called with the text so far. */
  onPartial?: (partial: string) => void;
}

export function translate(text: string, { target, form, signal, onPartial }: TranslateOptions): Promise<string> {
  return getBackend().translate({ text, target, form: form ?? "default", signal, onPartial });
}
