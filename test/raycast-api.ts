/** Minimal stand-in for the parts of @raycast/api used by src/lib. */
export const preferences: Record<string, string | undefined> = {};

export function getPreferenceValues<T>(): T {
  return preferences as T;
}

const storage = new Map<string, string>();

export const LocalStorage = {
  getItem: async <T>(key: string) => storage.get(key) as T | undefined,
  setItem: async (key: string, value: string) => void storage.set(key, value),
  removeItem: async (key: string) => void storage.delete(key),
  clear: async () => storage.clear(),
};

export function resetRaycast() {
  for (const key of Object.keys(preferences)) delete preferences[key];
  storage.clear();
}
