import React, { useState, useRef, useMemo, useEffect } from "react";
import { Card, Title, Text } from "@tremor/react";

type CandidatePairsInfo = {
  method: "standard_blocking" | "knn_search" | "file";
  created_at?: string;
  path?: string;
  num_pairs?: number;
  source_filename?: string;
  config?: {
    metric?: string;
    top_k?: number;
    tokenization?: string;
    q_gram_size?: number;
  };
};
type Project = {
  id: string;
  config: {
    project_name: string;
    description?: string;
    mode?: string;
    candidate_pairs?: CandidatePairsInfo;
    [key: string]: unknown;
  };
};
const METHOD_LABELS: Record<CandidatePairsInfo["method"], string> = {
  standard_blocking: "Standard Blocking",
  knn_search: "KNN-Search",
  file: "Imported from file",
};

const TOKENIZATION_LABELS: Record<string, string> = {
  standard: "Standard Tokenization",
  qgrams: "Q-Grams",
  standard_multiset: "Standard Multiset",
  qgrams_multiset: "Q-Grams Multiset",
};

const METRIC_LABELS: Record<string, string> = {
  cosine: "Cosine Similarity",
  dice: "Dice Similarity",
  Jaccard: "Jaccard Similarity",
};

type PreviewPair = {
  d1_id: string;
  d2_id: string;
  d1: Record<string, string> | null;
  d2: Record<string, string> | null;
};


