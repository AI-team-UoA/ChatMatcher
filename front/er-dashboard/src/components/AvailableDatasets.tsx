import React, { useState, useEffect } from "react";
import {
  Card, Title, Text, Badge, Table, TableHead, TableRow,
  TableHeaderCell, TableBody, TableCell
} from "@tremor/react";

interface ServerFileConfig {
  filename: string | null;
  file?: File | null; // <-- NEW: Tracks locally uploaded replacement files
  rawText: string;
  separator: string;
  headers: string[];
  previewRows: string[][];
  totalRowsEstimate: number;
  idColumn: string;
  selectedAttributes: string[];
  maxRows: number;
}

const emptyFileConfig = (): ServerFileConfig => ({
  filename: null, file: null, rawText: "", separator: ",", headers: [],
  previewRows: [], totalRowsEstimate: 0, idColumn: "",
  selectedAttributes: [], maxRows: 0,
});

export default function AvailableProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
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

  if (editingProject) {
    return (
      <ProjectEditor
        project={editingProject}
        onClose={() => {
          setEditingProject(null);
          fetchProjects();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Title className="text-xl">Available Projects</Title>
          <Text>Select a project below to view and edit its configuration.</Text>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No projects found. Create one first!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const config = p.config;
            const isCleanClean = config.d2 !== null;
            const hasGT = config.gt !== null;
            const hasCandidatePairs = !!config.candidate_pairs;
            
            return (
              <Card
                key={p.id}
                onClick={() => setEditingProject(p)}
                role="button"
                tabIndex={0}
                className="flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-transparent hover:ring-2 hover:ring-indigo-500 text-left"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Title className="text-lg truncate pr-2 text-slate-800" title={config.project_name}>
                      {config.project_name}
                    </Title>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <Badge size="xs" color={isCleanClean ? "indigo" : "amber"}>
                        {isCleanClean ? "Clean-Clean" : "Dirty ER"}
                      </Badge>
                      {hasGT && <Badge size="xs" color="emerald">Ground Truth</Badge>}
                      {hasCandidatePairs ? (
                        <Badge size="xs" className="bg-green-100 text-green-800 ring-1 ring-green-300">Candidate Pairs Ready</Badge>
                        ) : (
                        <Badge size="xs" className="bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300">No Candidate Pairs</Badge>
                        )}

                    </div>
                  </div>

                  {config.description && (
                    <Text className="text-sm mb-4 line-clamp-2">{config.description}</Text>
                  )}

                  <div className="space-y-3 mt-4">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Dataset 1 (D₁)</p>
                      <p className="text-[11px] text-slate-500 truncate" title={config.d1.attributes.join(", ")}>
                        <span className="font-medium text-slate-600">Attrs:</span> {config.d1.attributes.length > 0 ? config.d1.attributes.join(", ") : "None selected"}
                      </p>
                    </div>

                    {isCleanClean && (
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Dataset 2 (D₂)</p>
                        <p className="text-[11px] text-slate-500 truncate" title={config.d2.attributes.join(", ")}>
                          <span className="font-medium text-slate-600">Attrs:</span> {config.d2.attributes.length > 0 ? config.d2.attributes.join(", ") : "None selected"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EDITOR COMPONENT
// ============================================================================

function ProjectEditor({ project, onClose }: { project: any, onClose: () => void }) {
  const projectId = project.id;
  const projectData = project.config;

  const [projectName, setProjectName] = useState(projectData.project_name);
  const [description, setDescription] = useState(projectData.description);

  const [d1, setD1] = useState<ServerFileConfig>(emptyFileConfig());
  const [d2, setD2] = useState<ServerFileConfig>(emptyFileConfig());
  const [gt, setGt] = useState<ServerFileConfig>(emptyFileConfig());
  const [activePreview, setActivePreview] = useState<"d1" | "d2" | "gt">("d1");
  const [isSaving, setIsSaving] = useState(false);

  const autoDetectSeparator = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return ",";
    const separators = [",", ";", "\t", "|", "#"];
    let maxCols = 0, detected = ",";
    separators.forEach((sep) => {
      if (lines[0].split(sep).length > maxCols) { maxCols = lines[0].split(sep).length; detected = sep; }
    });
    return detected;
  };

  const parseContent = (text: string, sep: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], previewRows: [], totalRowsEstimate: 0 };
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const previewRows = lines.slice(1, 11).map((line) =>
      line.split(sep).map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
    );
    return { headers, previewRows, totalRowsEstimate: Math.max(0, lines.length - 1) };
  };

  useEffect(() => {
    const loadFileConfig = async (prefix: "d1" | "d2" | "gt", pData: any) => {
      if (!pData) return emptyFileConfig();
      try {
        const res = await fetch(`http://localhost:8000/api/projects/${projectId}/file/${prefix}`);
        const text = await res.text();
        const parsed = parseContent(text, pData.separator);
        return {
          filename: pData.filename, file: null, rawText: text, separator: pData.separator,
          headers: parsed.headers, previewRows: parsed.previewRows, totalRowsEstimate: parsed.totalRowsEstimate,
          idColumn: pData.id || (parsed.headers.length > 0 ? parsed.headers[0] : ""),
          selectedAttributes: pData.attributes || [], maxRows: pData.maxrows || parsed.totalRowsEstimate,
        };
      } catch (e) {
        return emptyFileConfig();
      }
    };

    const initialize = async () => {
      setD1(await loadFileConfig("d1", projectData.d1));
      setD2(await loadFileConfig("d2", projectData.d2));
      setGt(await loadFileConfig("gt", projectData.gt));
      setActivePreview("d1");
    };
    initialize();
  }, [projectId, projectData]);

  // Handle new local file upload/replacement
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "d1" | "d2" | "gt") => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const setter = target === "d1" ? setD1 : target === "d2" ? setD2 : setGt;
      const current = target === "d1" ? d1 : target === "d2" ? d2 : gt;

      const detectedSep = autoDetectSeparator(text);
      const parsed = parseContent(text, detectedSep);

      setter({
        ...current,
        file: selectedFile,         // Tracks the local file object
        filename: selectedFile.name,// Update visual name
        rawText: text,
        separator: detectedSep,
        headers: parsed.headers,
        previewRows: parsed.previewRows,
        totalRowsEstimate: parsed.totalRowsEstimate,
        idColumn: parsed.headers.length > 0 ? parsed.headers[0] : "",
        selectedAttributes: [],
        maxRows: parsed.totalRowsEstimate,
      });
      setActivePreview(target);
    };
    reader.readAsText(selectedFile);
  };

  const handleSeparatorChange = (sep: string, target: "d1" | "d2" | "gt") => {
    const setter = target === "d1" ? setD1 : target === "d2" ? setD2 : setGt;
    const current = target === "d1" ? d1 : target === "d2" ? d2 : gt;
    if (!current.rawText) return;
    const parsed = parseContent(current.rawText, sep);
    setter({
      ...current, separator: sep, headers: parsed.headers,
      previewRows: parsed.previewRows, totalRowsEstimate: parsed.totalRowsEstimate,
      idColumn: parsed.headers.length > 0 ? parsed.headers[0] : "", selectedAttributes: [],
    });
  };

  const toggleAttribute = (headerName: string) => {
    if (activePreview === "gt") return;
    const setter = activePreview === "d1" ? setD1 : setD2;
    const current = activePreview === "d1" ? d1 : d2;
    if (headerName === current.idColumn) return;
    const newAttrs = current.selectedAttributes.includes(headerName)
      ? current.selectedAttributes.filter(a => a !== headerName)
      : [...current.selectedAttributes, headerName];
    setter({ ...current, selectedAttributes: newAttrs });
  };

  const handleIdColumnChange = (newId: string) => {
    if (activePreview === "gt") return;
    const setter = activePreview === "d1" ? setD1 : setD2;
    const current = activePreview === "d1" ? d1 : d2;
    setter({
      ...current, idColumn: newId,
      selectedAttributes: current.selectedAttributes.filter(a => a !== newId),
    });
  };

  const deleteProject = async () => {
    const confirm = window.confirm(`Are you sure you want to permanently delete "${projectName}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
      } else {
        alert("Failed to delete project.");
      }
    } catch (e) {
      alert("Server error connecting to backend.");
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);

    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("description", description);

    // Append D1
    formData.append("d1_separator", d1.separator);
    formData.append("d1_id_column", d1.idColumn);
    formData.append("d1_attributes", JSON.stringify(d1.selectedAttributes));
    formData.append("d1_max_rows", d1.maxRows.toString());
    if (d1.file) formData.append("d1_file", d1.file);

    // Append D2
    if (d2.filename || d2.file) {
      formData.append("d2_separator", d2.separator);
      formData.append("d2_id_column", d2.idColumn);
      formData.append("d2_attributes", JSON.stringify(d2.selectedAttributes));
      formData.append("d2_max_rows", d2.maxRows.toString());
      if (d2.file) formData.append("d2_file", d2.file);
    }

    // Append GT
    if (gt.filename || gt.file) {
      formData.append("gt_separator", gt.separator);
      if (gt.file) formData.append("gt_file", gt.file);
    }

    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}`, {
        method: "PUT",
        body: formData, // Sending FormData to handle file uploads
      });
      if (res.ok) {
        alert("Changes saved successfully!");
        onClose();
      } else {
        const err = await res.json();
        alert(`Failed to update project: ${err.detail || 'Unknown error'}`);
      }
    } catch (e) {
      alert("Server error.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeConfig = activePreview === "d1" ? d1 : activePreview === "d2" ? d2 : gt;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800 mb-2 flex items-center transition">
            &larr; Back to List
          </button>
          <Title className="text-xl">Editing: {projectData.project_name}</Title>
        </div>
        <button onClick={deleteProject} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium text-sm rounded-lg transition border border-red-200 shadow-sm">
          Delete Project
        </button>
      </div>

      <Card className="p-5">
        <Text className="font-semibold text-slate-800 text-sm mb-3">Task Details</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ConfigSlot
          title="Dataset 1 (D₁)"
          config={d1}
          onFileChange={(e: any) => handleFileChange(e, "d1")}
          onSeparatorChange={(sep: string) => handleSeparatorChange(sep, "d1")}
          onMaxRowsChange={(val: number) => setD1({ ...d1, maxRows: val })}
          onSelectPreview={() => setActivePreview("d1")}
          isSelected={activePreview === "d1"}
        />
        <ConfigSlot
          title="Dataset 2 (D₂)"
          config={d2}
          onFileChange={(e: any) => handleFileChange(e, "d2")}
          onSeparatorChange={(sep: string) => handleSeparatorChange(sep, "d2")}
          onMaxRowsChange={(val: number) => setD2({ ...d2, maxRows: val })}
          onSelectPreview={() => setActivePreview("d2")}
          isSelected={activePreview === "d2"}
        />
        <ConfigSlot
          title="Ground Truth (GT)"
          config={gt}
          onFileChange={(e: any) => handleFileChange(e, "gt")}
          onSeparatorChange={(sep: string) => handleSeparatorChange(sep, "gt")}
          onSelectPreview={() => setActivePreview("gt")}
          isSelected={activePreview === "gt"}
        />
      </div>

      {/* --- PREVIEW TABLE (Same as before) --- */}
      <Card className="p-0 overflow-hidden border border-slate-200">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Previewing:</span>
            <div className="flex space-x-1.5">
              <button onClick={() => setActivePreview("d1")} className={`px-3 py-1 rounded text-xs font-medium transition ${activePreview === "d1" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Dataset 1</button>
              <button onClick={() => setActivePreview("d2")} disabled={!d2.filename} className={`px-3 py-1 rounded text-xs font-medium transition ${!d2.filename ? "opacity-40" : activePreview === "d2" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Dataset 2</button>
              <button onClick={() => setActivePreview("gt")} disabled={!gt.filename} className={`px-3 py-1 rounded text-xs font-medium transition ${!gt.filename ? "opacity-40" : activePreview === "gt" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Ground Truth</button>
            </div>
          </div>
          {activeConfig.filename && activePreview !== "gt" && (
             <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-slate-600">ID Column:</label>
                <select value={activeConfig.idColumn} onChange={(e) => handleIdColumnChange(e.target.value)} className="text-xs border-none bg-white rounded px-2 py-1 shadow-sm">
                  {activeConfig.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
             </div>
          )}
        </div>
        {activeConfig.filename ? (
          <div className="overflow-x-auto max-h-[380px]">
            <Table>
              <TableHead className="bg-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHeaderCell className="w-12 text-center">#</TableHeaderCell>
                  {activeConfig.headers.map((h, idx) => {
                    const isGt = activePreview === "gt";
                    const isId = h === activeConfig.idColumn && !isGt;
                    const isSelected = activeConfig.selectedAttributes.includes(h) && !isGt;
                    return (
                      <TableHeaderCell key={idx} onClick={() => !isGt && toggleAttribute(h)}
                        className={`border-b-2 select-none ${isGt ? "bg-slate-100" : isId ? "bg-slate-200 cursor-not-allowed" : isSelected ? "bg-indigo-50 text-indigo-700 border-indigo-500 cursor-pointer" : "bg-white hover:bg-slate-50 cursor-pointer"}`}
                      >
                        <span className={isSelected ? "font-bold" : "font-medium"}>{h || `Col ${idx+1}`}</span>
                      </TableHeaderCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeConfig.previewRows.map((row, rIdx) => (
                  <TableRow key={rIdx}>
                    <TableCell className="text-center text-xs text-slate-400">{rIdx + 1}</TableCell>
                    {row.map((cell, cIdx) => (
                      <TableCell key={cIdx} className="text-xs text-slate-700 truncate max-w-xs">{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">No file loaded for this slot</div>
        )}
      </Card>

      <div className="flex justify-end space-x-3 pt-2">
        <button onClick={onClose} className="px-5 py-2 text-sm font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50">Cancel</button>
        <button onClick={saveChanges} disabled={isSaving} className={`px-6 py-2 text-sm font-semibold rounded-lg text-white transition ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

function ConfigSlot({ title, config, onFileChange, onSeparatorChange, onMaxRowsChange, onSelectPreview, isSelected }: any) {
  return (
    <Card className={`p-4 transition flex flex-col justify-between border ${isSelected ? "ring-2 ring-indigo-500 border-transparent" : "border-slate-200"}`}>
      <div>
        <Text className="font-bold text-slate-800 text-sm mb-3">{title}</Text>

        {config.filename ? (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 flex flex-col space-y-2 mb-3">
             <div className="flex justify-between items-center">
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={config.filename}>{config.filename}</p>
                  <p className="text-[10px] text-slate-500">{config.headers.length} attributes</p>
                </div>
                {/* Custom File Input for Replacement */}
                <div className="relative">
                  <button className="text-[10px] font-bold text-indigo-700 hover:bg-indigo-200 bg-indigo-100 px-2 py-1 rounded cursor-pointer pointer-events-none">
                    Replace
                  </button>
                  <input type="file" accept=".csv,.tsv,.txt" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
             </div>
             {config.file && <Badge size="xs" color="emerald">New file pending save</Badge>}
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-lg p-5 mb-3 text-center hover:bg-slate-50 relative cursor-pointer">
            <input type="file" accept=".csv,.tsv,.txt" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <p className="text-xs font-medium text-slate-700">+ Upload File</p>
          </div>
        )}

        {config.filename && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-md border border-slate-200">
              <label className="text-xs font-medium text-slate-600">Delimiter:</label>
              <input type="text" maxLength={3} value={config.separator} onChange={(e) => onSeparatorChange(e.target.value)} className="text-xs bg-white border border-slate-300 rounded px-2 py-1 w-12 text-center" />
            </div>
            {onMaxRowsChange && (
              <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                <label className="text-xs font-medium text-slate-600">Max Rows:</label>
                <input
                  type="number"
                  min={1}
                  max={config.totalRowsEstimate}
                  value={config.maxRows || ""}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === "") {
                      onMaxRowsChange(0); // Allow clearing the input temporarily
                    } else {
                      // Cap the value to the total available rows
                      let val = parseInt(rawValue, 10);
                      val = Math.min(val, config.totalRowsEstimate);
                      onMaxRowsChange(val);
                    }
                  }}
                  className="text-xs bg-white border border-slate-300 rounded px-2 py-1 w-24 text-center"
                />
                <span className="text-[10px] text-slate-400">/ {config.totalRowsEstimate}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {config.filename && (
        <button onClick={onSelectPreview} className="mt-3 text-xs font-medium text-indigo-600 hover:underline text-left">
          Preview &rarr;
        </button>
      )}
    </Card>
  );
}