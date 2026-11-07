import { createDeeplBackend } from "./backends/deepl";
import { createLlmBackend } from "./backends/llm";
import { createPlamoBackend, type ModelTarget } from "./backends/plamo";
import { TranslationError, type Backend, type JapaneseForm, type Lang } from "./backends/types";
import { getSelection } from "./selection";
import { apiKeyFor, findPlamoModel, isPlamoModel } from "./servers";

export { LANG_LABEL, TranslationError, type JapaneseForm, type Lang } from "./backends/types";

/** The prompt format follows the model: PLaMo 3 Translate gets its own protocol, anything else a plain instruction. */
export function backendForModel(target: ModelTarget): Backend {
  return isPlamoModel(target.model) ? createPlamoBackend(target) : createLlmBackend(target);
}

// Auto-detection probes local servers, so reuse its result while the command is open.
let autoDetected: Promise<Backend> | undefined;

async function detectPlamoBackend(): Promise<Backend> {
  const plamo = await findPlamoModel();
  if (!plamo) {
    throw new TranslationError(
      "PLaMo 3 Translate が見つかりません",
      "LM Studio を起動してモデルを入れるか、Choose Model で別のモデルを選んでください",
    );
  }
  return createPlamoBackend({ endpoint: plamo.server.endpoint, model: plamo.id, apiKey: plamo.server.apiKey });
}

/** The backend for the model picked in "Choose Model", or an auto-detected PLaMo 3 Translate. */
export async function getBackend(): Promise<Backend> {
  const selection = await getSelection();
  if (selection?.kind === "deepl") return createDeeplBackend();
  if (selection?.kind === "model") return backendForModel({ ...selection, apiKey: apiKeyFor(selection.endpoint) });

  if (!autoDetected) {
    const detecting = detectPlamoBackend();
    autoDetected = detecting;
    detecting.catch(() => {
      if (autoDetected === detecting) autoDetected = undefined;
    });
  }
  return autoDetected;
}

export interface TranslateOptions {
  target: Lang;
  form?: JapaneseForm;
  signal?: AbortSignal;
  /** When given and the backend supports it, the result is streamed and this is called with the text so far. */
  onPartial?: (partial: string) => void;
}

export async function translate(text: string, { target, form, signal, onPartial }: TranslateOptions): Promise<string> {
  const backend = await getBackend();
  try {
    return await backend.translate({ text, target, form: form ?? "default", signal, onPartial });
  } catch (error) {
    // The server may have restarted or the model been removed: re-detect next time.
    if (!signal?.aborted) autoDetected = undefined;
    throw error;
  }
}