function RecordSide({ title, id, record }: { title: string; id: string; record: Record<string, string> | null }) {
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

function PairsPreview({ projectId, refreshKey }: { projectId: string; refreshKey?: string }) {
  const LIMIT = 5;
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; pairs: PreviewPair[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOffset(0), [projectId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(
      `http://localhost:8000/api/projects/${projectId}/candidate-pairs/preview?limit=${LIMIT}&offset=${offset}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        scrollRef.current?.scrollTo({ top: 0 }); // new page starts at the top
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId, offset, refreshKey]);

  const total = data?.total ?? 0;
  const btn =
    "px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50";

  return (
    <Card className="p-4">
      {/* Header: title + counter + pagination, always visible */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Text className="font-semibold text-slate-800 text-sm">Candidate pairs preview</Text>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <Text className="text-xs">
              {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}
            </Text>
          )}
          <button
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            disabled={offset === 0 || loading}
            className={btn}
          >
            Prev
          </button>
          <button
            onClick={() => setOffset((o) => o + LIMIT)}
            disabled={offset + LIMIT >= total || loading}
            className={btn}
          >
            Next
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className={`max-h-80 overflow-y-auto pr-1 space-y-2 ${loading ? "opacity-50" : ""}`}
      >
        {data?.pairs.map((p, i) => (
          <div
            key={`${p.d1_id}-${p.d2_id}-${i}`}
            className="flex flex-col md:flex-row gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
          >
            <RecordSide title="Dataset 1" id={p.d1_id} record={p.d1} />
            <RecordSide title="Dataset 2" id={p.d2_id} record={p.d2} />
          </div>
        ))}
      </div>
    </Card>
  );
}


function ExistingPairsSummary({ info }: { info: CandidatePairsInfo }) {
  const rows: [string, string][] = [["Method", METHOD_LABELS[info.method] ?? info.method]];

  if (info.method === "file" && info.source_filename) {
    rows.push(["Source file", info.source_filename]);
  }

  if (info.method === "knn_search" && info.config) {
    const c = info.config;
    if (c.metric) rows.push(["Metric", METRIC_LABELS[c.metric] ?? c.metric]);
    if (c.top_k != null) rows.push(["Top-K", String(c.top_k)]);
    if (c.tokenization) rows.push(["Tokenization", TOKENIZATION_LABELS[c.tokenization] ?? c.tokenization]);
    if ((c.tokenization === "qgrams" || c.tokenization === "qgrams_multiset") && c.q_gram_size != null) {
      rows.push(["Q-Gram Size", String(c.q_gram_size)]);
    }
  }

  if (info.num_pairs != null) rows.push(["Number of pairs", info.num_pairs.toLocaleString()]);
  if (info.created_at) rows.push(["Created", new Date(info.created_at).toLocaleString()]);

  return (
    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <Text className="font-semibold text-emerald-800 text-xs uppercase tracking-wider mb-3">
        Candidate pairs already exist for this project
      </Text>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-emerald-700">{label}</dt>
            <dd className="text-sm text-slate-800 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-amber-700">
        Generating or importing again will overwrite the existing candidate pairs.
      </p>
    </div>
  );
}

export default function CandidatePairsGenerator() {
  const [config, setConfig] = useState({
    project: "",
    filtering: "standard_blocking",
    knnMetric: "cosine",
    knnTopK: 10,
    knnTokenization: "standard",
    qGramSize: 3,
  });

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
        const res = await fetch("http://localhost:8000/api/projects");
        if (res.ok) {
            setProjects(await res.json());
        }
        } catch (err) {
        console.error("Failed to fetch projects", err);
        } finally {
        setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchProjects();
    }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === config.project),
    [projects, config.project]
  );
  const existingPairs = selectedProject?.config.candidate_pairs;

  const handleChange = (field: string, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Optional: prefill the form with the settings used previously
  const handleLoadPreviousSettings = () => {
    if (!existingPairs || existingPairs.method === "file") return;
    setConfig((prev) => ({
      ...prev,
      filtering: existingPairs.method,
      knnMetric: existingPairs.config?.metric ?? prev.knnMetric,
      knnTopK: existingPairs.config?.top_k ?? prev.knnTopK,
      knnTokenization: existingPairs.config?.tokenization ?? prev.knnTokenization,
      qGramSize: existingPairs.config?.q_gram_size ?? prev.qGramSize,
    }));
  };

  const handleGenerate = async () => {
  if (!config.project) return;
  setIsGenerating(true);
  setError(null);

  const body =
    config.filtering === "knn_search"
      ? {
          method: "knn_search",
          config: {
            metric: config.knnMetric,
            top_k: config.knnTopK,
            tokenization: config.knnTokenization,
            ...(config.knnTokenization.startsWith("qgrams") && {
              q_gram_size: config.qGramSize,
            }),
          },
        }
      : { method: "standard_blocking", config: {} };

  try {
    const res = await fetch(
      `http://localhost:8000/api/projects/${config.project}/candidate-pairs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    
    if (!res.ok) {
  const err = await res.json().catch(() => null);
  throw new Error(err?.detail ?? `Generation failed (${res.status})`);
}
    await fetchProjects(); // refresh so the summary card appears
  } catch (err) {
    setError(err instanceof Error ? err.message : "Generation failed");
  } finally {
    setIsGenerating(false);
  }
};

const handleDownload = () => {
  if (!config.project || !existingPairs) return;
  const a = document.createElement("a");
  a.href = `http://localhost:8000/api/projects/${config.project}/candidate-pairs/download`;
  a.download = `${config.project}_candidate_pairs.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  event.target.value = ""; // lets you re-select the same file later
  if (!file) return;

  if (!config.project) {
    setError("Select a project before importing.");
    return;
  }
  if (existingPairs && !confirm("This will overwrite the existing candidate pairs. Continue?")) {
    return;
  }

  setIsImporting(true);
  setError(null);
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("has_header", "true");

    const res = await fetch(
      `http://localhost:8000/api/projects/${config.project}/candidate-pairs/import`,
      { method: "POST", body: form }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ?? `Import failed (${res.status})`);
    }
    await fetchProjects(); // refresh so the summary card shows "Imported from file"
  } catch (err) {
    setError(err instanceof Error ? err.message : "Import failed");
  } finally {
    setIsImporting(false);
  }
};

  const inputCls =
    "w-full text-sm rounded-md border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none";
  const selectCls =
    "w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Title className="text-xl">Generate Candidate Pairs</Title>
          <Text>
            Configure workflow settings to generate pairs for your project, or import an existing configuration.
          </Text>
        </div>
      </div>

      <Card className="p-5">
        <Text className="font-semibold text-slate-800 text-sm mb-4">General Configuration</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Project *</label>
            <select
              value={config.project}
              onChange={(e) => handleChange("project", e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>-- Choose a project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.config.project_name}
                  {p.config.candidate_pairs ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Workflow *</label>
            <select
              value={config.filtering}
              onChange={(e) => handleChange("filtering", e.target.value)}
              className={selectCls}
            >
              <option value="standard_blocking">Standard Blocking</option>
              <option value="knn_search">KNN-Search</option>
            </select>
          </div>
        </div>

        {existingPairs && (
          <>
            <ExistingPairsSummary info={existingPairs} />
            {existingPairs.method !== "file" && (
              <button
                onClick={handleLoadPreviousSettings}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                Load these settings into the form
              </button>
            )}
          </>
        )}

        {config.filtering === "knn_search" && (
          <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <Text className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-3">
              KNN Parameters
            </Text>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Metric</label>
                <select
                  value={config.knnMetric}
                  onChange={(e) => handleChange("knnMetric", e.target.value)}
                  className={inputCls}
                >
                  <option value="cosine">Cosine Similarity</option>
                  <option value="dice">Dice Similarity</option>
                  <option value="Jaccard">Jaccard Similarity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Top-K</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.knnTopK}
                  onChange={(e) => handleChange("knnTopK", parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tokenization</label>
                <select
                  value={config.knnTokenization}
                  onChange={(e) => handleChange("knnTokenization", e.target.value)}
                  className={inputCls}
                >
                  <option value="standard">Standard Tokenization</option>
                  <option value="qgrams">Q-Grams</option>
                  <option value="standard_multiset">Standard Multiset</option>
                  <option value="qgrams_multiset">Q-Grams Multiset</option>
                </select>
              </div>

              {(config.knnTokenization === "qgrams" || config.knnTokenization === "qgrams_multiset") && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Q-Gram Size</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={config.qGramSize}
                    onChange={(e) => handleChange("qGramSize", parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
      {existingPairs && config.project && (
  <PairsPreview projectId={config.project} refreshKey={existingPairs.created_at} />
)}

      {error && <p className="text-sm text-red-600 text-right">{error}</p>}

<div className="flex justify-end space-x-3 pt-2">
  <div>
    <input
      type="file"
      ref={fileInputRef}
      className="hidden"
      onChange={handleFileChange}
      accept=".csv,.json,.txt"
    />
    <button
  onClick={handleImportClick}
  disabled={isImporting}
  className="px-5 py-2.5 text-sm font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
>
  {isImporting ? "Importing..." : "Import Existing File"}
</button>
  </div>

  <button
    onClick={handleDownload}
    disabled={!existingPairs}
    className="px-5 py-2.5 text-sm font-medium rounded-lg text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Download File
  </button>

  <button
    onClick={handleGenerate}
    disabled={!config.project || isGenerating}
    className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isGenerating ? "Generating..." : "Generate"}
  </button>
</div>
    </div>
  );
}