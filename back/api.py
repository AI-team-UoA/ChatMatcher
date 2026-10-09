import csv
import time
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from pathlib import Path
import os
import shutil
import json
import re
import numpy as np
from typing import Optional, List, Literal, Iterable
from functools import lru_cache

from pyjedai.datamodel import Data
from pyjedai.block_building import StandardBlocking
from pyjedai.block_cleaning import BlockFiltering
from pyjedai.comparison_cleaning import WeightedEdgePruning

from pyjedai.joins import TopKJoin

app = FastAPI()

PROJECTS_DIR = Path.cwd() / "local_storage" / "projects"
METADATA_FILE = "config.json"
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
PAIRS_FILE = "candidate_pairs.csv"

# Crucial: Allow Vite/React to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory on your machine to store datasets
STORAGE_DIR = "local_storage/projects"
os.makedirs(STORAGE_DIR, exist_ok=True)

# --- Pydantic Models for the Update payload ---
class UpdateFileConfig(BaseModel):
    separator: str
    id_column: Optional[str] = ""
    attributes: Optional[List[str]] = []
    max_rows: Optional[int] = None

class UpdateGTSettings(BaseModel):
    separator: str

class UpdateProjectPayload(BaseModel):
    d1: UpdateFileConfig
    d2: Optional[UpdateFileConfig] = None
    gt: Optional[UpdateGTSettings] = None


class KnnConfig(BaseModel):
    metric: Literal["cosine", "dice", "Jaccard"] = "cosine"
    top_k: int = Field(10, ge=1, le=100)
    tokenization: Literal["standard", "qgrams", "standard_multiset", "qgrams_multiset"] = "standard"
    q_gram_size: Optional[int] = Field(None, ge=1, le=12)


class GenerateRequest(BaseModel):
    method: Literal["standard_blocking", "knn_search"]
    config: Optional[KnnConfig] = None  # only used for knn_search

# --- DELETE Endpoint ---
@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    project_path = os.path.join(STORAGE_DIR, project_id)
    if os.path.exists(project_path):
        shutil.rmtree(project_path)
        return {"status": "success", "message": "Project deleted."}
    raise HTTPException(status_code=404, detail="Project not found.")

# --- PUT (Update) Endpoint ---
@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    project_name: str = Form(...),
    description: str = Form(""),
    d1_separator: str = Form(","),
    d1_id_column: str = Form(""),
    d1_attributes: str = Form("[]"),
    d1_max_rows: Optional[int] = Form(None),
    d1_file: Optional[UploadFile] = File(None),

    d2_separator: Optional[str] = Form(None),
    d2_id_column: Optional[str] = Form(None),
    d2_attributes: Optional[str] = Form("[]"),
    d2_max_rows: Optional[int] = Form(None),
    d2_file: Optional[UploadFile] = File(None),

    gt_separator: Optional[str] = Form(None),
    gt_file: Optional[UploadFile] = File(None)
):
    project_path = os.path.join(STORAGE_DIR, project_id)
    config_path = os.path.join(project_path, "config.json")

    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Project not found.")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Helper function to save a newly uploaded file and remove the old one if it existed
    def replace_file(upload_file: UploadFile, prefix: str, existing_config: dict):
        # Remove old file if it exists
        if existing_config and "path" in existing_config:
            if os.path.exists(existing_config["path"]):
                os.remove(existing_config["path"])

        # Save new file
        file_path = os.path.join(project_path, f"{prefix}_{upload_file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return file_path, upload_file.filename

    # --- Update Title & Description ---
    config["project_name"] = project_name
    config["description"] = description

    # --- Update D1 ---
    if d1_file:
        new_path, new_name = replace_file(d1_file, "d1", config.get("d1"))
        config["d1"]["path"] = new_path
        config["d1"]["filename"] = new_name

    config["d1"].update({
        "separator": d1_separator,
        "id": d1_id_column,
        "attributes": json.loads(d1_attributes),
        "maxrows": d1_max_rows
    })

    # --- Update D2 ---
    if d2_file or config.get("d2"):
        if not config.get("d2"):
            config["d2"] = {} # Initialize if adding D2 for the first time

        if d2_file:
            new_path, new_name = replace_file(d2_file, "d2", config.get("d2"))
            config["d2"]["path"] = new_path
            config["d2"]["filename"] = new_name

        # If D2 data was sent from the frontend, update it
        if d2_separator is not None:
            config["d2"].update({
                "separator": d2_separator,
                "id": d2_id_column,
                "attributes": json.loads(d2_attributes),
                "maxrows": d2_max_rows
            })

        config["mode"] = "Record Linkage" # Since D2 exists
    else:
        config["mode"] = "Deduplication"

    # --- Update GT ---
    if gt_file or config.get("gt"):
        if not config.get("gt"):
            config["gt"] = {} # Initialize if adding GT for the first time

        if gt_file:
            new_path, new_name = replace_file(gt_file, "gt", config.get("gt"))
            config["gt"]["path"] = new_path
            config["gt"]["filename"] = new_name

        if gt_separator is not None:
            config["gt"]["separator"] = gt_separator

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)

    return {"status": "success", "project": config}

