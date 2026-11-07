import { useSyncExternalStore } from "react";
import type { Lang } from "./translate";

export interface LiveTranslation {
  source: string;
  translation: string;
  target: Lang;
  isLoading: boolean;
}

/**
 * State shared between the Translate form and its pushed full view.
 *
 * `Action.Push` renders its target once with the props at push time, so a pushed view
 * never sees later updates from the form's own state. Keeping the translation in a
 * module-level store lets both views subscribe and keep streaming.
 */
let state: LiveTranslation = { source: "", translation: "", target: "en", isLoading: false };
const listeners = new Set<() => void>();

export function updateLiveTranslation(patch: Partial<LiveTranslation>) {
  const next = { ...state, ...patch };
  if ((Object.keys(patch) as (keyof LiveTranslation)[]).every((key) => next[key] === state[key])) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLiveTranslation(): LiveTranslation {
  return useSyncExternalStore(subscribe, () => state);
}
