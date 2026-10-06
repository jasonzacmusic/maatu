import { NATIVE_SCRIPT, romanizeDisplay } from "./romanize-client";

export function hasNativeScript(text: string) {
  return NATIVE_SCRIPT.test(text);
}

export async function romanizeText(text: string, _sourceLanguageCode: string) {
  return romanizeDisplay(text.trim());
}