@app.get("/api/projects")
async def list_projects():
    projects = []
    if os.path.exists(STORAGE_DIR):
        for folder_name in os.listdir(STORAGE_DIR):
            config_path = os.path.join(STORAGE_DIR, folder_name, "config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    try:
                        config = json.load(f)
                        projects.append({"id": folder_name, "config": config})
                    except Exception:
                        pass
    return projects

@app.get("/api/projects/{project_id}/file/{prefix}")
async def get_project_file(project_id: str, prefix: str):
    config_path = os.path.join(STORAGE_DIR, project_id, "config.json")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Project not found.")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    if prefix not in ["d1", "d2", "gt"] or not config.get(prefix):
        raise HTTPException(status_code=404, detail="File prefix missing.")

    file_path = config[prefix]["path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Underlying file not found.")

    return FileResponse(file_path)


# --- 3. Update an Existing Project Configuration ---
@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, payload: UpdateProjectPayload):
    config_path = os.path.join(STORAGE_DIR, project_id, "config.json")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Project not found.")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Update D1
    config["d1"].update({
        "separator": payload.d1.separator,
        "id": payload.d1.id_column,
        "attributes": payload.d1.attributes,
        "maxrows": payload.d1.max_rows
    })

    # Update D2 if it exists
    if payload.d2 and config.get("d2"):
        config["d2"].update({
            "separator": payload.d2.separator,
            "id": payload.d2.id_column,
            "attributes": payload.d2.attributes,
            "maxrows": payload.d2.max_rows
        })

    # Update GT if it exists
    if payload.gt and config.get("gt"):
        config["gt"].update({
            "separator": payload.gt.separator
        })

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)

    return {"status": "success", "project": config}

