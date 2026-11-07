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
  /** When given, the response is streamed and this is called with the text generated so far. */
  onPartial?: (partial: string) => void;
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

type ErrorBody = { error?: string | { message?: string } };

/** Read an OpenAI-style SSE stream, reporting the accumulated text after each chunk. */
async function readStream(body: ReadableStream<Uint8Array>, onPartial: (partial: string) => void): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") return content;
      const delta = (JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta
        ?.content;
      if (delta) {
        content += delta;
        onPartial(content.trimStart());
      }
    }
  }
  return content;
}

export async function translate(text: string, { target, form, signal, onPartial }: TranslateOptions): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const endpoint = (prefs.endpoint || "http://localhost:1234/v1").replace(/\/+$/, "");
  const model = prefs.model || "plamo-3-translate-2b";
  const stream = onPartial !== undefined;

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
        stream,
      }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new TranslationError(
      "LM Studio に接続できません",
      `${endpoint} — \`lms server start\` でサーバーを起動してください`,
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as ErrorBody | undefined;
    const detail = typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new TranslationError(
      `翻訳に失敗しました (HTTP ${res.status})`,
      detail ?? `モデル "${model}" を確認してください`,
    );
  }

  let content: string | undefined;
  if (stream && res.body) {
    content = await readStream(res.body, onPartial);
  } else {
    const body = (await res.json().catch(() => undefined)) as
      { choices?: { message?: { content?: string } }[] } | undefined;
    content = body?.choices?.[0]?.message?.content;
  }
  if (typeof content !== "string" || !content.trim()) throw new TranslationError("翻訳結果が空でした");
  return content.trim();
}
