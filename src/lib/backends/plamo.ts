import { chatCompletion } from "./openai-chat";
import type { Backend, JapaneseForm, Lang } from "./types";

// PLaMo 3 Translate stops by emitting one of these PFML3 control tokens.
const STOP_TOKENS = ["<|plamo:tag|>", "<|plamo:bos|>"];

/**
 * PLaMo 3 Translate takes its settings through `chat_template_kwargs`, which LM Studio and
 * Ollama cannot forward. Its GGUF chat template also accepts them from a leading system
 * message starting with `[plamo-translate]` (model card: "Specifying settings in a system message").
 * This protocol is specific to PLaMo 3 Translate; other models would read it as plain text.
 */
function buildSystemMessage(target: Lang, form: JapaneseForm): string {
  const lines = ["[plamo-translate]", `target_lang=${target}`];
  // `form` is only valid when translating into Japanese.
  if (target === "ja" && form !== "default") lines.push(`form=${form}`);
  return lines.join("\n");
}

export interface ModelTarget {
  endpoint: string;
  model: string;
  apiKey?: string;
}

export function createPlamoBackend({ endpoint, model, apiKey }: ModelTarget): Backend {
  return {
    name: model,
    translate: ({ text, target, form, signal, onPartial }) =>
      chatCompletion({
        endpoint,
        apiKey,
        model,
        messages: [
          { role: "system", content: buildSystemMessage(target, form) },
          { role: "user", content: text },
        ],
        stop: STOP_TOKENS,
        signal,
        onPartial,
        connectionHint: "LM Studio なら `lms server start` でサーバーを起動してください",
      }),
  };
}
