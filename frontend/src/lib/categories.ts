export const CATEGORIES = [
  "hate_speech",
  "harassment",
  "spam",
  "misinformation",
  "graphic_violence",
  "adult_content",
  "self_harm",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function prettyCategory(c: string): string {
  return c
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type ScoreLevel = "high" | "mid" | "low";

export function scoreLevel(score: number): ScoreLevel {
  if (score > 0.7) return "high";
  if (score >= 0.4) return "mid";
  return "low";
}

// Hex colors for Recharts cells.
export function scoreHex(score: number): string {
  const lvl = scoreLevel(score);
  if (lvl === "high") return "#ef4444"; // red-500
  if (lvl === "mid") return "#eab308"; // yellow-500
  return "#22c55e"; // green-500
}

// Tailwind text/bg helpers for plain DOM bars.
export function scoreBarClass(score: number): string {
  const lvl = scoreLevel(score);
  if (lvl === "high") return "bg-red-500";
  if (lvl === "mid") return "bg-yellow-500";
  return "bg-green-500";
}

export function scoreTextClass(score: number): string {
  const lvl = scoreLevel(score);
  if (lvl === "high") return "text-red-600";
  if (lvl === "mid") return "text-yellow-600";
  return "text-green-600";
}

export function severityClass(severity?: string): string {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-800 ring-red-600/20";
    case "high":
      return "bg-orange-100 text-orange-800 ring-orange-600/20";
    case "medium":
      return "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
    case "low":
      return "bg-green-100 text-green-800 ring-green-600/20";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-500/20";
  }
}

export function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${Math.max(sec, 0)}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
