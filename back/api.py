import os

from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json
import pickle
from pyjedai.datamodel import Data

app = FastAPI()

DATASET_1_PATH = "temp_dataset_1.parquet"
DATASET_2_PATH = "temp_dataset_2.parquet"
GROUND_TRUTH_PATH = "temp_ground_truth.parquet"

PYJEDAI_DATA_PICKLE = "pyjedai_data.pkl"

# Define the origins that are allowed to make requests to your backend
origins = [
    "http://localhost:5173", # Default Vite port
    "http://localhost:3000", # Default Create-React-App port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Allows your React app origin
    allow_credentials=True,
    allow_methods=["*"],              # Allows all HTTP methods (POST, GET, etc.)
    allow_headers=["*"],              # Allows all headers
)


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

        return JSONResponse(content={
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        })

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")

@app.post("/upload_dataset_2")
async def upload_file_2(file: UploadFile = File(...),
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

        return  JSONResponse(content={
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        })

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")

@app.post("/upload_ground_truth")
async def upload_file_ground_truth(file: UploadFile = File(...),
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

        return JSONResponse(content={
            "message": "DataFrame loaded successfully!",
            "filename": file.filename,
            "separator": separator,
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "preview": preview_json
        })

    except Exception as e:
        # Handle cases where the CSV is malformed
        raise HTTPException(status_code=500, detail=f"There was an error parsing the file: {str(e)}")


@app.post("/pyjedai/load_data")
async def create_datamodel_pyjedai(
        id_1: str = Form(default=None),
        attributes_1: list = Form(default=None),
        id_2: str = Form(default=None),
        attributes_2: list = Form(default=None),
):

    df_1 = pd.read_parquet(DATASET_1_PATH)

    if os.path.exists(DATASET_2_PATH):
        df_2 = pd.read_parquet(DATASET_2_PATH)
    else:
        df_2 = None

    if os.path.exists(GROUND_TRUTH_PATH):
        df_ground_truth = pd.read_parquet(GROUND_TRUTH_PATH)
    else:
        df_ground_truth = None

    data = Data(
        dataset_1=df_1,
        dataset_2=df_2,
        ground_truth=df_ground_truth,
        id_column_name_1=id_1,
        attributes_1=attributes_1,
        id_column_name_2=id_2,
        attributes_2=attributes_2
    )


    with open(PYJEDAI_DATA_PICKLE, 'wb+') as f:
        pickle.dump(data, f)

    return JSONResponse(content={"message": "DataModel created and saved successfully!"})