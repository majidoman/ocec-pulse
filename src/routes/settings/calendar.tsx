import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old Calendar page repeated the survey dates; they are set in Settings → General. */
export const Route = createFileRoute("/settings/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", replace: true });
  },
});
