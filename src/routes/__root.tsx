import { useEffect, type ReactNode, type CSSProperties } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { EnvBanner } from "@/components/env-banner";
import { Rehydrate } from "@/components/rehydrate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp, useBrand } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

/** Neutral until settings load; LangShell then sets the client's product name. */
const APP_NAME = "Pulse";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
  const names = useBrand();
  useEffect(() => {
    document.title = names.app[lang];
  }, [names, lang]);
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-dvh bg-sand text-fg antialiased"
      style={
        {
          ["--color-accent" as string]: branding.accent,
          ["--color-ink" as string]: branding.primary,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
