import { createElement, useEffect, useRef, useState } from "react";
import { captchaEnabledOnServer } from "@/lib/pulse/captcha-client";
import { useT } from "@/lib/store";

/**
 * "I'm not a robot" box (ALTCHA, self-hosted: the puzzle comes from /api/captcha and is solved in the
 * browser; no outside service is contacted). It starts solving as soon as the person focuses a field
 * in the same form, so it is usually ticked by the time they finish typing.
 *
 * `onChange` receives the solved payload, or null while it is not solved. Send the payload in the
 * x-pulse-captcha header (sign-in, sign-up) or the `captcha` field (password reset). To get a fresh
 * box after a failed attempt, remount it with a new `key`.
 * When the server has the check switched off, nothing is shown and onChange receives "off".
 */
export function Captcha({ onChange }: { onChange: (payload: string | null) => void }) {
  const { lang } = useT();
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"checking" | "off" | "on">("checking");
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    let live = true;
    void captchaEnabledOnServer().then(async (enabled) => {
      if (!live) return;
      if (!enabled) {
        setState("off");
        changeRef.current("off");
        return;
      }
      await import("altcha");
      await import("altcha/i18n/ar");
      if (live) setState("on");
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (state !== "on" || !el) return;
    const handler = (ev: Event) => {
      const d = (ev as CustomEvent<{ state?: string; payload?: string }>).detail ?? {};
      changeRef.current(d.state === "verified" && d.payload ? d.payload : null);
    };
    el.addEventListener("statechange", handler);
    return () => el.removeEventListener("statechange", handler);
  }, [state]);

  if (state === "off") return null;
  if (state === "checking") return <div className="h-[58px]" aria-hidden />;
  return createElement("altcha-widget", {
    ref,
    challenge: "/api/captcha",
    auto: "onfocus",
    language: lang,
    name: "captcha",
    configuration: JSON.stringify({ hideFooter: true, hideLogo: true, workers: 4 }),
    className: "pulse-captcha",
    dir: lang === "ar" ? "rtl" : "ltr",
  });
}

