export function fmt(n: number, digits = 0) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function scoreTone(score: number): "high" | "good" | "mid" | "low" | "crit" {
  if (score >= 80) return "high";
  if (score >= 72) return "good";
  if (score >= 64) return "mid";
  if (score >= 56) return "low";
  return "crit";
}

export function signed(n: number, digits = 0) {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
