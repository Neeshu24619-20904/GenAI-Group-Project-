import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Play } from "lucide-react";
import {
  getPlatforms,
  moderate,
  apiErrorMessage,
  type Platform,
  type ModerateResponse,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  DecisionBadge,
  CategoryScoreChart,
  ScoreComparisonTable,
  ExplanationCard,
  InlineSpinner,
} from "@/components/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
<<<<<<< ours
      { title: "Moderation Playground - AI Content Moderation" },
=======
      { title: "Moderation Playground — AI Content Moderation" },
>>>>>>> theirs
      {
        name: "description",
        content:
          "Test the AI content moderation pipeline. Run content through harm-category scoring and get an automated decision.",
      },
    ],
  }),
  component: Playground,
});

function Playground() {
  const toast = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [content, setContent] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [userId, setUserId] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [priorViolations, setPriorViolations] = useState(0);
  const [threadId, setThreadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ModerateResponse | null>(null);

  useEffect(() => {
    getPlatforms()
      .then((p) => {
        setPlatforms(p);
        if (p.length && !platformId) setPlatformId(p[0].id);
      })
      .catch((e) => toast.error(apiErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!content.trim()) {
      toast.error("Please enter content to moderate.");
      return;
    }
    setLoading(true);
    try {
      const res = await moderate({
        content,
        platform_id: platformId,
        user_id: userId,
        context: { prior_violations: priorViolations, thread_id: threadId },
      });
      setResult(res);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const showExplanation =
    result &&
    (result.action?.toUpperCase() === "QUEUE" ||
      result.action?.toUpperCase() === "AUTO_REJECT");

  return (
<<<<<<< ours
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/80 backdrop-blur md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Content Moderation Playground
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Submit content to the AI pipeline, compare raw and adjusted harm
              scores, and inspect the final routing decision.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-base font-semibold text-slate-950">7</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Categories
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-base font-semibold text-slate-950">3</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Routes
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-base font-semibold text-slate-950">100%</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Audited
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4 rounded-2xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Content
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter content to moderate..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Platform
              </label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              >
                {platforms.length === 0 && <option value="">No platforms</option>}
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                User ID
              </label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="anonymous"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setShowContext((s) => !s)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              <span>Context (optional)</span>
              {showContext ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {showContext && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 bg-white p-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Prior Violations
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priorViolations}
                    onChange={(e) =>
                      setPriorViolations(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Thread ID
                  </label>
                  <input
                    value={threadId}
                    onChange={(e) => setThreadId(e.target.value)}
                    placeholder="optional"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={run}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? (
              <>
                <InlineSpinner /> Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run Moderation
              </>
            )}
          </button>
        </div>

        <div>
          {!result ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/60">
              <div>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <Play className="h-5 w-5" />
                </div>
                Run moderation to see scores, routing, and explanations here.
              </div>
            </div>
          ) : (
            <div className="space-y-6 rounded-2xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70">
=======
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* LEFT — Input */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Content Moderation Playground
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit content to the AI pipeline and inspect the decision.
          </p>

          <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Content
              </label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content to moderate..."
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Platform
                </label>
                <select
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {platforms.length === 0 && (
                    <option value="">No platforms</option>
                  )}
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  User ID
                </label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="anonymous"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setShowContext((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
              >
                <span>Context (optional)</span>
                {showContext ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {showContext && (
                <div className="grid grid-cols-1 gap-4 border-t border-gray-100 p-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Prior Violations
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={priorViolations}
                      onChange={(e) =>
                        setPriorViolations(Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Thread ID
                    </label>
                    <input
                      value={threadId}
                      onChange={(e) => setThreadId(e.target.value)}
                      placeholder="optional"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={run}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <InlineSpinner /> Running…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Run Moderation
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div>
          {!result ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
              Run moderation to see results here.
            </div>
          ) : (
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
>>>>>>> theirs
              <div>
                <DecisionBadge action={result.action} large />
              </div>

              <section>
<<<<<<< ours
                <h3 className="mb-2 text-sm font-semibold text-slate-950">
=======
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
>>>>>>> theirs
                  Category Scores
                </h3>
                <CategoryScoreChart scores={result.adjusted_scores} />
              </section>

              <section>
<<<<<<< ours
                <h3 className="mb-2 text-sm font-semibold text-slate-950">
=======
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
>>>>>>> theirs
                  Raw vs Adjusted
                </h3>
                <ScoreComparisonTable
                  raw={result.raw_scores}
                  adjusted={result.adjusted_scores}
                />
              </section>

              {result.context_notes && (
                <section>
<<<<<<< ours
                  <h3 className="mb-1 text-sm font-semibold text-slate-950">
                    Context Notes
                  </h3>
                  <p className="text-sm italic text-slate-500">
=======
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">
                    Context Notes
                  </h3>
                  <p className="text-sm italic text-gray-500">
>>>>>>> theirs
                    {result.context_notes}
                  </p>
                </section>
              )}

              {showExplanation && (
                <section>
<<<<<<< ours
                  <h3 className="mb-2 text-sm font-semibold text-slate-950">
=======
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
>>>>>>> theirs
                    Explanation
                  </h3>
                  <ExplanationCard
                    explanation={result.explanation}
                    action={result.action}
                  />
                </section>
              )}

              {result.decision_id && (
                <Link
                  to="/decisions/$id"
                  params={{ id: result.decision_id }}
<<<<<<< ours
                  className="inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  View Full Decision
=======
                  className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Full Decision →
>>>>>>> theirs
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