@app.post("/api/projects/upload")
async def create_matching_project(
    project_name: str = Form(...),
    description: str = Form(""),
    d1_separator: str = Form(","),
    d1_id_column: str = Form(""),
    d1_attributes: str = Form("[]"), # Receives the JSON string
    d2_separator: str = Form(","),
    d2_id_column: str = Form(""),
    d2_attributes: str = Form("[]"),
    gt_separator: str = Form(","),
    d1_file: UploadFile = File(...),
    d1_max_rows: Optional[int] = Form(None),
    d2_max_rows: Optional[int] = Form(None),
    d2_file: Optional[UploadFile] = File(None),
    gt_file: Optional[UploadFile] = File(None)

):
    # 1. Sanitize the project name for safe folder creation
    safe_folder_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', project_name).lower()
    project_path = os.path.join(STORAGE_DIR, safe_folder_name)

    if os.path.exists(project_path):
        raise HTTPException(status_code=400, detail="A project with this name already exists.")

    os.makedirs(project_path)

    # 2. Helper function to stream file chunks to disk (prevents RAM crashes on huge files)
    def save_file_to_disk(upload_file: UploadFile, prefix: str):
        if not upload_file:
            return None
        file_path = os.path.join(project_path, f"{prefix}_{upload_file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return file_path

    # 3. Save the uploaded files
    d1_saved_path = save_file_to_disk(d1_file, "d1")
    d2_saved_path = save_file_to_disk(d2_file, "d2")
    gt_saved_path = save_file_to_disk(gt_file, "gt")

    # 4. Generate and save a metadata config
    metadata = {
        "project_name": project_name,
        "description": description,
        "mode": "Record Linkage" if d2_saved_path else "Deduplication",
        "d1": {
            "path": d1_saved_path, "separator": d1_separator, "filename": d1_file.filename,
            "id": d1_id_column, "attributes": json.loads(d1_attributes), "maxrows": d1_max_rows
            },
        "d2": {
            "path": d2_saved_path, "separator": d2_separator,
            "filename": d2_file.filename, "id": d2_id_column,
            "attributes": json.loads(d2_attributes), "maxrows": d2_max_rows
            } if d2_saved_path else None,
        "gt": {"path": gt_saved_path, "separator": gt_separator, "filename": gt_file.filename} if gt_saved_path else None
    }

    with open(os.path.join(project_path, "config.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)

    return {"status": "success", "project": metadata}




def project_dir(project_id: str) -> Path:
    if not ID_PATTERN.fullmatch(project_id):
        raise HTTPException(400, "Invalid project id")
    folder = PROJECTS_DIR / project_id
    if not folder.is_dir():
        raise HTTPException(404, "Project not found")
    return folder


def read_metadata(folder: Path) -> dict:
    with open(folder / METADATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def write_metadata(folder: Path, metadata: dict) -> None:
    # write to a temp file, then swap, so a crash can't corrupt the metadata
    target = folder / METADATA_FILE
    tmp = target.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    tmp.replace(target)


def run_candidate_pairs(metadata: dict, method: str, params: dict) -> Iterable[tuple[str, str]]:
    """
    YOUR TOOL LOGIC GOES HERE.

    Inputs:
      metadata -> project config (d1/d2 paths, separators, id column, attributes)
      method   -> "standard_blocking" or "knn_search"
      params   -> {} for standard_blocking, or
                  {"metric", "top_k", "tokenization", "q_gram_size"} for knn_search

    Return an iterable of (d1_id, d2_id) tuples.
    """

    datamodel_kwargs = {}



    dataset_1 = pd.read_csv(metadata["d1"]["path"], sep=metadata["d1"]["separator"], nrows=metadata["d1"].get("maxrows"))

    datamodel_kwargs['dataset_1'] = dataset_1
    datamodel_kwargs['id_column_name_1'] = metadata["d1"]["id"]
    datamodel_kwargs['attributes_1'] = metadata["d1"]["attributes"]
    datamodel_kwargs['dataset_name_1'] = metadata["d1"].get("filename", "Dataset 1")


    if metadata.get("d2"):
        dataset_2 = pd.read_csv(metadata["d2"]["path"], sep=metadata["d2"]["separator"], nrows=metadata["d2"].get("maxrows"))
        datamodel_kwargs['dataset_2'] = dataset_2
        datamodel_kwargs['id_column_name_2'] = metadata["d2"]["id"]
        datamodel_kwargs['attributes_2'] = metadata["d2"]["attributes"]
        datamodel_kwargs['dataset_name_2'] = metadata["d2"].get("filename", "Dataset 2")

    if metadata.get("gt"):
        ground_truth = pd.read_csv(metadata["gt"]["path"], sep=metadata["gt"]["separator"])
        datamodel_kwargs['ground_truth'] = ground_truth

    data = Data(**datamodel_kwargs)

    if method not in ("standard_blocking", "knn_search"):
        raise ValueError(f"Unknown method: {method}")

    if method == "knn_search":
        metric = params.get("metric", "cosine")
        k = params.get("top_k", 10)
        tokenization = params.get("tokenization", "standard")
        q = params.get("q_gram_size", 2) if tokenization.startswith("qgrams") else 2

        topkjoin = TopKJoin(metric=metric, K=k, tokenization=tokenization, qgrams=q)
        graph = topkjoin.fit(data)

        df = topkjoin.export_to_df(graph)
    else:
        st = StandardBlocking()
        blocks = st.build_blocks(data)

        block_cleaning = BlockFiltering(ratio=0.9)
        cleaned_blocks = block_cleaning.process(blocks, data)

        wep = WeightedEdgePruning(weighting_scheme='EJS')
        cc_blocks = wep.process(cleaned_blocks, data)

        df = wep.export_to_df(cc_blocks)

    pairs = df.iloc[:, :2].copy()
    pairs.columns = ['d1_id', 'd2_id']
    return pairs




# ---------- endpoints ----------
# Plain `def` (not `async def`) so FastAPI runs these in a threadpool
# and a long generation doesn't block the event loop.

@app.post("/api/projects/{project_id}/candidate-pairs")
def generate_candidate_pairs(project_id: str, req: GenerateRequest):
    folder = project_dir(project_id)
    metadata = read_metadata(folder)

    if req.method == "knn_search":
        knn = req.config or KnnConfig()
        params = knn.model_dump(exclude_none=True)
        if not knn.tokenization.startswith("qgrams"):
            params.pop("q_gram_size", None)
    else:
        params = {}

    pairs_path = folder / PAIRS_FILE
    tmp_path = pairs_path.with_suffix(".csv.tmp")

    try:
        t = time.perf_counter()
        pairs_df = run_candidate_pairs(metadata, req.method, params)
        pairs_df.to_csv(tmp_path, index=False)
        num_pairs = len(pairs_df)
        tmp_path.replace(pairs_path)
        print(f"[pairs] written {num_pairs} rows, total {time.perf_counter() - t:.2f}s")
    except NotImplementedError:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(501, "Candidate pair generation is not implemented yet")
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Generation failed: {e}")

    metadata["candidate_pairs"] = {
        "method": req.method,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "path": pairs_path.as_posix(),
        "num_pairs": num_pairs,
        "config": params,
    }
    write_metadata(folder, metadata)

    return metadata["candidate_pairs"]


@app.get("/api/projects/{project_id}/candidate-pairs/download")
def download_candidate_pairs(project_id: str):
    folder = project_dir(project_id)
    pairs_path = folder / PAIRS_FILE
    if not pairs_path.is_file():
        raise HTTPException(404, "No candidate pairs for this project")
    return FileResponse(
        pairs_path,
        media_type="text/csv",
        filename=f"{project_id}_candidate_pairs.csv",
    )

@app.post("/api/projects/{project_id}/candidate-pairs/import")
def import_candidate_pairs(
    project_id: str,
    file: UploadFile = File(...),
    has_header: bool = Form(True),
):
    folder = project_dir(project_id)
    metadata = read_metadata(folder)

    pairs_path = folder / PAIRS_FILE
    raw_path = folder / "candidate_pairs.upload.tmp"
    tmp_path = pairs_path.with_suffix(".csv.tmp")

    try:
        # 1. Stream the upload to disk
        with open(raw_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        # 2. Detect the separator from the first few KB
        with open(raw_path, "r", encoding="utf-8-sig", errors="replace") as f:
            sample = f.read(8192)
        try:
            sep = csv.Sniffer().sniff(sample, delimiters=",;|\t").delimiter
        except csv.Error:
            sep = ","

        # 3. Read as strings so ids like "007" are not turned into numbers
        df = pd.read_csv(
            raw_path,
            sep=sep,
            dtype=str,
            header=0 if has_header else None,
            encoding="utf-8-sig",
        )
        if df.shape[1] < 2:
            raise ValueError("File needs at least two columns (d1 id, d2 id)")

        # 4. Keep the first two columns, normalize, drop junk/duplicates
        pairs = df.iloc[:, :2].copy()
        pairs.columns = ["d1_id", "d2_id"]
        pairs = pairs.dropna().drop_duplicates()
        if pairs.empty:
            raise ValueError("No valid pairs found in the file")

        # 5. Optional sanity check: ids should exist in the project's datasets
        d1 = metadata["d1"]
        ids1 = pd.read_csv(d1["path"], sep=d1["separator"], usecols=[d1["id"]], dtype=str)[d1["id"]]
        match_rate = pairs["d1_id"].isin(set(ids1)).mean()
        if match_rate < 0.5:
            raise ValueError(
                f"Only {match_rate:.0%} of d1_id values exist in Dataset 1. "
                "Check the column order or the header setting."
            )

        pairs.to_csv(tmp_path, index=False)
        tmp_path.replace(pairs_path)
    except HTTPException:
        raise
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Import failed: {e}")
    finally:
        raw_path.unlink(missing_ok=True)

    metadata["candidate_pairs"] = {
        "method": "file",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "path": pairs_path.as_posix(),
        "num_pairs": len(pairs),
        "source_filename": file.filename,
    }
    write_metadata(folder, metadata)
    return metadata["candidate_pairs"]


@lru_cache(maxsize=8)
def _load_records(path: str, sep: str, id_col: str, attrs: tuple, maxrows, mtime: float):
    # mtime is part of the cache key, so replacing a file invalidates the cache
    cols = list(dict.fromkeys([id_col, *attrs]))
    df = pd.read_csv(path, sep=sep, dtype=str, usecols=cols, nrows=maxrows).fillna("")
    return df.drop_duplicates(subset=id_col).set_index(id_col)


def _records_for(ds: dict) -> pd.DataFrame:
    p = Path(ds["path"])
    return _load_records(
        str(p), ds["separator"], ds["id"], tuple(ds["attributes"]),
        ds.get("maxrows"), p.stat().st_mtime,
    )


@app.get("/api/projects/{project_id}/candidate-pairs/preview")
def preview_candidate_pairs(
    project_id: str,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    folder = project_dir(project_id)
    metadata = read_metadata(folder)
    pairs_path = folder / PAIRS_FILE
    if not pairs_path.is_file():
        raise HTTPException(404, "No candidate pairs for this project")

    # skip `offset` data rows but keep the header
    pairs = pd.read_csv(
        pairs_path, dtype=str, skiprows=range(1, offset + 1), nrows=limit
    )

    d1_cfg = metadata["d1"]
    d2_cfg = metadata.get("d2") or d1_cfg   # deduplication: both sides come from d1
    d1 = _records_for(d1_cfg)
    d2 = d1 if d2_cfg is d1_cfg else _records_for(d2_cfg)

    def lookup(df: pd.DataFrame, attrs: list, rid: str):
        if rid not in df.index:
            return None
        return {a: df.at[rid, a] for a in attrs}

    rows = []
    for id1, id2 in pairs.iloc[:, :2].itertuples(index=False):
        rows.append({
            "d1_id": id1,
            "d2_id": id2,
            "d1": lookup(d1, d1_cfg["attributes"], id1),
            "d2": lookup(d2, d2_cfg["attributes"], id2),
        })

    return {
        "total": metadata.get("candidate_pairs", {}).get("num_pairs", 0),
        "offset": offset,
        "limit": limit,
        "pairs": rows,
    }


EXAMPLES_FILE = "examples.json"


class ExampleItem(BaseModel):
    d1_id: str
    d2_id: str
    label: bool


class SaveExamplesRequest(BaseModel):
    examples: List[ExampleItem]


@app.get("/api/projects/{project_id}/examples/pairs")
def examples_pairs(
    project_id: str,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    folder = project_dir(project_id)
    metadata = read_metadata(folder)

    d1_cfg = metadata["d1"]
    dedup = not metadata.get("d2")
    d2_cfg = d1_cfg if dedup else metadata["d2"]
    d1 = _records_for(d1_cfg)
    d2 = d1 if dedup else _records_for(d2_cfg)

    pairs_path = folder / PAIRS_FILE
    if pairs_path.is_file():
        # Candidate pairs exist: page through the file
        source = "candidate_pairs"
        total = metadata.get("candidate_pairs", {}).get("num_pairs", 0)
        df = pd.read_csv(pairs_path, dtype=str, skiprows=range(1, offset + 1), nrows=limit)
        id_pairs = list(df.iloc[:, :2].itertuples(index=False, name=None))
    else:
        # No candidate pairs: page through ALL possible pairs without building them.
        # Each page position is computed arithmetically from its offset.
        source = "all_pairs"
        n1, n2 = len(d1), len(d2)
        if dedup:
            total = n1 * (n1 - 1) // 2
            r = np.arange(n1, dtype=np.int64)
            starts = r * (2 * n1 - r - 1) // 2      # first pair index of each row i
            idx = []
            for k in range(offset, min(offset + limit, total)):
                i = int(np.searchsorted(starts, k, side="right")) - 1
                idx.append((i, i + 1 + (k - int(starts[i]))))
        else:
            total = n1 * n2
            idx = [(k // n2, k % n2) for k in range(offset, min(offset + limit, total))]
        id_pairs = [(d1.index[i], d2.index[j]) for i, j in idx]

    def lookup(df, attrs, rid):
        if rid not in df.index:
            return None
        return {a: df.at[rid, a] for a in attrs}

    return {
        "source": source,
        "total": total,
        "offset": offset,
        "limit": limit,
        "pairs": [
            {
                "d1_id": a,
                "d2_id": b,
                "d1": lookup(d1, d1_cfg["attributes"], a),
                "d2": lookup(d2, d2_cfg["attributes"], b),
            }
            for a, b in id_pairs
        ],
    }


@app.get("/api/projects/{project_id}/examples")
def get_examples(project_id: str):
    folder = project_dir(project_id)
    path = folder / EXAMPLES_FILE
    if not path.is_file():
        return {"examples": []}
    with open(path, encoding="utf-8") as f:
        return {"examples": json.load(f)}


@app.put("/api/projects/{project_id}/examples")
def save_examples(project_id: str, req: SaveExamplesRequest):
    folder = project_dir(project_id)
    metadata = read_metadata(folder)

    # de-duplicate by (d1_id, d2_id); the last one wins
    unique = {(e.d1_id, e.d2_id): e for e in req.examples}
    examples = [e.model_dump() for e in unique.values()]

    path = folder / EXAMPLES_FILE
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(examples, f, indent=2, ensure_ascii=False)
    tmp.replace(path)

    metadata["examples"] = {
        "path": path.as_posix(),
        "num_true": sum(1 for e in examples if e["label"]),
        "num_false": sum(1 for e in examples if not e["label"]),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    write_metadata(folder, metadata)
    return metadata["examples"]