import { LocalStorage } from "@raycast/api";

/** What the user picked in "Choose Model". Absent = auto-detect PLaMo 3 Translate. */
export type Selection = { kind: "model"; endpoint: string; model: string } | { kind: "deepl" };

const KEY = "selection";

export async function getSelection(): Promise<Selection | undefined> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Selection;
  } catch {
    return undefined;
  }
}

export async function setSelection(selection: Selection | undefined) {
  if (selection) await LocalStorage.setItem(KEY, JSON.stringify(selection));
  else await LocalStorage.removeItem(KEY);
}
