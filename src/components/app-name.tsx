import { useBrand, useT } from "@/lib/store";

/** The product name from Settings → Branding (e.g. "OCEC Pulse"), in the current language. */
export function AppName() {
  const { lang } = useT();
  const names = useBrand();
  return <>{names.app[lang]}</>;
}
