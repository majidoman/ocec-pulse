import { useEffect, useMemo, type ReactNode, type CSSProperties } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { EnvBanner } from "@/components/env-banner";
import { Rehydrate } from "@/components/rehydrate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp, useBrand } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { paletteTokens } from "@/lib/pulse/palette";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

/** Neutral until settings load; LangShell then sets the client's product name. */
const APP_NAME = "Pulse";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Follow the phone's / computer's text-size setting (layout is rem-based; no root font-size override).
      { name: "text-scale", content: "scale" },
      { title: APP_NAME },
      { name: "theme-color", content: "#142A32" },
      {
        name: "description",
        content: "Confidential staff engagement survey.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Paint with the last known brand colours before settings load (no flash of default colours). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=JSON.parse(localStorage.getItem('pulse_palette')||'null');if(t)for(var k in t)if(/^--[a-z0-9-]+$/.test(k)&&/^#[0-9a-f]{6}$/i.test(t[k]))document.documentElement.style.setProperty(k,t[k])}catch(e){}",
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <EnvBanner />
        <AuthProvider>
          <Rehydrate />
          <TooltipProvider delayDuration={200}>
            <LangShell>
              <Outlet />
            </LangShell>
          </TooltipProvider>
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: "font-sans",
              style: {
                background: "var(--color-ink)",
                color: "var(--color-sand)",
                border: "none",
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function LangShell({ children }: { children: ReactNode }) {
  const lang = useApp((s) => s.lang);
  const branding = useSettings((s) => s.branding);
  const source = useSettings((s) => s.source);
  const names = useBrand();
  const palette = useMemo(
    () => paletteTokens({ background: branding.background, primary: branding.primary, accent: branding.accent }),
    [branding.background, branding.primary, branding.accent],
  );
  // Remember the colours for the next visit, once they come from the server (not the defaults).
  useEffect(() => {
    if (source === "none") return;
    try {
      localStorage.setItem("pulse_palette", JSON.stringify(palette));
    } catch {
      // Storage blocked: the page still uses the right colours once settings load.
    }
    for (const [k, v] of Object.entries(palette)) document.documentElement.style.setProperty(k, v);
  }, [palette, source]);
  useEffect(() => {
    document.title = names.app[lang];
  }, [names, lang]);
  // Keep <html> in step with the chosen language, so screen readers, browser translation
  // and spell-checking treat the whole page (including dialogs portalled to <body>) correctly.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-dvh bg-sand text-fg antialiased"
      style={palette as CSSProperties}
    >
      {children}
    </div>
  );
}
