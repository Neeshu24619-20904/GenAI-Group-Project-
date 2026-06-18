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
      { title: "Moderation Playground - AI Content Moderation" },
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
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Content Moderation Playground
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit content to the AI pipeline and inspect the decision.
          </p>

          <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-md shadow-slate-200/70">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Content
              </label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content to moderate..."
                className="w-full resize-y rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                  className="w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                  className="w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
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
        </div>

        <div>
          {!result ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm text-gray-400 shadow-sm">
              Run moderation to see results here.
            </div>
          ) : (
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md shadow-slate-200/70">
              <div>
                <DecisionBadge action={result.action} large />
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Category Scores
                </h3>
                <CategoryScoreChart scores={result.adjusted_scores} />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Raw vs Adjusted
                </h3>
                <ScoreComparisonTable
                  raw={result.raw_scores}
                  adjusted={result.adjusted_scores}
                />
              </section>

              {result.context_notes && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">
                    Context Notes
                  </h3>
                  <p className="text-sm italic text-gray-500">
                    {result.context_notes}
                  </p>
                </section>
              )}

              {showExplanation && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
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
                  className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Full Decision
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
