import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";
import { getStats, apiErrorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { LoadingSpinner, EmptyState } from "@/components/shared";
import { prettyCategory } from "@/lib/categories";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Content Moderation" },
      {
        name: "description",
        content: "Moderation pipeline analytics: decisions, category breakdown, and volume over time.",
      },
    ],
  }),
  component: AnalyticsPage,
});

interface Stats {
  total?: number;
  auto_approved?: number;
  auto_approved_pct?: number;
  auto_rejected?: number;
  auto_rejected_pct?: number;
  queued?: number;
  queued_pct?: number;
  category_breakdown?: Record<string, number>;
  recent_volume?: { date: string; count: number }[];
  queue_resolution_rate?: number;
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={color}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  );
}

function AnalyticsPage() {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStats(days)
      .then((d) => setStats(d))
      .catch((e) => {
        toast.error(apiErrorMessage(e));
        setStats(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const pieData = stats
    ? [
        { name: "Auto Approved", value: stats.auto_approved ?? 0, fill: "#22c55e" },
        { name: "Auto Rejected", value: stats.auto_rejected ?? 0, fill: "#ef4444" },
        { name: "Queued", value: stats.queued ?? 0, fill: "#eab308" },
      ]
    : [];

  const catData = stats?.category_breakdown
    ? Object.entries(stats.category_breakdown).map(([k, v]) => ({
        name: prettyCategory(k),
        value: Number(v),
      }))
    : [];
  const maxCat = Math.max(1, ...catData.map((d) => d.value));

  const volume = stats?.recent_volume ?? [];
  const resolution = Math.round((stats?.queue_resolution_rate ?? 0) * (stats && stats.queue_resolution_rate! <= 1 ? 100 : 1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading analytics…" />
      ) : !stats ? (
        <div className="mt-6">
          <EmptyState title="No data" message="Stats could not be loaded." />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Row 1 — stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Moderated"
              value={stats.total ?? 0}
              color="text-blue-500"
              icon={<Layers className="h-5 w-5" />}
            />
            <StatCard
              label="Auto Approved"
              value={stats.auto_approved ?? 0}
              sub={`${(stats.auto_approved_pct ?? 0).toFixed(0)}%`}
              color="text-green-500"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              label="Auto Rejected"
              value={stats.auto_rejected ?? 0}
              sub={`${(stats.auto_rejected_pct ?? 0).toFixed(0)}%`}
              color="text-red-500"
              icon={<XCircle className="h-5 w-5" />}
            />
            <StatCard
              label="Queued for Review"
              value={stats.queued ?? 0}
              sub={`${(stats.queued_pct ?? 0).toFixed(0)}%`}
              color="text-yellow-500"
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {/* Row 2 — pie + category bar */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Decision Distribution
              </h3>
              {pieData.every((d) => d.value === 0) ? (
                <EmptyState title="No decisions yet" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Category Breakdown
              </h3>
              {catData.length === 0 ? (
                <EmptyState title="No category triggers" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={catData}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {catData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.value >= maxCat * 0.66 ? "#ef4444" : "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 3 — volume line chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Moderation Volume
            </h3>
            {volume.length === 0 ? (
              <EmptyState title="No volume data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={volume} margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom — resolution rate */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">
              Queue Resolution Rate
            </h3>
            <p className="mt-2 text-4xl font-bold text-indigo-600">{resolution}%</p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(100, resolution)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
