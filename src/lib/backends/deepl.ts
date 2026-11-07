import { getPreferenceValues } from "@raycast/api";
import { TranslationError, type Backend, type JapaneseForm, type Lang } from "./types";

const TARGET_LANG: Record<Lang, string> = { ja: "JA", en: "EN-US" };
const FORMALITY: Record<JapaneseForm, string | undefined> = {
  default: undefined,
  polite: "prefer_more",
  plain: "prefer_less",
};

/** DeepL API. Free-plan keys end with ":fx" and use a separate host. */
export function createDeeplBackend(): Backend {
  const { deeplApiKey } = getPreferenceValues<Preferences>();
  return {
    name: "DeepL",
    async translate({ text, target, form, signal }) {
      if (!deeplApiKey) {
        throw new TranslationError(
          "DeepL の API キーが未設定です",
          "拡張機能の設定で DeepL: API Key を入力してください",
        );
      }
      const host = deeplApiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
      const formality = target === "ja" ? FORMALITY[form] : undefined;

      let res: Response;
      try {
        res = await fetch(`https://${host}/v2/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${deeplApiKey}` },
          signal,
          body: JSON.stringify({ text: [text], target_lang: TARGET_LANG[target], ...(formality && { formality }) }),
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new TranslationError("DeepL に接続できません", "ネットワーク接続を確認してください");
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => undefined)) as { message?: string } | undefined;
        const hint =
          res.status === 403
            ? "API キーを確認してください"
            : res.status === 456
              ? "今月の文字数上限に達しました"
              : undefined;
        throw new TranslationError(`DeepL がエラーを返しました (HTTP ${res.status})`, body?.message ?? hint);
      }

      const body = (await res.json()) as { translations?: { text: string }[] };
      const result = body.translations?.[0]?.text?.trim();
      if (!result) throw new TranslationError("翻訳結果が空でした");
      return result;
    },
  };
}
