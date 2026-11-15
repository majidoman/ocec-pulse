import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/captcha           → a new signed puzzle for the "I'm not a robot" box.
 * GET /api/captcha?status=1  → { enabled } so the page knows whether to show the box at all.
 */
export const Route = createFileRoute("/api/captcha")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const captcha = await import("@/lib/pulse/captcha.server");
        const headers = { "cache-control": "no-store" };
        if (new URL(request.url).searchParams.has("status")) {
          return Response.json({ enabled: captcha.captchaEnabled() }, { headers });
        }
        if (!captcha.captchaEnabled()) return Response.json({ error: "off" }, { status: 404, headers });
        const { rateLimit, RateLimitedError } = await import("@/lib/pulse/core.server");
        try {
          await rateLimit("captcha-new", 300);
        } catch (e) {
          if (e instanceof RateLimitedError) return Response.json({ error: "Too many requests" }, { status: 429, headers });
          throw e;
        }
        return Response.json(await captcha.newChallenge(), { headers });
      },
    },
  },
});
