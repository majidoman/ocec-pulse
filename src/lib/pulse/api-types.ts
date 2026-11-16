/** Client-safe shape of a connected API as the Settings screen sees it. Never contains a key. */
export interface ApiView {
  id: string;
  name: string;
  baseUrl: string;
  note: string;
  enabled: boolean;
  hasKey: boolean;
  keyHint: string | null;
  /** The server environment variable holds a key that is used when no key is saved here. */
  envFallback: boolean;
  /** A built-in API the app already uses (not a custom one). */
  preset: boolean;
  updatedAt: string | null;
}
