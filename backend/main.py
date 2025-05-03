from fastapi import FastAPI, UploadFile, HTTPException, Request, File, Header
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import documentai_v1 as documentai
from google.cloud import storage
from google.api_core import client_options
from google.api_core.exceptions import RetryError
from google.rpc.status_pb2 import Status
from groq import Groq
import os
from dotenv import load_dotenv
import uuid
import json
import httpx
from typing import List, Dict
import asyncio
import re
import firebase_admin
from firebase_admin import credentials, auth as admin_auth
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Environment variables
load_dotenv()

# Initialize Firebase Admin only once
if not firebase_admin._apps:
    cred = credentials.Certificate(r"C:\Users\User\Desktop\pdf-to-learning-resource-analyzer\backend\credentials\einstein-ai-prod-firebase-adminsdk-fbsvc-dd7d84d7e2.json")
    firebase_admin.initialize_app(cred)

# Initialize clients
LOCATION = os.getenv('DOCUMENT_AI_LOCATION', 'us')
opts = client_options.ClientOptions(api_endpoint=f"{LOCATION}-documentai.googleapis.com")
document_ai_client = documentai.DocumentProcessorServiceClient(client_options=opts)
storage_client = storage.Client()
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# All the environment variables 
PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')
PROCESSOR_ID = os.getenv('DOCUMENT_AI_PROCESSOR_ID')
BUCKET_NAME = os.getenv('GCS_BUCKET_NAME')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
TAVILY_API_KEY = os.getenv('TAVILY_API_KEY')

# Document AI Processor
PROCESSOR_NAME = document_ai_client.processor_path(PROJECT_ID, LOCATION, PROCESSOR_ID)

bucket = storage_client.bucket(BUCKET_NAME)

app = FastAPI()

# Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "x-firebase-token"],  # <--- Ensure your custom header is allowed!
)

MAX_FILE_SIZE = 5 * 1024 * 1024

# Helper to verify Firebase ID token and get UID
async def get_uid_from_request(request: Request) -> str:
    id_token = request.headers.get("x-firebase-token")
    print(f"[AUTH DEBUG] x-firebase-token header: {id_token[:30] + '...' if id_token else None}")
    if not id_token:
        print("[AUTH DEBUG] No ID token provided in request headers.")
        raise HTTPException(status_code=401, detail="Missing ID token")
    try:
        decoded_token = admin_auth.verify_id_token(id_token)
        print(f"[AUTH DEBUG] Token decoded successfully. UID: {decoded_token.get('uid')}")
        return decoded_token["uid"]
    except Exception as e:
        print(f"[AUTH DEBUG] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid ID token")

# Upload to GCS
async def upload_to_gcs(content: bytes, filename: str, uid: str, uuid: str) -> str:
    blob_name = f"{uuid}/{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(content, content_type="application/pdf")
    return f"gs://{BUCKET_NAME}/{blob_name}"

# Process document batch
async def process_document_batch(gcs_input_uri: str) -> dict:
    try:
        # Set up GCS document
        gcs_document = documentai.GcsDocument(
            gcs_uri=gcs_input_uri,
            mime_type="application/pdf"
        )
        
        # Configure batch input
        gcs_documents = documentai.GcsDocuments(documents=[gcs_document])
        input_config = documentai.BatchDocumentsInputConfig(gcs_documents=gcs_documents)
        
        # Set up output configuration
        output_uri_prefix = f"results/{uuid.uuid4()}/"
        destination_uri = f"gs://{BUCKET_NAME}/{output_uri_prefix}"
        
        gcs_output_config = documentai.DocumentOutputConfig.GcsOutputConfig(
            gcs_uri=destination_uri
        )
        output_config = documentai.DocumentOutputConfig(gcs_output_config=gcs_output_config)
        
        # Create batch request
        request = documentai.BatchProcessRequest(
            name=PROCESSOR_NAME,
            input_documents=input_config,
            document_output_config=output_config
        )
        
        # Start batch process
        operation = document_ai_client.batch_process_documents(request)
        print(f"Started batch process operation: {operation.operation.name}")
        
        # Wait for completion with timeout
        try:
            operation.result(timeout=120)  # 2 minute timeout
        except Exception as e:
            print(f"Batch process error: {str(e)}")
            raise Exception("Document processing timed out")
        
        # Get metadata
        metadata = documentai.BatchProcessMetadata(operation.metadata)
        if metadata.state != documentai.BatchProcessMetadata.State.SUCCEEDED:
            raise Exception(f"Batch process failed: {metadata.state_message}")
        
        # Get the first process status
        if not metadata.individual_process_statuses:
            raise Exception("No processing results found")
            
        process = metadata.individual_process_statuses[0]
        matches = re.match(r"gs://(.*?)/(.*)", process.output_gcs_destination)
        if not matches:
            raise Exception(f"Invalid output destination: {process.output_gcs_destination}")
            
        output_bucket, output_prefix = matches.groups()
        
        # Get output JSON
        output_blobs = storage_client.list_blobs(output_bucket, prefix=output_prefix)
        document = None
        
        for blob in output_blobs:
            if ".json" in blob.name:
                print(f"Processing output file: {blob.name}")
                document = documentai.Document.from_json(
                    blob.download_as_bytes(),
                    ignore_unknown_fields=True
                )
                break
                
        if not document:
            raise Exception("No output document found")
        
        
        # Extract text
        return {
            "text": document.text,
            "pages": len(document.pages) if hasattr(document, 'pages') else 0
        }
        
    except Exception as e:
        print(f"Document AI Error: {str(e)}")
        raise Exception(f"Failed to process PDF: {str(e)}")

