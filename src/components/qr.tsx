import { useEffect, useState } from "react";

/** QR code drawn in the browser — the address is never sent to another service. */
export function Qr({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!value) return;
    void import("qrcode").then((QR) =>
      QR.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#142A32", light: "#ffffff" } }).then((url) => {
        if (alive) setSrc(url);
      }),
    );
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="rounded-lg bg-sand-2" />;
  return <img src={src} alt="QR code for the survey link" width={size} height={size} className="rounded-lg border border-border bg-white" />;
}
