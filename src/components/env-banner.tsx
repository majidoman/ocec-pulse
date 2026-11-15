import { useEffect, useState } from "react";

/** A fixed strip on every page of the test site, so nobody mistakes it for the live census. */
export function EnvBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = window.location.hostname;
    setShow(h.includes("staging") || h.includes("-git-"));
  }, []);
  if (!show) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-amber-400 px-3 py-1 text-center text-xs font-semibold text-black"
    >
      TEST ENVIRONMENT · بيئة اختبار — not the live census; data here is not real
    </div>
  );
}