# Extracts JSON block from LLM response
def extract_json(text: str) -> str:
    match = re.search(r'```(?:json)?(.*?)```', text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()

# Extract key information using Groq LLM API
async def analyze_with_groq(text: str) -> Dict:
    try:
        prompt = f"""
        Analyze this text and extract exactly 5 main topics. For each topic, provide:
        1. Topic name (clear and concise)
        2. Brief description (1-2 sentences)
        3. Keywords (3-5 relevant search terms)

        Text: {text[:4000]}

        Format the response as JSON:
        {{
            "topics": [
                {{
                    "name": "Topic name",
                    "description": "Brief description of the topic",
                    "keywords": ["keyword1", "keyword2", "keyword3"]
                }}
            ]
        }}
        """

        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1000,
            stream=False
        )

        response = completion.choices[0].message.content
        cleaned_content = extract_json(response)
        return json.loads(cleaned_content)

    except Exception as e:
        print(f"Groq Error: {e}")
        return {
            "topics": [{
                "name": "Error analyzing text",
                "description": "Failed to process document",
                "keywords": ["error"]
            }]
        }

# Search for relevant resources using Tavily API
async def search_resources(topics: List[Dict]) -> Dict:
    try:
        all_resources = []
        
        # Search for each topic and its keywords
        for topic in topics[:5]:  # Limit to 5 topics
            topic_name = topic["name"]
            keywords = topic["keywords"]
            
            # Combine topic and keywords for better search
            search_query = f"{topic_name} {' '.join(keywords)}"
            
            headers = {
                "Authorization": f"Bearer {TAVILY_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "query": search_query,
                "search_depth": "advanced",
                "max_results": 3,  # Get top 3 results per topic
                "include_domains": [
                    "coursera.org", "udemy.com", "edx.org", 
                    "youtube.com", "github.com", "medium.com",
                    "dev.to", "arxiv.org", "scholar.google.com"
                ]
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    headers=headers,
                    json=payload
                )
                if response.status_code != 200:
                    continue
                    
                results = response.json().get("results", [])
                
                for result in results:
                    result["topic"] = topic_name
                    all_resources.append(result)
        
        # Only keep resources with score > 0.6 (60%)
        filtered_resources = [r for r in all_resources if r.get("score", 0) > 0.6]
        # Sort all resources by relevance score
        filtered_resources.sort(key=lambda x: x.get("score", 0), reverse=True)
        # Take top 10 most relevant resources
        top_resources = filtered_resources[:10]

        print("top_resources: ",top_resources)

        # Improved classification logic
        def classify_resource(r):
            url = (r.get("url") or "").lower()
            title = (r.get("title") or "").lower()
            rtype = (r.get("type") or "").lower()
            if rtype == "video" or "youtube" in url or "video" in url or "vimeo" in url:
                return "videos"
            if rtype == "course" or "course" in url or any(x in url for x in ["coursera", "udemy", "edx", "futurelearn"]):
                return "courses"
            # Default to article if not matched
            return "articles"

        grouped = {"articles": [], "videos": [], "courses": []}
        for r in top_resources:
            grouped[classify_resource(r)].append(r)
        grouped["topics"] = [t["name"] for t in topics]
        print(f"[RESOURCES] Grouped resources: {grouped}")
        return grouped
                
    except Exception as e:
        print(f"Tavily Error: {str(e)}")
        return {
            "articles": [],
            "videos": [],
            "courses": [],
            "topics": ["Error searching resources"]
        }


# --- PDF PROCESSING STATUS AND RESULTS ---
from typing import Optional

processing_status = {}  # uuid: {status: str, result: dict|None, error: str|None}

