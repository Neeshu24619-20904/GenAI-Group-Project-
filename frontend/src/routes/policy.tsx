import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import {
  getPlatforms,
  createPlatform,
  updatePlatform,
  apiErrorMessage,
  type Platform,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { LoadingSpinner, InlineSpinner, EmptyState } from "@/components/shared";
import { CATEGORIES, prettyCategory } from "@/lib/categories";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy Configuration — AI Content Moderation" },
      {
        name: "description",
        content: "Configure per-platform harm categories and moderation thresholds.",
      },
    ],
  }),
  component: PolicyPage,
});

type Thresholds = Record<string, { review: number; reject: number }>;

function PlatformCard({ platform }: { platform: Platform }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState<string[]>(
    platform.enabled_categories ?? [...CATEGORIES],
  );
  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    const base: Thresholds = {};
    CATEGORIES.forEach((c) => {
      base[c] = {
        review: platform.thresholds?.[c]?.review ?? 0.4,
        reject: platform.thresholds?.[c]?.reject ?? 0.8,
      };
    });
    return base;
  });
  const [showThresholds, setShowThresholds] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggle(cat: string) {
    setEnabled((e) =>
      e.includes(cat) ? e.filter((c) => c !== cat) : [...e, cat],
    );
  }

  function setThreshold(cat: string, key: "review" | "reject", value: number) {
    setThresholds((t) => ({ ...t, [cat]: { ...t[cat], [key]: value } }));
  }

  async function save() {
    setSaving(true);
    try {
      const enabledThresholds: Thresholds = {};
      enabled.forEach((c) => (enabledThresholds[c] = thresholds[c]));
      await updatePlatform(platform.id, {
        thresholds: enabledThresholds,
        enabled_categories: enabled,
      });
      toast.success(`${platform.name} saved.`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
      <p className="mt-0.5 text-sm text-gray-500">
        {platform.description || platform.id}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Enabled Categories
        </p>
        <div className="space-y-2">
          {CATEGORIES.map((c) => {
            const on = enabled.includes(c);
            return (
              <div key={c} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{prettyCategory(c)}</span>
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    on ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      on ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setShowThresholds((s) => !s)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
        >
          <span>Thresholds</span>
          {showThresholds ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {showThresholds && (
          <div className="space-y-4 border-t border-gray-100 p-3">
            {enabled.length === 0 && (
              <p className="text-sm text-gray-400">No categories enabled.</p>
            )}
            {enabled.map((c) => (
              <div key={c}>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {prettyCategory(c)}
                </p>
                {(["review", "reject"] as const).map((key) => (
                  <div key={key} className="mb-1 flex items-center gap-2">
                    <span className="w-28 text-xs capitalize text-gray-500">
                      {key} threshold
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={thresholds[c][key]}
                      onChange={(e) =>
                        setThreshold(c, key, Number(e.target.value))
                      }
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="w-9 text-right text-xs tabular-nums text-gray-700">
                      {thresholds[c][key].toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? <InlineSpinner /> : null} Save Changes
      </button>
    </div>
  );
}

function AddPlatformModal({
  platforms,
  onClose,
  onCreated,
}: {
  platforms: Platform[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState(platforms[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!id.trim() || !name.trim()) {
      toast.error("ID and Name are required.");
      return;
    }
    if (/\s/.test(id)) {
      toast.error("ID cannot contain spaces.");
      return;
    }
    setBusy(true);
    try {
      const source = platforms.find((p) => p.id === copyFrom);
      await createPlatform({
        id,
        name,
        description,
        thresholds: source?.thresholds ?? {},
        enabled_categories: source?.enabled_categories ?? [...CATEGORIES],
      });
      toast.success("Platform created.");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Platform</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ID (no spaces)
            </label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Copy thresholds from
            </label>
            <select
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">None (defaults)</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <InlineSpinner /> : null} Create
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyPage() {
  const toast = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  function load() {
    setLoading(true);
    getPlatforms()
      .then(setPlatforms)
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => platforms, [platforms]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Platform Policy Configuration
        </h1>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Platform
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading platforms…" />
      ) : cards.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No platforms yet"
            message="Add a platform to start configuring moderation policies."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <PlatformCard key={p.id} platform={p} />
          ))}
        </div>
      )}

      {modal && (
        <AddPlatformModal
          platforms={platforms}
          onClose={() => setModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
