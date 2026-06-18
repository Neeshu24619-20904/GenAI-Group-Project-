import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import {
  getAuditLog,
  getAuditLogs,
  getDecision,
  apiErrorMessage,
  type AuditLogDetail,
  type AuditLogItem,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  LoadingSpinner,
  EmptyState,
  CategoryBadge,
  CategoryScoreBar,
  DecisionBadge,
  ScoreComparisonTable,
  ExplanationCard,
  InlineSpinner,
  SeverityBadge,
  SlideOver,
} from "@/components/shared";
import { prettyCategory, relativeTime } from "@/lib/categories";

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

type AuditSummary = {
  platform?: string;
  action?: string;
  userId?: string;
  topCategory?: string;
  severity?: string;
  scores?: Record<string, number>;
  notes?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function asScores(value: unknown): Record<string, number> | undefined {
  const source = asRecord(value);
  const scores = Object.fromEntries(
    Object.entries(source)
      .filter(([, v]) => typeof v === "number" || typeof v === "string")
      .map(([k, v]) => [k, Number(v)])
      .filter(([, v]) => Number.isFinite(v)),
  );
  return Object.keys(scores).length > 0 ? scores : undefined;
}

function highestScoreCategory(scores?: Record<string, number>, minScore = 0.5) {
  if (!scores || Object.keys(scores).length === 0) return undefined;
  const [category, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? [];
  return score >= minScore ? category : undefined;
}

function auditSummary(item: AuditLogItem): AuditSummary {
  const diff = asRecord(item.diff);
  const after = asRecord(diff.after);
  const explanation = asRecord(diff.explanation);
  const scores =
    asScores(diff.adjusted_scores) ||
    asScores(diff.scores) ||
    asScores(after.adjusted_scores);
  const action =
    String(after.moderator_action || diff.action || item.action || "");
  const isSafe = action.toUpperCase() === "AUTO_APPROVE";

  return {
    platform: String(diff.platform || diff.platform_id || after.platform || after.platform_id || ""),
    action,
    userId: String(diff.user_id || diff.userId || after.user_id || after.userId || ""),
    topCategory: isSafe
      ? "no_violation"
      : String(
          diff.top_category ||
            diff.primary_category ||
            explanation.primary_category ||
            highestScoreCategory(scores) ||
            "",
        ),
    severity: String(diff.severity || explanation.severity || after.severity || ""),
    scores,
    notes: String(after.notes || diff.notes || diff.context_notes || ""),
  };
}

function SyntaxJson({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const tokens = json.split(/("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi);
  return (
    <pre className="overflow-x-auto rounded bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
      {tokens.map((token, index) => {
        let cls = "text-gray-100";
        if (/^".*"(?=\s*$)/.test(token)) cls = "text-emerald-300";
        if (/^"(?:\\.|[^"\\])*"$/.test(token) && tokens[index + 1]?.startsWith(":")) cls = "text-sky-300";
        if (/^-?\d/.test(token)) cls = "text-amber-300";
        if (/^(true|false|null)$/i.test(token)) cls = "text-purple-300";
        return <span key={`${index}-${token}`} className={cls}>{token}</span>;
      })}
    </pre>
  );
}

function AuditDetailsSlideOver({
  item,
  open,
  onClose,
}: {
  item: AuditLogItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const active = detail || item;
  const summary = active ? auditSummary(active) : null;
  const decision = detail?.decision;

  useEffect(() => {
    if (!open || !item) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getAuditLog(item.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(apiErrorMessage(e));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  return (
    <SlideOver open={open} onClose={onClose} title="Audit Details">
      {item && summary && active && (
        <div className="space-y-6">
          {loading && <LoadingSpinner label="Resolving audit context…" />}

          {decision ? (
            <>
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Submitted Content</h3>
                <div className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm text-gray-800">
                  {decision.content || "—"}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Platform</p>
                  <p className="font-medium text-gray-800">
                    {decision.platform_name || decision.platform_id || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">User ID</p>
                  <p className="font-medium text-gray-800">{decision.user_id || "anonymous"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Decision Action</p>
                  <div className="mt-1"><DecisionBadge action={decision.action} /></div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Top Category</p>
                  <div className="mt-1">
                    <CategoryBadge
                      category={
                        decision.action === "AUTO_APPROVE"
                          ? "no_violation"
                          : decision.top_category
                      }
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Severity</p>
                  <div className="mt-1"><SeverityBadge severity={decision.severity} /></div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="font-medium text-gray-800">
                    {decision.created_at ? new Date(decision.created_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              {decision.explanation_reasoning && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Explanation Reasoning</h3>
                  <p className="rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700">
                    {decision.explanation_reasoning}
                  </p>
                </section>
              )}

              {decision.context_notes && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Context Notes</h3>
                  <p className="rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700">
                    {decision.context_notes}
                  </p>
                </section>
              )}

              {decision.adjusted_scores && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Scores</h3>
                  <div className="space-y-2">
                    {Object.entries(decision.adjusted_scores).map(([category, score]) => (
                      <CategoryScoreBar
                        key={category}
                        label={prettyCategory(category)}
                        score={score}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : !loading ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No associated decision was found for this audit record.
            </div>
          ) : null}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Complete JSON</h3>
            <SyntaxJson value={active} />
          </section>
        </div>
      )}
    </SlideOver>
  );
}

function DecisionsTable({
  items,
  loading,
  resolved,
  onViewDetails,
}: {
  items: AuditLogItem[];
  loading: boolean;
  resolved?: boolean;
  onViewDetails: (item: AuditLogItem) => void;
}) {
  if (loading) return <LoadingSpinner label="Loading…" />;
  if (items.length === 0)
    return <EmptyState title="No records" message="Nothing to show here yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Summary</th>
            <th className="px-4 py-3">Entity ID</th>
            <th className="px-4 py-3 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => {
            const summary = auditSummary(it);
            const action = summary.action || it.action;

            return (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">
                  {relativeTime(it.created_at)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {it.entity_type || "—"}
                </td>
                <td className="px-4 py-3">
                  <DecisionBadge action={action} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-md flex-wrap items-center gap-2">
                    {summary.platform && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        Platform: {summary.platform}
                      </span>
                    )}
                    {summary.userId && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        User: {summary.userId}
                      </span>
                    )}
                    {summary.topCategory && <CategoryBadge category={summary.topCategory} />}
                    {summary.severity && <SeverityBadge severity={summary.severity} />}
                    {!summary.platform && !summary.userId && !summary.topCategory && !summary.severity && (
                      <span className="text-gray-400">No summary fields</span>
                    )}
                  </div>
                </td>
                <td className="max-w-[14rem] truncate px-4 py-3 font-mono text-xs text-gray-500">
                  {it.entity_id || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetails(it)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                </td>
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
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [lookupId, setLookupId] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupData, setLookupData] = useState<any>(null);
  const [activeAudit, setActiveAudit] = useState<AuditLogItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const entity_type = tab === "resolved" ? "queue_item" : undefined;
    getAuditLogs({ entity_type, page, limit: LIMIT })
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
          Showing audit events written by moderation, policy, and review actions.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DecisionsTable
          items={items}
          loading={loading}
          resolved={tab === "resolved"}
          onViewDetails={setActiveAudit}
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

      <AuditDetailsSlideOver
        item={activeAudit}
        open={activeAudit !== null}
        onClose={() => setActiveAudit(null)}
      />
    </div>
  );
}

export { DecisionDetail };
