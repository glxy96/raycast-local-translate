import type { Lang } from "./translate";

const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]/gu;
const LATIN = /\p{Script=Latin}/gu;

/**
 * Decide the translation target for JA ⇄ EN auto mode.
 *
 * One Japanese character carries roughly as much content as several Latin letters,
 * so Japanese characters are weighted ×3. This keeps "RAGを使うと…" as Japanese while
 * treating "The word kawaii (かわいい) means cute" as English.
 */
export function detectTargetLang(text: string): Lang {
  const ja = text.match(JAPANESE)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  if (ja === 0) return "ja";
  return ja * 3 >= latin ? "en" : "ja";
}
