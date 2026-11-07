import { Clipboard, getPreferenceValues, getSelectedText } from "@raycast/api";

async function readSelected(): Promise<string> {
  try {
    return (await getSelectedText()).trim();
  } catch {
    // Throws when nothing is selected or the frontmost app does not expose a selection.
    return "";
  }
}

async function readClipboard(): Promise<string> {
  return ((await Clipboard.readText()) ?? "").trim();
}

/** Read the source text from the preferred source, falling back to the other one. */
export async function readSourceText(): Promise<string> {
  const { source } = getPreferenceValues<Preferences>();
  const [first, second] = source === "clipboard" ? [readClipboard, readSelected] : [readSelected, readClipboard];
  return (await first()) || (await second());
}
