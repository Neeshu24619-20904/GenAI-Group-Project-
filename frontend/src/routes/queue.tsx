import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getPlatforms,
  getQueue,
  resolveQueueItem,
  apiErrorMessage,
  type Platform,
  type QueueItem,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  LoadingSpinner,
  EmptyState,
  CategoryBadge,
  CategoryScoreChart,
  ExplanationCard,
  SlideOver,
  InlineSpinner,
} from "@/components/shared";
import { relativeTime, scoreTextClass } from "@/lib/categories";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Review Queue — AI Content Moderation" },
      {
        name: "description",
        content: "Human review queue for content flagged by the AI moderation pipeline.",
      },
    ],
  }),
  component: QueuePage,
});

const LIMIT = 20;

export function ReviewSlideOver({
  item,
  open,
  onClose,
  onResolved,
}: {
  item: QueueItem | null;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const toast = useToast();
  const [moderatorId, setModeratorId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);

  useEffect(() => {
    if (open) {
      setModeratorId("");
      setNotes("");
    }
  }, [open, item?.id]);

  async function resolve(action: "APPROVE" | "REJECT") {
    if (!item) return;
    if (!moderatorId.trim()) {
      toast.error("Moderator ID is required.");
      return;
    }
    setBusy(action);
    try {
      await resolveQueueItem(item.id, { action, moderator_id: moderatorId, notes });
      toast.success(`Content ${action === "APPROVE" ? "approved" : "rejected"}.`);
      onResolved();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Moderate Content">
      {item && (
        <div className="space-y-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Content
            </p>
            <div className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm text-gray-800">
              {item.content || item.content_preview || "—"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Platform</p>
              <p className="font-medium text-gray-800">
                {item.platform_name || item.platform_id}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">User ID</p>
              <p className="font-medium text-gray-800">
                {item.user_id || item.assigned_to || "anonymous"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="font-medium text-gray-800">
                {relativeTime(item.created_at)}
              </p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">AI Scores</h3>
            <CategoryScoreChart scores={item.adjusted_scores} />
          </section>

          {item.explanation && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                AI Explanation
              </h3>
              <ExplanationCard explanation={item.explanation} action={item.action} />
            </section>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Your Decision</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Moderator ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={moderatorId}
                  onChange={(e) => setModeratorId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => resolve("APPROVE")}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {busy === "APPROVE" ? <InlineSpinner /> : null} Approve
                </button>
                <button
                  onClick={() => resolve("REJECT")}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy === "REJECT" ? <InlineSpinner /> : null} Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SlideOver>
  );
}

function QueuePage() {
  const toast = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [status, setStatus] = useState<"pending" | "resolved">("pending");
  const [platformFilter, setPlatformFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<QueueItem | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getPlatforms()
      .then(setPlatforms)
      .catch((e) => toast.error(apiErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getQueue({
      status,
      platform_id: platformFilter || undefined,
      page,
      limit: LIMIT,
    })
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
  }, [status, platformFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            {(["pending", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  status === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner label="Loading queue…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Nothing here"
            message={`No ${status} items for this filter.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Top Category</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Queued</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            it.status === "resolved"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {it.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setActive(it);
                            setOpen(true);
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {total} item{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ReviewSlideOver
        item={active}
        open={open}
        onClose={() => setOpen(false)}
        onResolved={load}
      />
    </div>
  );
}
