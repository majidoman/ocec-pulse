/**
 * Connected APIs (Settings → Integrations). Each API has a name, a base address and an optional key.
 * Keys are encrypted at rest (same scheme as the mailbox password) and are never sent back to the
 * browser: the screen only learns whether a key is set and its last four characters.
 *
 * Presets are the APIs the app already knows how to use. A preset that has no saved key falls back to
 * its server environment variable, so existing installs keep working until someone saves a key here.
 * Custom APIs are stored the same way; code reads them with getApiKey(id).
 */
import { decryptSecret, encryptSecret, newId, readSetting, writeSetting } from "./core.server";
import type { ApiView } from "./api-types";

export interface StoredApi {
  id: string;
  name: string;
  baseUrl: string;
  note: string;
  enabled: boolean;
  keyEnc: string | null;
  keyHint: string | null;
  updatedAt: string;
}

export const PRESET_APIS = [
  {
    id: "xai",
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    note: "Writes the AI briefing on the Reports → Executive page.",
    envVar: "XAI_API_KEY",
  },
] as const;

export async function readApis(): Promise<StoredApi[]> {
  return (await readSetting<StoredApi[]>("apis")) ?? [];
}

export async function writeApis(list: StoredApi[]): Promise<void> {
  await writeSetting("apis", list);
}

/** The key the server uses for an API, or null. Never call this from a function that returns to the browser. */
export async function getApiKey(id: string): Promise<string | null> {
  const stored = (await readApis()).find((a) => a.id === id);
  if (stored && !stored.enabled) return null;
  if (stored?.keyEnc) {
    const key = decryptSecret(stored.keyEnc);
    if (key) return key;
  }
  const preset = PRESET_APIS.find((p) => p.id === id);
  return preset ? process.env[preset.envVar]?.trim() || null : null;
}

/** What the Settings screen may show: presets first, then custom APIs. No key values. */
export async function viewApis(): Promise<ApiView[]> {
  const stored = await readApis();
  const presets: ApiView[] = PRESET_APIS.map((p) => {
    const s = stored.find((a) => a.id === p.id);
    return {
      id: p.id,
      name: s?.name ?? p.name,
      baseUrl: s?.baseUrl ?? p.baseUrl,
      note: s?.note ?? p.note,
      enabled: s?.enabled ?? true,
      hasKey: Boolean(s?.keyEnc),
      keyHint: s?.keyHint ?? null,
      envFallback: Boolean(process.env[p.envVar]?.trim()),
      preset: true,
      updatedAt: s?.updatedAt ?? null,
    };
  });
  const custom: ApiView[] = stored
    .filter((a) => !PRESET_APIS.some((p) => p.id === a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      baseUrl: a.baseUrl,
      note: a.note,
      enabled: a.enabled,
      hasKey: Boolean(a.keyEnc),
      keyHint: a.keyHint,
      envFallback: false,
      preset: false,
      updatedAt: a.updatedAt,
    }));
  return [...presets, ...custom];
}

export interface ApiInput {
  id?: string;
  name: string;
  baseUrl: string;
  note: string;
  enabled: boolean;
  /** New key. Empty or missing keeps the saved key. */
  key?: string;
  /** True removes the saved key. */
  clearKey?: boolean;
}

/** Saves one API. Returns the name used in the change history and whether the key changed. */
export async function saveApiEntry(input: ApiInput): Promise<{ name: string; keyChanged: boolean }> {
  const list = await readApis();
  const preset = PRESET_APIS.find((p) => p.id === input.id);
  const id = input.id ?? newId().replace(/-/g, "");
  const existing = list.find((a) => a.id === id);
  const newKey = input.key?.trim() ?? "";
  let keyEnc = existing?.keyEnc ?? null;
  let keyHint = existing?.keyHint ?? null;
  let keyChanged = false;
  if (newKey) {
    keyEnc = encryptSecret(newKey);
    keyHint = newKey.slice(-4);
    keyChanged = true;
  } else if (input.clearKey) {
    keyEnc = null;
    keyHint = null;
    keyChanged = Boolean(existing?.keyEnc);
  }
  const entry: StoredApi = {
    id,
    name: input.name.trim() || preset?.name || "API",
    baseUrl: input.baseUrl.trim(),
    note: input.note.trim(),
    enabled: input.enabled,
    keyEnc,
    keyHint,
    updatedAt: new Date().toISOString(),
  };
  await writeApis(existing ? list.map((a) => (a.id === id ? entry : a)) : [...list, entry]);
  return { name: entry.name, keyChanged };
}

/** Removes a saved API. A preset falls back to its environment variable afterwards. */
export async function deleteApiEntry(id: string): Promise<{ name: string } | null> {
  const list = await readApis();
  const hit = list.find((a) => a.id === id);
  if (!hit) return null;
  await writeApis(list.filter((a) => a.id !== id));
  return { name: hit.name };
}

export function isKnownApi(id: string): boolean {
  return PRESET_APIS.some((p) => p.id === id);
}
