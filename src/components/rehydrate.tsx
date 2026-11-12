import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { usePulse } from "@/lib/pulse/session";

/**
 * Runs once on the client: restores the device-only draft and language, then
 * loads the public census configuration from the server.
 */
export function Rehydrate() {
  useEffect(() => {
    void (async () => {
      await useApp.persist.rehydrate();
      await usePulse.getState().loadPublic();
      // First visit: follow the census default language until the visitor picks one.
      const app = useApp.getState();
      if (!app.langChosen) useApp.setState({ lang: useSettings.getState().general.defaultLang });
    })();
  }, []);
  return null;
}
