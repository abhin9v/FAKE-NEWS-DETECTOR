import os
import json
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Fake News Detector API",
    description="An API that uses a RAG model to verify news headlines.",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows the frontend (running on a different domain/port) to communicate with the backend.
origins = [
    "http://localhost:5173",  # React default dev server
    "http://localhost:3000",  # Common React dev server port
    # Add your Vercel frontend URL here after deployment
    # e.g., "https://your-frontend-app-name.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For simplicity, allow all. For production, restrict to your frontend's URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Data Validation ---

class NewsRequest(BaseModel):
    statement: str = Field(..., example="A new study shows that chocolate cures all diseases.")

class Source(BaseModel):
    title: str
    url: str

class NewsResponse(BaseModel):
    result: Literal["REAL", "FAKE", "UNCERTAIN"]
    confidence: int = Field(..., ge=0, le=100)
    explanation: str
    sources: List[Source]


# --- API Endpoint ---

@app.post("/check-news", response_model=NewsResponse)
async def check_news(request: NewsRequest):
    """
    Accepts a news statement, verifies it using Perplexity API, and returns a structured result.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key for Perplexity is not set.")

    # The core of the RAG system: A detailed system prompt
    # This instructs the model on its role, the task, and the required output format.
    system_prompt = """
    You are a meticulous AI-powered fact-checker. Your task is to analyze a given news headline or statement, use your web search capabilities to find the latest, most reliable information, and determine if the statement is REAL, FAKE, or UNCERTAIN.

    Your analysis MUST be based *only* on the retrieved web search results from high-authority sources (major news outlets, scientific journals, government reports, etc.).

    You MUST return your answer in a specific JSON format. Do not add any text, explanations, or markdown formatting before or after the JSON object.

    The JSON object must have the following structure:
    {
      "result": "REAL" or "FAKE" or "UNCERTAIN",
      "confidence": <an integer between 0 and 100 representing your confidence in the verdict>,
      "explanation": "<A brief, neutral, and evidence-based explanation for your verdict. Cite the information you found and how it supports your conclusion. Keep it concise (2-4 sentences).>",
      "sources": [
        {"title": "<The title of the source article/page>", "url": "<The full URL of the source>"},
        {"title": "<Source Title 2>", "url": "<Source URL 2>"},
        ...
      ]
    }
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "sonar-pro",  # This model has web search access
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the news statement to verify: \"{request.statement}\""}
        ]
    }

    try:
        response = requests.post("https://api.perplexity.ai/chat/completions", headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        response_data = response.json()
        llm_output_str = response_data['choices'][0]['message']['content']

        # Attempt to parse the LLM's string output into a JSON object
        try:
            parsed_output = json.loads(llm_output_str)
            # Validate the parsed output with our Pydantic model
            validated_response = NewsResponse(**parsed_output)
            return validated_response
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing LLM output: {e}")
            print(f"LLM Output String: {llm_output_str}")
            raise HTTPException(status_code=500, detail="Failed to parse the response from the AI model. The model may have returned an invalid format.")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error communicating with Perplexity API: {e}")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Fake News Detector API is running."}