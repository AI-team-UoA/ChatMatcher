import React, { useState } from "react";
import {
  Card,
  Title,
  Text,
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";

interface FileConfig {
  file: File | null;
  rawText: string;
  separator: string;
  headers: string[];
  previewRows: string[][];
  totalRowsEstimate: number;
  // New state for ER configuration
  idColumn: string;
  selectedAttributes: string[];
  maxRows: number; // <-- New property for max rows to process
}

const emptyFileConfig = (): FileConfig => ({
  file: null,
  rawText: "",
  separator: ",",
  headers: [],
  previewRows: [],
  totalRowsEstimate: 0,
  idColumn: "",
  selectedAttributes: [],
  maxRows: 0,
});

export default function NewMatchingProject({ onCancel }: { onCancel?: () => void }) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");

  const [d1, setD1] = useState<FileConfig>(emptyFileConfig());
  const [d2, setD2] = useState<FileConfig>(emptyFileConfig());
  const [gt, setGt] = useState<FileConfig>(emptyFileConfig());

  const [activePreview, setActivePreview] = useState<"d1" | "d2" | "gt">("d1");

  const autoDetectSeparator = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return ",";

    const firstLine = lines[0];
    const separators = [",", ";", "\t", "|", "#"];
    let maxCols = 0;
    let detected = ",";

    separators.forEach((sep) => {
      const count = firstLine.split(sep).length;
      if (count > maxCols) {
        maxCols = count;
        detected = sep;
      }
    });
    return detected;
  };

  const parseContent = (text: string, sep: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], previewRows: [], totalRowsEstimate: 0 };

    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const previewRows = lines
      .slice(1, 11)
      .map((line) => line.split(sep).map((cell) => cell.trim().replace(/^["']|["']$/g, "")));

    return {
      headers,
      previewRows,
      totalRowsEstimate: Math.max(0, lines.length - 1), // <-- Fix: Subtract 1 for the header row
    };
  };

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
        file: selectedFile,
        rawText: text,
        separator: detectedSep,
        headers: parsed.headers,
        previewRows: parsed.previewRows,
        totalRowsEstimate: parsed.totalRowsEstimate,
        // Auto-select the first column as ID, and leave attributes empty initially
        idColumn: parsed.headers.length > 0 ? parsed.headers[0] : "",
        selectedAttributes: [],
        maxRows: parsed.totalRowsEstimate, // <-- Auto-set to total rows on upload
      });
      setActivePreview(target);
    };
    reader.readAsText(selectedFile);
  };

  const handleSeparatorChange = (sep: string, target: "d1" | "d2" | "gt") => {
    const setter = target === "d1" ? setD1 : target === "d2" ? setD2 : setGt;
    const current = target === "d1" ? d1 : target === "d2" ? d2 : gt;

    if (!current.rawText) {
      setter({ ...current, separator: sep });
      return;
    }

    const parsed = parseContent(current.rawText, sep);
    setter({
      ...current,
      separator: sep,
      headers: parsed.headers,
      previewRows: parsed.previewRows,
      totalRowsEstimate: parsed.totalRowsEstimate,
      idColumn: parsed.headers.length > 0 ? parsed.headers[0] : "",
      selectedAttributes: [], // Reset selections if delimiter changes
    });
  };

  const handleMaxRowsChange = (val: number, target: "d1" | "d2" | "gt") => {
    const setter = target === "d1" ? setD1 : target === "d2" ? setD2 : setGt;
    const current = target === "d1" ? d1 : target === "d2" ? d2 : gt;

    setter({
      ...current,
      maxRows: val,
    });
  };

  const clearFile = (target: "d1" | "d2" | "gt") => {
    const setter = target === "d1" ? setD1 : target === "d2" ? setD2 : setGt;
    setter(emptyFileConfig());
  };

  // --- NEW: Toggle Logic ---
  const toggleAttribute = (headerName: string) => {
    // Ground Truth files don't need attribute selection
    if (activePreview === "gt") return;

    const setter = activePreview === "d1" ? setD1 : setD2;
    const current = activePreview === "d1" ? d1 : d2;

    // Prevent selecting the ID column as a matching attribute
    if (headerName === current.idColumn) return;

    const isSelected = current.selectedAttributes.includes(headerName);
    const newAttributes = isSelected
      ? current.selectedAttributes.filter((attr) => attr !== headerName)
      : [...current.selectedAttributes, headerName];

    setter({
      ...current,
      selectedAttributes: newAttributes,
    });
  };

  const handleIdColumnChange = (newId: string) => {
    if (activePreview === "gt") return;
    const setter = activePreview === "d1" ? setD1 : setD2;
    const current = activePreview === "d1" ? d1 : d2;

    // If the new ID was previously selected as an attribute, remove it from attributes
    const updatedAttributes = current.selectedAttributes.filter((attr) => attr !== newId);

    setter({
      ...current,
      idColumn: newId,
      selectedAttributes: updatedAttributes,
    });
  };
  // -------------------------

  const erMode = d2.file ? "Record Linkage (Clean-Clean ER)" : "Deduplication (Dirty ER)";
  const activeConfig = activePreview === "d1" ? d1 : activePreview === "d2" ? d2 : gt;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Title className="text-xl">Create Matching Task</Title>
          <Text>Configure source datasets, delimiters, and optional evaluation ground truth.</Text>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Detected Mode:</span>
          <Badge color={d2.file ? "indigo" : "amber"}>{erMode}</Badge>
          {gt.file && <Badge color="emerald">Ground Truth Active</Badge>}
        </div>
      </div>

      <Card className="p-5">
        <Text className="font-semibold text-slate-800 text-sm mb-3">Task Details</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task Name *</label>
            <input
              type="text"
              placeholder="e.g. DBLP-ACM Benchmark Linkage"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Deduplicating bibliographic citations"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <UploadSlot
          title="Dataset 1 (D₁)"
          required={true}
          description="Primary table to deduplicate or link"
          config={d1}
          onFileChange={(e) => handleFileChange(e, "d1")}
          onSeparatorChange={(sep) => handleSeparatorChange(sep, "d1")}
          onMaxRowsChange={(val) => handleMaxRowsChange(val, "d1")} // <-- Pass the new prop
          onClear={() => clearFile("d1")}
          onSelectPreview={() => setActivePreview("d1")}
          isSelected={activePreview === "d1"}
        />
        <UploadSlot
          title="Dataset 2 (D₂)"
          required={false}
          description="Secondary table for Clean-Clean Linkage"
          config={d2}
          onFileChange={(e) => handleFileChange(e, "d2")}
          onSeparatorChange={(sep) => handleSeparatorChange(sep, "d2")}
          onMaxRowsChange={(val) => handleMaxRowsChange(val, "d2")} // <-- Pass the new prop
          onClear={() => clearFile("d2")}
          onSelectPreview={() => setActivePreview("d2")}
          isSelected={activePreview === "d2"}
        />
        <UploadSlot
          title="Ground Truth (GT)"
          required={false}
          description="True match pairs for F1 scoring"
          config={gt}
          onFileChange={(e) => handleFileChange(e, "gt")}
          onSeparatorChange={(sep) => handleSeparatorChange(sep, "gt")}
          onClear={() => clearFile("gt")}
          onSelectPreview={() => setActivePreview("gt")}
          isSelected={activePreview === "gt"}
        />
      </div>

      <Card className="p-0 overflow-hidden border border-slate-200">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Previewing:</span>
            <div className="flex space-x-1.5">
              <button onClick={() => setActivePreview("d1")} className={`px-3 py-1 rounded text-xs font-medium transition ${activePreview === "d1" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                Dataset 1 {d1.file && `(${d1.headers.length} cols)`}
              </button>
              <button onClick={() => setActivePreview("d2")} disabled={!d2.file} className={`px-3 py-1 rounded text-xs font-medium transition ${!d2.file ? "opacity-40 cursor-not-allowed bg-slate-200 text-slate-500" : activePreview === "d2" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                Dataset 2 {d2.file && `(${d2.headers.length} cols)`}
              </button>
              <button onClick={() => setActivePreview("gt")} disabled={!gt.file} className={`px-3 py-1 rounded text-xs font-medium transition ${!gt.file ? "opacity-40 cursor-not-allowed bg-slate-200 text-slate-500" : activePreview === "gt" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                Ground Truth {gt.file && `(${gt.headers.length} cols)`}
              </button>
            </div>
          </div>

          {/* Config Controls shown next to preview */}
          {activeConfig.file && activePreview !== "gt" && (
             <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-xs font-medium text-slate-600">ID Column:</label>
                <select
                  value={activeConfig.idColumn}
                  onChange={(e) => handleIdColumnChange(e.target.value)}
                  className="text-xs border-none bg-slate-50 rounded px-2 py-1 focus:ring-0 cursor-pointer text-slate-700 font-medium"
                >
                  {activeConfig.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
             </div>
          )}
        </div>

        {activeConfig.file && activeConfig.headers.length > 0 ? (
          <div>
            {activePreview !== "gt" && (
              <div className="px-5 py-2 bg-indigo-50/50 border-b border-slate-200">
                <Text className="text-xs text-indigo-800">
                  <span className="font-semibold">Interactive Selection:</span> Click the column headers below to select the attributes you want the engine to use for matching.
                </Text>
              </div>
            )}

            <div className="overflow-x-auto max-h-[380px]">
              <Table>
                <TableHead className="bg-slate-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHeaderCell className="w-12 text-center text-slate-400">#</TableHeaderCell>
                    {activeConfig.headers.map((h, idx) => {
                      const isGt = activePreview === "gt";
                      const isId = h === activeConfig.idColumn && !isGt;
                      const isSelected = activeConfig.selectedAttributes.includes(h) && !isGt;

                      return (
                        <TableHeaderCell
                          key={idx}
                          onClick={() => !isGt && toggleAttribute(h)}
                          className={`transition-colors border-b-2 select-none ${
                            isGt
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : isId
                                ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
                                : isSelected
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-500 cursor-pointer"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={isSelected ? "font-bold" : "font-medium"}>{h || `Column ${idx + 1}`}</span>
                            {isId && <span className="bg-slate-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">ID</span>}
                            {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
                          </div>
                        </TableHeaderCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeConfig.previewRows.map((row, rIdx) => (
                    <TableRow key={rIdx} className="hover:bg-slate-50/80">
                      <TableCell className="text-center text-xs text-slate-400 font-mono">{rIdx + 1}</TableCell>
                      {row.map((cell, cIdx) => (
                        <TableCell key={cIdx} className="text-xs text-slate-700 truncate max-w-xs">
                          {cell || <span className="text-slate-300 italic">null</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No file loaded for this slot</p>
          </div>
        )}
      </Card>

      {/* Footer Controls */}
      <div className="flex justify-end space-x-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}

        {/* Submit Button (Always Visible) */}
        <button
          type="button"
          disabled={!projectName || !d1.file}
          className={`px-6 py-2 text-sm font-semibold rounded-lg shadow-sm text-white transition ${
            !projectName || !d1.file
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          }`}
          onClick={async () => {
            // 1. Validation
            if (d1.file && d1.selectedAttributes.length === 0) {
              alert("Warning: You haven't selected any attributes for Dataset 1. Click the table headers to select them.");
              return;
            }
            if (d2.file && d2.selectedAttributes.length === 0) {
               alert("Warning: You haven't selected any attributes for Dataset 2. Click the table headers to select them.");
               return;
            }

            // 2. Build the multipart/form-data payload
            const formData = new FormData();
            formData.append("project_name", projectName);
            formData.append("description", description);

            if (d1.file) {
              formData.append("d1_file", d1.file);
              formData.append("d1_separator", d1.separator);
              formData.append("d1_id_column", d1.idColumn);
              formData.append("d1_attributes", JSON.stringify(d1.selectedAttributes));
              formData.append("d1_max_rows", d1.maxRows.toString()); // <-- ADD THIS
            }

            if (d2.file) {
              formData.append("d2_file", d2.file);
              formData.append("d2_separator", d2.separator);
              formData.append("d2_id_column", d2.idColumn);
              formData.append("d2_attributes", JSON.stringify(d2.selectedAttributes));
              formData.append("d2_max_rows", d2.maxRows.toString()); // <-- ADD THIS
            }

            if (gt.file) {
              formData.append("gt_file", gt.file);
              formData.append("gt_separator", gt.separator);
            }

            // 3. Send to FastAPI
            try {
              const response = await fetch("http://localhost:8000/api/projects/upload", {
                method: "POST",
                body: formData,
              });

              if (!response.ok) {
                const err = await response.json();
                alert(`Upload failed: ${err.detail || 'Unknown error'}`);
                return;
              }

              const result = await response.json();
              alert(`Project "${result.project.project_name}" saved successfully to backend!`);

            } catch (error) {
              console.error("Error uploading project:", error);
              alert("Failed to connect to backend server. Is Uvicorn running?");
            }
          }}
        >
          Initialize Workflow Pipeline &rarr;
        </button>
      </div>
    </div>
  );
}

function UploadSlot({
  title,
  required,
  description,
  config,
  onFileChange,
  onSeparatorChange,
  onMaxRowsChange, // <-- Add this prop
  onClear,
  onSelectPreview,
  isSelected
}: any) {
  return (
    <Card className={`p-4 flex flex-col justify-between transition border ${isSelected ? "ring-2 ring-indigo-500 border-transparent" : "border-slate-200"}`}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Text className="font-bold text-slate-800 text-sm">
            {title} {required && <span className="text-red-500">*</span>}
          </Text>
          <span className="text-[11px] text-slate-400">{required ? "Required" : "Optional"}</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{description}</p>

        {/* Delimiter Input */}
        <div className="flex items-center space-x-2 mb-2 bg-slate-50 p-2 rounded-md border border-slate-200">
          <label className="text-xs font-medium text-slate-600">Delimiter:</label>
          <input
            type="text"
            maxLength={3}
            value={config.separator}
            onChange={(e) => onSeparatorChange(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-indigo-500 w-16 text-center"
            placeholder=","
          />
        </div>

        {/* --- NEW: Max Rows Input --- */}
        {config.file && (
          <div className="flex items-center space-x-2 mb-3 bg-slate-50 p-2 rounded-md border border-slate-200">
            <label className="text-xs font-medium text-slate-600">Max Rows:</label>
            <input
              type="number"
              min={1}
              max={config.totalRowsEstimate}
              value={config.maxRows}
              onChange={(e) => onMaxRowsChange(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-indigo-500 w-24 text-center"
            />
            <span className="text-[10px] text-slate-400">/ {config.totalRowsEstimate}</span>
          </div>
        )}

        {!config.file ? (
          <div className="border border-dashed border-slate-300 rounded-lg p-5 text-center hover:bg-slate-50 relative cursor-pointer">
            <input type="file" accept=".csv,.tsv,.txt" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <svg className="w-6 h-6 text-slate-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-xs font-medium text-slate-700">Choose file</p>
          </div>
        ) : (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 truncate max-w-[140px]">{config.file.name}</span>
              <button onClick={onClear} className="text-red-500 hover:text-red-700 font-bold ml-1">&times;</button>
            </div>
            <p className="text-slate-500 text-[11px]">{(config.file.size / 1024).toFixed(1)} KB &bull; {config.headers.length} attributes</p>
          </div>
        )}
      </div>
      {config.file && (
        <button type="button" onClick={onSelectPreview} className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 text-left underline">
          View 10-row preview &rarr;
        </button>
      )}
    </Card>
  );
}