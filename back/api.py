from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json

app = FastAPI()

DATASET_1_PATH = "temp_dataset_1.parquet"
DATASET_2_PATH = "temp_dataset_2.parquet"
GROUND_TRUTH_PATH = "temp_ground_truth.parquet"


@app.post("/upload_dataset_1")
async def upload_file(file: UploadFile = File(...),
                separator: str = Form(default=',')):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")


    try:
        # 2. Read the file contents asynchronously
        contents = await file.read()

        # 3. Load the contents into a Pandas DataFrame
        # io.BytesIO is used to convert the raw bytes into a file-like object Pandas can read
        df = pd.read_csv(io.BytesIO(contents), sep=separator)

        # --- You can add your data processing logic here ---

        # 4. Return some summary statistics or a preview

        df.to_parquet(DATASET_1_PATH, index=False)  # Save the DataFrame to a Parquet file

        preview_json = json.loads(df.head(3).to_json(orient="records"))  # Convert the first 3 rows to JSON

        return {
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        }

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")

@app.post("/upload_dataset_2")
async def upload_file(file: UploadFile = File(...),
                separator: str = Form(default=',')):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")


    try:
        # 2. Read the file contents asynchronously
        contents = await file.read()

        # 3. Load the contents into a Pandas DataFrame
        # io.BytesIO is used to convert the raw bytes into a file-like object Pandas can read
        df = pd.read_csv(io.BytesIO(contents), sep=separator)

        # --- You can add your data processing logic here ---

        # 4. Return some summary statistics or a preview

        df.to_parquet(DATASET_2_PATH, index=False)  # Save the DataFrame to a Parquet file

        preview_json = json.loads(df.head(3).to_json(orient="records"))  # Convert the first 3 rows to JSON

        return {
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        }

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")

@app.post("/upload_ground_truth")
async def upload_file(file: UploadFile = File(...),
                separator: str = Form(default=',')):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")


    try:
        # 2. Read the file contents asynchronously
        contents = await file.read()

        # 3. Load the contents into a Pandas DataFrame
        # io.BytesIO is used to convert the raw bytes into a file-like object Pandas can read
        df = pd.read_csv(io.BytesIO(contents), sep=separator)

        # --- You can add your data processing logic here ---

        # 4. Return some summary statistics or a preview

        df.to_parquet(GROUND_TRUTH_PATH, index=False)  # Save the DataFrame to a Parquet file

        preview_json = json.loads(df.head(3).to_json(orient="records"))  # Convert the first 3 rows to JSON

        return {
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        }

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")