import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-store";

export function Mark({ className }: { className?: string }) {
  const logo = useSettings((s) => s.branding.logoDataUrl);
  if (logo) {
    return <img src={logo} alt="" className={cn("size-8 rounded-lg object-cover", className)} />;
  }
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path
        d="M7 24 V15.5 A9 9 0 0 1 25 15.5 V24"
        fill="none"
        className="stroke-sand"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 17.5 H12 L14 13.5 L16.5 21 L18.5 16.5 H23"
        fill="none"
        className="stroke-sand"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
