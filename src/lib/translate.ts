import { getPreferenceValues } from "@raycast/api";

export type Lang = "ja" | "en";
export type JapaneseForm = "default" | "polite" | "plain";

export const LANG_LABEL: Record<Lang, string> = { ja: "日本語", en: "英語" };

// PLaMo 3 Translate stops by emitting one of these PFML3 control tokens.
const STOP_TOKENS = ["<|plamo:tag|>", "<|plamo:bos|>"];

export class TranslationError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

export interface TranslateOptions {
  target: Lang;
  form?: JapaneseForm;
  signal?: AbortSignal;
}

/**
 * LM Studio cannot forward `chat_template_kwargs`, so the translation settings are passed
 * through a leading system message, which the GGUF chat template of PLaMo 3 Translate parses.
 * See "Specifying settings in a system message" in the model card.
 */
function buildSystemMessage(target: Lang, form: JapaneseForm): string {
  const lines = ["[plamo-translate]", `target_lang=${target}`];
  // `form` is only valid when translating into Japanese.
  if (target === "ja" && form !== "default") lines.push(`form=${form}`);
  return lines.join("\n");
}

export async function translate(text: string, { target, form, signal }: TranslateOptions): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const endpoint = (prefs.endpoint || "http://localhost:1234/v1").replace(/\/+$/, "");
  const model = prefs.model || "plamo-3-translate-2b";

  let res: Response;
  try {
    res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemMessage(target, form ?? "default") },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 4096,
        stop: STOP_TOKENS,
        stream: false,
      }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new TranslationError(
      "LM Studio に接続できません",
      `${endpoint} — \`lms server start\` でサーバーを起動してください`,
    );
  }

  const body = (await res.json().catch(() => undefined)) as
    { choices?: { message?: { content?: string } }[]; error?: string | { message?: string } } | undefined;

  if (!res.ok) {
    const detail = typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new TranslationError(
      `翻訳に失敗しました (HTTP ${res.status})`,
      detail ?? `モデル "${model}" を確認してください`,
    );
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new TranslationError("翻訳結果が空でした");
  return content.trim();
}
