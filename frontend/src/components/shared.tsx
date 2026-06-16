import { type ReactNode, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { X } from "lucide-react";
import {
  CATEGORIES,
  prettyCategory,
  scoreBarClass,
  scoreHex,
  scoreTextClass,
  severityClass,
} from "@/lib/categories";
import type { Explanation } from "@/lib/api";

// ---- LoadingSpinner ----
export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  );
}

// ---- DecisionBadge ----
export function DecisionBadge({
  action,
  large = false,
}: {
  action?: string;
  large?: boolean;
}) {
  const a = (action || "").toUpperCase();
  let cls = "bg-gray-100 text-gray-700";
  let label = a || "Unknown";
  if (a === "AUTO_APPROVE") {
    cls = "bg-green-100 text-green-800";
    label = "✓ Auto Approved";
  } else if (a === "AUTO_REJECT") {
    cls = "bg-red-100 text-red-800";
    label = "✗ Auto Rejected";
  } else if (a === "QUEUE") {
    cls = "bg-yellow-100 text-yellow-800";
    label = "⏳ Sent to Human Review";
  } else if (a === "APPROVE") {
    cls = "bg-green-100 text-green-800";
    label = "Approved";
  } else if (a === "REJECT") {
    cls = "bg-red-100 text-red-800";
    label = "Rejected";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${cls} ${
        large ? "px-5 py-2 text-lg" : "px-3 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}

// ---- CategoryBadge ----
export function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-100">
      {prettyCategory(category)}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${severityClass(
        severity,
      )}`}
    >
      {severity}
    </span>
  );
}

// ---- CategoryScoreBar ----
export function CategoryScoreBar({
  label,
  score,
}: {
  label?: string;
  score: number;
}) {
  const pct = Math.round((score || 0) * 100);
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="w-32 shrink-0 truncate text-sm text-gray-600">
          {label}
        </span>
      )}
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${scoreBarClass(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-10 shrink-0 text-right text-sm font-medium ${scoreTextClass(score)}`}>
        {pct}%
      </span>
    </div>
  );
}

// ---- Horizontal bar chart for category scores ----
export function CategoryScoreChart({
  scores,
}: {
  scores?: Record<string, number>;
}) {
  const data = CATEGORIES.map((c) => ({
    name: prettyCategory(c),
    value: Number(scores?.[c] ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={scoreHex(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Raw vs adjusted comparison table ----
export function ScoreComparisonTable({
  raw,
  adjusted,
}: {
  raw?: Record<string, number>;
  adjusted?: Record<string, number>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2 text-right">Raw</th>
            <th className="px-3 py-2 text-right">Adjusted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {CATEGORIES.map((c) => (
            <tr key={c}>
              <td className="px-3 py-1.5 text-gray-700">{prettyCategory(c)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                {(Number(raw?.[c] ?? 0)).toFixed(2)}
              </td>
              <td
                className={`px-3 py-1.5 text-right font-medium tabular-nums ${scoreTextClass(
                  Number(adjusted?.[c] ?? 0),
                )}`}
              >
                {(Number(adjusted?.[c] ?? 0)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- ExplanationCard ----
export function ExplanationCard({
  explanation,
  action,
}: {
  explanation?: Explanation;
  action?: string;
}) {
  if (!explanation) return null;
  const a = (action || "").toUpperCase();
  const border =
    a === "AUTO_REJECT" ? "border-l-red-500" : "border-l-yellow-500";
  return (
    <div className={`rounded-lg border border-l-4 border-gray-200 bg-white p-4 ${border}`}>
      {explanation.offending_segment && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Offending Segment
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-900 p-3 font-mono text-sm text-amber-200">
            {explanation.offending_segment}
          </pre>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {explanation.primary_category && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </p>
            <CategoryBadge category={explanation.primary_category} />
          </div>
        )}
        {explanation.severity && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Severity
            </p>
            <SeverityBadge severity={explanation.severity} />
          </div>
        )}
      </div>
      {explanation.reasoning && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reasoning
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            {explanation.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- SlideOver ----
export function SlideOver({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- EmptyState ----
export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
      {icon && <div className="text-gray-300">{icon}</div>}
      <p className="font-medium text-gray-700">{title}</p>
      {message && <p className="max-w-sm text-sm text-gray-500">{message}</p>}
    </div>
  );
}
