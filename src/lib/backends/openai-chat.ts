import { TranslationError } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  endpoint: string;
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  stop?: string[];
  signal?: AbortSignal;
  onPartial?: (partial: string) => void;
  /** Shown when the server cannot be reached. */
  connectionHint: string;
}

type ErrorBody = { error?: string | { message?: string } };

/** Reasoning models served without a separate reasoning field put their thoughts inline. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
}

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
      // Only `content` is the answer; `reasoning_content` (thinking models) is ignored.
      const delta = (JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta
        ?.content;
      if (delta) {
        content += delta;
        onPartial(stripThinking(content).trimStart());
      }
    }
  }
  return content;
}

/** POST to an OpenAI-compatible `/chat/completions` endpoint (LM Studio, Ollama, llama.cpp, OpenAI, …). */
export async function chatCompletion(params: ChatCompletionParams): Promise<string> {
  const { endpoint, apiKey, model, messages, stop, signal, onPartial, connectionHint } = params;
  const base = endpoint.replace(/\/+$/, "");
  const stream = onPartial !== undefined;

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      signal,
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: 4096, stop, stream }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new TranslationError(`${base} に接続できません`, connectionHint);
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
    const body = (await res.json().catch(() => undefined)) as { choices?: { message?: { content?: string } }[] };
    content = body?.choices?.[0]?.message?.content;
  }
  const result = stripThinking(content ?? "").trim();
  if (!result) throw new TranslationError("翻訳結果が空でした");
  return result;
}
