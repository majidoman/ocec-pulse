import type { ReactNode } from "react";
import type { ThemeId } from "@/lib/pulse/config";
import { themeStyle } from "@/lib/pulse/themes";
import { useSettings } from "@/lib/settings-store";

/** Wraps an employee-facing page in the survey's colour theme (Settings → Look & layout). */
export function ThemedPage({ theme, children }: { theme?: ThemeId; children: ReactNode }) {
  const saved = useSettings((s) => s.presentation.theme);
  const id = theme ?? saved;
  return (
    <div data-theme={id} style={themeStyle(id)} className="min-h-dvh bg-sand text-fg">
      {children}
    </div>
  );
}
