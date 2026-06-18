import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getDecision, apiErrorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { LoadingSpinner, EmptyState } from "@/components/shared";
import { DecisionDetail } from "./decisions.index";

export const Route = createFileRoute("/decisions/$id")({
  head: () => ({
    meta: [
      { title: "Decision Detail — AI Content Moderation" },
      { name: "description", content: "Full audit detail for a moderation decision." },
    ],
  }),
  component: DecisionDetailPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EmptyState title="Could not load decision" message={error.message} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EmptyState title="Decision not found" />
    </div>
  ),
});

function DecisionDetailPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDecision(id)
      .then((d) => setData(d))
      .catch((e) => {
        toast.error(apiErrorMessage(e));
        setData(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <button
        onClick={() => router.history.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Decision Detail</h1>
      <p className="mb-6 font-mono text-xs text-gray-500">{id}</p>

      {loading ? (
        <LoadingSpinner label="Loading decision…" />
      ) : !data ? (
        <EmptyState
          title="No decision found"
          message="This decision ID could not be retrieved."
        />
      ) : (
        <>
          <DecisionDetail data={data} />
          <Link
            to="/decisions"
            className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Audit Log
          </Link>
        </>
      )}
    </div>
  );
}
