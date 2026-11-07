import type { LaunchProps } from "@raycast/api";
import { quickTranslate } from "./lib/quick-translate";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TranslateToJapanese }>) {
  await quickTranslate("ja", props.arguments.text);
}
