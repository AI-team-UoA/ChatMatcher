import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Title, Text } from "@tremor/react";

const API = "http://localhost:8000/api/projects";
const LIMIT = 5;

type Project = {
  id: string;
  config: {
    project_name: string;
    examples?: { num_true: number; num_false: number };
    [key: string]: unknown;
  };
};

type Pair = {
  d1_id: string;
  d2_id: string;
  d1: Record<string, string> | null;
  d2: Record<string, string> | null;
};

type Example = { d1_id: string; d2_id: string; label: boolean };

const keyOf = (a: string, b: string) => JSON.stringify([a, b]);

function Record_({ title, id, record }: { title: string; id: string; record: Record<string, string> | null }) {
  return (
    <div className="flex-1 min-w-0 rounded-md border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <span className="text-[10px] text-slate-400">id: {id}</span>
      </div>
      {record ? (
        <dl className="space-y-1">
          {Object.entries(record).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <dt className="w-16 shrink-0 font-medium text-slate-500 truncate">{k}</dt>
              <dd className="text-slate-800 break-words line-clamp-2">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-red-600">Record not found for this id</p>
      )}
    </div>
  );
}

export default function Examples() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [offset, setOffset] = useState(0);

  const [page, setPage] = useState<{ source: string; total: number; pairs: Pair[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const [labels, setLabels] = useState<Record<string, Example>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- projects list ---
  const fetchProjects = async () => {
    try {
      const res = await fetch(API);
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
  };
  useEffect(() => {
    fetchProjects();
  }, []);

  // --- on project change: reset paging and load previously saved examples ---
  useEffect(() => {
    setOffset(0);
    setPage(null);
    setLabels({});
    setDirty(false);
    setSavedAt(null);
    setError(null);
    if (!projectId) return;

    let cancelled = false;
    fetch(`${API}/${projectId}/examples`)
      .then((r) => (r.ok ? r.json() : { examples: [] }))
      .then((json: { examples: Example[] }) => {
        if (cancelled) return;
        const map: Record<string, Example> = {};
        json.examples.forEach((e) => (map[keyOf(e.d1_id, e.d2_id)] = e));
        setLabels(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // --- load a page of pairs ---
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/${projectId}/examples/pairs?limit=${LIMIT}&offset=${offset}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setPage(json);
        scrollRef.current?.scrollTo({ top: 0 });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId, offset]);

  // --- labeling ---
  const setLabel = (p: Pair, value: boolean | null) => {
    setLabels((prev) => {
      const next = { ...prev };
      const k = keyOf(p.d1_id, p.d2_id);
      if (value === null || prev[k]?.label === value) delete next[k]; // clicking the active button clears it
      else next[k] = { d1_id: p.d1_id, d2_id: p.d2_id, label: value };
      return next;
    });
    setDirty(true);
    setSavedAt(null);
  };

  const clearAll = () => {
    if (!Object.keys(labels).length || !confirm("Remove all selected examples?")) return;
    setLabels({});
    setDirty(true);
    setSavedAt(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/${projectId}/examples`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples: Object.values(labels) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Save failed (${res.status})`);
      setDirty(false);
      setSavedAt(Date.now());
      fetchProjects(); // refresh the counts in the dropdown
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const changeProject = (id: string) => {
    if (dirty && !confirm("You have unsaved examples. Switch project and discard them?")) return;
    setProjectId(id);
  };

  const counts = useMemo(() => {
    const all = Object.values(labels);
    return { t: all.filter((e) => e.label).length, f: all.filter((e) => !e.label).length };
  }, [labels]);

  const total = page?.total ?? 0;
  const navBtn =
    "px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="border-b border-slate-200 pb-4">
        <Title className="text-xl">Examples</Title>
        <Text>Pick pairs you find useful and mark each one as a match (True) or a non-match (False).</Text>
      </div>

      <Card className="p-5">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Project *</label>
        <select
          value={projectId}
          onChange={(e) => changeProject(e.target.value)}
          className="w-full md:w-1/2 text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
        >
          <option value="" disabled>-- Choose a project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.config.project_name}
              {p.config.examples
                ? ` (${p.config.examples.num_true + p.config.examples.num_false} examples)`
                : ""}
            </option>
          ))}
        </select>
      </Card>

      {projectId && (
        <Card className="p-4">
          {/* Header: source, counters, pagination, save */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Text className="font-semibold text-slate-800 text-sm">Pairs</Text>
              {page && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    page.source === "candidate_pairs"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {page.source === "candidate_pairs"
                    ? "Candidate pairs"
                    : "All possible pairs (no candidate pairs yet)"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {total > 0 && (
                <Text className="text-xs">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}
                </Text>
              )}
              <button className={navBtn} disabled={offset === 0 || loading} onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}>
                Prev
              </button>
              <button className={navBtn} disabled={offset + LIMIT >= total || loading} onClick={() => setOffset((o) => o + LIMIT)}>
                Next
              </button>
              <button
                className={navBtn}
                disabled={total <= LIMIT || loading}
                onClick={() => setOffset(Math.floor(Math.random() * Math.max(1, total - LIMIT)))}
                title="Jump to a random page"
              >
                Random
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">True: {counts.t}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">False: {counts.f}</span>
              {dirty && <span className="text-amber-600">Unsaved changes</span>}
              {savedAt && !dirty && <span className="text-emerald-600">Saved ✓</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className={navBtn} disabled={!counts.t && !counts.f}>
                Clear all
              </button>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="px-4 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save examples"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

          {/* Scrollable list */}
          <div ref={scrollRef} className={`max-h-[60vh] overflow-y-auto pr-1 space-y-2 ${loading ? "opacity-50" : ""}`}>
            {page?.pairs.map((p, i) => {
              const current = labels[keyOf(p.d1_id, p.d2_id)]?.label;
              const border =
                current === true
                  ? "border-emerald-400 bg-emerald-50"
                  : current === false
                  ? "border-rose-400 bg-rose-50"
                  : "border-slate-200 bg-slate-50";
              return (
                <div key={`${p.d1_id}-${p.d2_id}-${i}`} className={`flex flex-col md:flex-row gap-2 p-2 rounded-lg border ${border}`}>
                  <Record_ title="Dataset 1" id={p.d1_id} record={p.d1} />
                  <Record_ title="Dataset 2" id={p.d2_id} record={p.d2} />
                  <div className="flex md:flex-col gap-2 justify-center md:w-24">
                    <button
                      onClick={() => setLabel(p, true)}
                      className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
                        current === true
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      True
                    </button>
                    <button
                      onClick={() => setLabel(p, false)}
                      className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
                        current === false
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                      }`}
                    >
                      False
                    </button>
                  </div>
                </div>
              );
            })}
            {page && page.pairs.length === 0 && <p className="text-sm text-slate-500">No pairs to show.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}