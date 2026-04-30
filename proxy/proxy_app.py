"""
Databricks Chatbot Proxy — FastAPI App
======================================
Deploy this as a Databricks App. It acts as a CORS-enabled relay
between the Power BI custom visual and your Databricks model serving endpoint.

Deployment:
    1. In Databricks workspace → Apps → Create App
    2. Upload this file + requirements.txt
    3. Set entrypoint: uvicorn proxy_app:app --host 0.0.0.0 --port 8000
    4. Copy the Databricks App HTTPS URL into the Power BI visual formatting pane
"""

import os
import json
import logging
from typing import Optional

import os
import json
import logging
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import ChatMessage as DbChatMessage

# ─── App Setup ────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Databricks Chatbot Proxy",
    description="CORS relay for Power BI custom visual → Databricks LLM",
    version="1.0.0",
    docs_url="/docs",
)

# Allow requests from Power BI (null origin from sandboxed iframe) and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Power BI iframes use null origin
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class ColumnInfo(BaseModel):
    name: str
    type: str
    role: str = ""


class DataContext(BaseModel):
    columns: list[ColumnInfo] = []
    rowCount: int = 0
    sampleRows: list[list] = []
    summary: str = ""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]                         # Full conversation history
    dataContext: Optional[DataContext] = None
    endpointName: str = Field(..., description="Databricks serving endpoint name")
    apiToken: Optional[str] = Field(None, description="Optional PAT. If omitted, uses App Service Principal.")
    workspaceUrl: str = Field(..., description="Databricks workspace URL")
    systemPrompt: str = "You are a helpful data analyst."
    maxTokens: int = Field(default=512, ge=50, le=4096)
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)


class ChatResponse(BaseModel):
    answer: str
    tokensUsed: Optional[int] = None
    model: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
async def health():
    """Used by the Power BI visual to verify the proxy is reachable."""
    return {"status": "ok", "service": "Databricks Chatbot Proxy"}


@app.post("/chat", response_model=ChatResponse, summary="Chat with Databricks LLM")
async def chat(request: ChatRequest):
    """
    Receives a multi-turn conversation + data context from the Power BI visual,
    builds the message list, and calls the Databricks model serving endpoint.
    """
    # Validate workspace URL
    workspace_url = request.workspaceUrl.rstrip("/")
    if not workspace_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="workspaceUrl must start with https://")

    # Build data context string for system prompt
    data_context_text = _build_data_context_text(request.dataContext)

    # Compose messages: system → data context → conversation history
    system_content = f"{request.systemPrompt}\n\n{data_context_text}" if data_context_text else request.systemPrompt

    messages = [{"role": "system", "content": system_content}]

    # Append conversation history (filter out any existing system messages)
    for msg in request.messages:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    # Databricks serving endpoint URL
    endpoint_url = f"{workspace_url}/serving-endpoints/{request.endpointName}/invocations"

    payload = {
        "messages": messages,
        "max_tokens": request.maxTokens,
        "temperature": request.temperature,
    }

    logger.info(f"Calling Databricks endpoint: {request.endpointName} | messages: {len(messages)}")

    try:
        # If the user provided a PAT in Power BI, use raw HTTP (legacy method)
        if request.apiToken and request.apiToken.strip():
            logger.info("Using provided API Token (PAT)")
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{workspace_url}/serving-endpoints/{request.endpointName}/invocations",
                    headers={
                        "Authorization": f"Bearer {request.apiToken}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

            if resp.status_code != 200:
                error_body = resp.text
                logger.error(f"Databricks error {resp.status_code}: {error_body}")
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Databricks endpoint returned {resp.status_code}: {_safe_error(error_body)}"
                )

            result = resp.json()
            answer = result["choices"][0]["message"]["content"]
            tokens_used = result.get("usage", {}).get("total_tokens")
            model = result.get("model", request.endpointName)
            
        else:
            # Native Databricks App Auth (OAuth M2M)
            logger.info("Using Native Databricks App Service Principal (OAuth)")
            
            # The SDK automatically detects DATABRICKS_CLIENT_ID and DATABRICKS_CLIENT_SECRET
            # injected by the Databricks App runtime.
            w = WorkspaceClient(host=workspace_url)
            
            # Convert messages to SDK format
            sdk_messages = [DbChatMessage(role=m["role"], content=m["content"]) for m in messages]
            
            response = w.serving_endpoints.query(
                name=request.endpointName,
                messages=sdk_messages,
                max_tokens=request.maxTokens,
                temperature=request.temperature
            )
            
            # Extract response
            answer = response.choices[0].message.content if response.choices else ""
            tokens_used = response.usage.total_tokens if response.usage else None
            model = response.model or request.endpointName

        return ChatResponse(answer=answer, tokensUsed=tokens_used, model=model)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Databricks endpoint timed out after 60 seconds")
    except httpx.ConnectError as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to Databricks: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error calling Databricks")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_data_context_text(ctx: Optional[DataContext]) -> str:
    """Convert the DataContext into a readable string for the LLM system message."""
    if not ctx or not ctx.columns:
        return ""

    col_header = ", ".join(f'"{c.name}" ({c.type})' for c in ctx.columns)

    row_lines = []
    for i, row in enumerate(ctx.sampleRows[:50]):
        cells = []
        for j, val in enumerate(row):
            col_name = ctx.columns[j].name if j < len(ctx.columns) else str(j)
            cells.append(f"{col_name}={json.dumps(val)}")
        row_lines.append(f"Row {i+1}: {', '.join(cells)}")

    context_parts = [
        "=== DATA CONTEXT ===",
        f"Total rows in dataset: {ctx.rowCount}",
        f"Summary: {ctx.summary}" if ctx.summary else "",
        f"Columns: {col_header}",
        "",
    ]

    if ctx.rowCount > len(ctx.sampleRows):
        context_parts.append(f"Showing first {len(ctx.sampleRows)} of {ctx.rowCount} rows:")
    else:
        context_parts.append(f"All {ctx.rowCount} rows:")

    context_parts.extend(row_lines)
    context_parts.append("=== END DATA CONTEXT ===")

    return "\n".join(p for p in context_parts if p is not None)


def _safe_error(body: str) -> str:
    """Extract a human-readable error from Databricks response body."""
    try:
        parsed = json.loads(body)
        return parsed.get("message") or parsed.get("error") or body[:300]
    except Exception:
        return body[:300]


# ─── Entry point (for local testing) ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
