import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  getQueue,
  getDecision,
  apiErrorMessage,
  type QueueItem,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  LoadingSpinner,
  EmptyState,
  CategoryBadge,
  DecisionBadge,
  ScoreComparisonTable,
  ExplanationCard,
  InlineSpinner,
} from "@/components/shared";
import { relativeTime, scoreTextClass } from "@/lib/categories";

export const Route = createFileRoute("/decisions/")({
  head: () => ({
    meta: [
      { title: "Audit Log — AI Content Moderation" },
      {
        name: "description",
        content: "Browse moderation decisions, resolved reviews, and look up decisions by ID.",
      },
    ],
  }),
  component: DecisionsPage,
});

const LIMIT = 20;

function DecisionDetail({ data }: { data: any }) {
  const explanation = data.explanation;
  const action = data.action;
  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DecisionBadge action={action} large />
        <span className="text-sm text-gray-500">
          {data.created_at ? new Date(data.created_at).toLocaleString() : "—"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Platform</p>
          <p className="font-medium text-gray-800">
            {data.platform_name || data.platform_id || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">User ID</p>
          <p className="font-medium text-gray-800">{data.user_id || "anonymous"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Decision ID</p>
          <p className="font-mono text-xs text-gray-700">
            {data.decision_id || data.id || "—"}
          </p>
        </div>
      </div>

      {(data.content || data.content_preview) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Content
          </p>
          <div className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm text-gray-800">
            {data.content || data.content_preview}
          </div>
        </div>
      )}

      {(data.raw_scores || data.adjusted_scores) && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Raw vs Adjusted Scores
          </p>
          <ScoreComparisonTable
            raw={data.raw_scores}
            adjusted={data.adjusted_scores}
          />
        </div>
      )}

      {data.context_notes && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Context Notes
          </p>
          <p className="text-sm italic text-gray-500">{data.context_notes}</p>
        </div>
      )}

      {explanation && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Explanation
          </p>
          <ExplanationCard explanation={explanation} action={action} />
        </div>
      )}

      {data.status && (
        <div className="text-sm">
          <span className="text-gray-500">Queue status: </span>
          <span className="font-medium text-gray-800">{data.status}</span>
        </div>
      )}
    </div>
  );
}

function DecisionsTable({
  items,
  loading,
  resolved,
}: {
  items: QueueItem[];
  loading: boolean;
  resolved?: boolean;
}) {
  if (loading) return <LoadingSpinner label="Loading…" />;
  if (items.length === 0)
    return <EmptyState title="No records" message="Nothing to show here yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Content</th>
            <th className="px-4 py-3">Platform</th>
            <th className="px-4 py-3">Top Category</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">When</th>
            {resolved ? (
              <>
                <th className="px-4 py-3">Moderator Action</th>
                <th className="px-4 py-3">Notes</th>
              </>
            ) : (
              <th className="px-4 py-3">Decision</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => {
            const text = it.content || it.content_preview || "";
            const score = it.top_score ?? 0;
            return (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="max-w-xs px-4 py-3">
                  <span className="block truncate" title={text}>
                    {text.length > 80 ? text.slice(0, 80) + "…" : text || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {it.platform_name || it.platform_id}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={it.top_category} />
                </td>
                <td className={`px-4 py-3 font-medium ${scoreTextClass(score)}`}>
                  {Math.round(score * 100)}%
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {relativeTime(it.created_at)}
                </td>
                {resolved ? (
                  <>
                    <td className="px-4 py-3">
                      <DecisionBadge
                        action={it.moderator_action || it.action}
                      />
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-gray-600">
                      {it.notes || "—"}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3">
                    <DecisionBadge action={it.action} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DecisionsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "resolved">("all");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [lookupId, setLookupId] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupData, setLookupData] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    const status = tab === "resolved" ? "resolved" : undefined;
    getQueue({ status, page, limit: LIMIT })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => {
        toast.error(apiErrorMessage(e));
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function lookup() {
    if (!lookupId.trim()) {
      toast.error("Enter a Decision ID.");
      return;
    }
    setLookupBusy(true);
    try {
      const d = await getDecision(lookupId.trim());
      setLookupData(d);
    } catch (e) {
      toast.error(apiErrorMessage(e));
      setLookupData(null);
    } finally {
      setLookupBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      <div className="mt-4 inline-flex overflow-hidden rounded-lg border border-gray-300">
        {(
          [
            ["all", "All Decisions"],
            ["resolved", "Resolved Reviews"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium ${
              tab === key
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing recently queued decisions. Use Decision ID lookup below for full audit.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DecisionsTable
          items={items}
          loading={loading}
          resolved={tab === "resolved"}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {total} record{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Lookup */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Look up Decision by ID
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="decision_id"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:max-w-md"
          />
          <button
            onClick={lookup}
            disabled={lookupBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {lookupBusy ? <InlineSpinner /> : <Search className="h-4 w-4" />} Fetch
          </button>
        </div>
        {lookupData && (
          <div className="mt-4">
            <DecisionDetail data={lookupData} />
            <Link
              to="/decisions/$id"
              params={{ id: lookupData.decision_id || lookupData.id || lookupId }}
              className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Open full page →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export { DecisionDetail };
