from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import json
import re
from typing import Optional

app = FastAPI()

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
    d1_maxRows: Optional[int] = Form(None),
    d2_maxRows: Optional[int] = Form(None),
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
            "id": d1_id_column, "attributes": json.loads(d1_attributes), "maxrows": d1_maxRows
            },
        "d2": {
            "path": d2_saved_path, "separator": d2_separator,
            "filename": d2_file.filename, "id": d2_id_column,
            "attributes": json.loads(d2_attributes), "maxrows": d2_maxRows
            } if d2_saved_path else None,
        "gt": {"path": gt_saved_path, "separator": gt_separator, "filename": gt_file.filename} if gt_saved_path else None
    }

    with open(os.path.join(project_path, "config.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)

    return {"status": "success", "project": metadata}