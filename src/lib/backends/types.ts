export type Lang = "ja" | "en";
export type JapaneseForm = "default" | "polite" | "plain";

export const LANG_LABEL: Record<Lang, string> = { ja: "日本語", en: "英語" };

export class TranslationError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

export interface TranslateRequest {
  text: string;
  target: Lang;
  form: JapaneseForm;
  signal?: AbortSignal;
  /** Called with the text generated so far. Backends that cannot stream simply never call it. */
  onPartial?: (partial: string) => void;
}

/** A translation service. Each backend owns how the request is built and sent. */
export interface Backend {
  /** Short name shown in the UI, e.g. "PLaMo 3 Translate". */
  name: string;
  translate(request: TranslateRequest): Promise<string>;
}