@app.post("/api/analyze-pdf")
async def analyze_pdf(request: Request, file: UploadFile):
    form = await request.form()
    uuid = form.get("uuid")
    if not uuid:
        raise HTTPException(status_code=400, detail="Missing UUID")

    # Cancel any previous task for this UUID
    if uuid in running_tasks:
        running_tasks[uuid].cancel()
        del running_tasks[uuid]
    processing_status[uuid] = {"status": "processing", "result": None, "error": None}

    if not file.content_type == "application/pdf":
        processing_status[uuid] = {"status": "failed", "result": None, "error": "Only PDF files are allowed"}
        return {"success": False, "message": "Only PDF files are allowed"}
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        processing_status[uuid] = {"status": "failed", "result": None, "error": "File size must be less than 5MB"}
        return {"success": False, "message": "File size must be less than 5MB"}
    filename = file.filename
    uid = await get_uid_from_request(request)

    async def process_pdf_task():
        try:
            gcs_uri = await upload_to_gcs(content, filename, uid, uuid)
            await asyncio.sleep(0)
            try:
                doc_result = await process_document_batch(gcs_uri)
                await asyncio.sleep(0)
            except Exception as e:
                processing_status[uuid] = {"status": "failed", "result": None, "error": f"Error processing PDF: {str(e)}"}
                return
            try:
                llm_analysis = await analyze_with_groq(doc_result["text"])
                await asyncio.sleep(0)
            except Exception as e:
                llm_analysis = {"topics": [{"name": "Error analyzing text", "description": "Failed to process document", "keywords": ["error"]}]}
            try:
                resources = await search_resources(llm_analysis["topics"])
                await asyncio.sleep(0)
            except Exception as e:
                resources = {"articles": [], "videos": [], "courses": [], "topics": ["Error searching resources"]}
            print(f"[PROCESSING] Extracted topics for {uuid}: {llm_analysis['topics']}")
            print(f"[PROCESSING] Extracted resources for {uuid}: {resources}")
            result_dict = {
                "filename": filename,
                "analysis": {
                    "text": doc_result["text"],
                    "pages": doc_result["pages"],
                    "topics": llm_analysis["topics"],
                    "resources": resources
                }
            }
            print(f"[PROCESSING] Saving result for {uuid}: {result_dict}")
            processing_status[uuid] = {
                "status": "done",
                "result": result_dict,
                "error": None
            }
        except asyncio.CancelledError:
            processing_status[uuid] = {"status": "cancelled", "result": None, "error": "Processing was cancelled."}
            raise
        except Exception as e:
            processing_status[uuid] = {"status": "failed", "result": None, "error": str(e)}
        finally:
            running_tasks.pop(uuid, None)

    task = asyncio.create_task(process_pdf_task())
    running_tasks[uuid] = task
    return {"success": True, "message": "PDF processing started."}

@app.get("/api/analyze-pdf-status/{uuid}")
async def analyze_pdf_status(uuid: str):
    status = processing_status.get(uuid)
    if not status:
        print(f"[STATUS] No status found for {uuid}")
        return {"status": "not_found"}
    print(f"[STATUS] Returning status for {uuid}: {status}")
    return status

@app.delete("/api/delete-pdf")
async def delete_pdf(request: Request):
    data = await request.json()
    uuid = data.get("uuid")
    filename = data.get("filename")
    print("filename: ",filename)
    print("uuid: ",uuid)
    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    if not uuid:
        raise HTTPException(status_code=400, detail="Missing UUID")
    blob_name_upload = f"{uuid}/{filename}"
    blob_upload = bucket.blob(blob_name_upload)
    if blob_upload.exists():
        blob_upload.delete()
        print("PDF in cloud storage deleted successfully.")
        return {"status": "deleted"}
    else:
        raise HTTPException(status_code=404, detail="File not found in {uuid}/{filename}")

class HaltRequest(BaseModel):
    uuid: str

# Dictionary to keep track of running tasks (for demonstration; in production use a proper task manager)
running_tasks = {}

@app.post("/api/halt_pdf_process")
async def halt_pdf_process(request: Request):
    data = await request.json()
    uuid = data.get("uuid")
    if not uuid:
        raise HTTPException(status_code=400, detail="Missing UUID")

    # Simulated process halting logic
    # If you use asyncio tasks, celery, or subprocesses, you should implement actual cancellation here
    task = running_tasks.get(uuid)
    if task:
        try:
            task.cancel()
            del running_tasks[uuid]
            processing_status[uuid] = {"status": "cancelled", "result": None, "error": "Processing was cancelled."}
            return JSONResponse({"success": True, "message": f"Process {uuid} halted."})
        except Exception as e:
            return JSONResponse({"success": False, "message": f"Failed to halt process: {str(e)}"})
    else:
        return JSONResponse({"success": False, "message": "No running process found for this UUID."})

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
