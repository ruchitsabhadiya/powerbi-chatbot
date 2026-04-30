# Databricks AI Chatbot — Power BI Custom Visual

A Power BI custom visual that embeds a multi-turn AI chatbot directly into your reports.
End users ask natural-language questions; the visual sends the bound data context to a
Databricks model serving endpoint and renders the answer inline with Markdown support.

---

## Architecture

```
Power BI Report (Custom Visual)
        │
        │  POST /chat  (question + data context + conversation history)
        ▼
  Databricks App (proxy_app.py)          ← Option B proxy
        │
        │  POST /serving-endpoints/{endpoint}/invocations
        ▼
  Databricks Model Serving Endpoint      (LLaMA, DBRX, GPT-4o, etc.)
```

---

## Quick Start

### Step 1 — Deploy the Proxy (Databricks App)

1. Open your Databricks workspace
2. Navigate to **Apps** → **Create App**
3. Choose **"Custom App"** → upload these two files from the `proxy/` folder:
   - `proxy_app.py`
   - `requirements.txt`
4. Set the **start command**:
   ```
   uvicorn proxy_app:app --host 0.0.0.0 --port 8000
   ```
5. Click **Deploy** — Databricks will give you an HTTPS URL like:
   ```
   https://your-app-name-xxxxxx.databricksapps.com
   ```
6. **Save this URL** — you'll need it for the visual configuration

**Test the proxy is running:**
```
GET https://your-app-name-xxxxxx.databricksapps.com/health
→ { "status": "ok", "service": "Databricks Chatbot Proxy" }
```

---

### Step 2 — Import the Visual into Power BI

1. Open Power BI Desktop (or the Power BI Service)
2. In the **Visualizations** pane, click the **"…"** (more options) button
3. Select **"Import a visual from a file"**
4. Navigate to:
   ```
   DatabricksChatbotVisual\dist\databricksChatbotVisual07FA9663138847BD97D04D210DF13582.1.0.0.0.pbiviz
   ```
5. Click **Import** — the visual now appears in your Visualizations pane

---

### Step 3 — Add to a Report & Configure

1. Click the **"Databricks AI Chatbot"** icon in the Visualizations pane to add it to your canvas
2. **Bind data**: Drag any columns or measures from your Fields pane into the **"Table Data"** well
3. **Configure**: With the visual selected, open the **Format pane** (paint-roller icon)

#### 🔧 Databricks Connection (Required)

| Setting | Value | Example |
|---|---|---|
| Proxy URL | URL of your Databricks App | `https://your-app.databricksapps.com` |
| Serving Endpoint Name | Name of your Databricks endpoint | `databricks-dbrx-instruct` |
| API Token (PAT) | Your Databricks Personal Access Token | `dapi...` |
| Workspace URL | Your workspace root URL | `https://adb-123456.7.azuredatabricks.net` |

#### 🤖 LLM Configuration (Optional)

| Setting | Default | Description |
|---|---|---|
| System Prompt | "You are an expert data analyst..." | Instructions for the LLM |
| Max Tokens | 512 | Maximum response length |
| Temperature | 0.1 | Creativity (0=precise, 1=creative) |
| Max Sample Rows | 50 | Data rows to include in LLM context |

#### 🎨 Visual Appearance (Optional)

| Setting | Default | Description |
|---|---|---|
| Input Placeholder | "Ask a question..." | Text shown in the input box |
| Accent Color | `#1B6EC2` (Databricks blue) | Button and user bubble color |
| Assistant Name | "Databricks AI" | Name shown for AI responses |
| Show Data Context Badge | On | Shows row count in header |

---

### Step 4 — Get Your Databricks PAT

1. In Databricks: **Profile icon** → **Settings** → **Developer** → **Access tokens**
2. Click **"Generate new token"**, set a name and expiry
3. Copy the token — it starts with `dapi`
4. Paste it into the **API Token** field in the Power BI formatting pane

---

## How It Works

1. **Data Binding**: You drag columns/measures from your semantic model into the visual's data well. Power BI evaluates the query and delivers a table (up to 1,000 rows) to the visual.

2. **Context Building**: When a user asks a question, the visual sends:
   - Full conversation history (for multi-turn follow-up questions)
   - Column names and types
   - Row count
   - Up to N sample rows (configurable)
   - The system prompt configured by the report owner

3. **Proxy Relay**: The request goes to your Databricks App (which has proper CORS headers), which then calls the Databricks model serving endpoint.

4. **Answer Rendering**: The LLM response is rendered with Markdown support — tables, bold text, code blocks, lists are all formatted.

---

## Local Proxy Testing

```bash
cd proxy
pip install -r requirements.txt
uvicorn proxy_app:app --host 0.0.0.0 --port 8000 --reload

# Test health
curl http://localhost:8000/health

# Test chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "dataContext": null,
    "endpointName": "databricks-dbrx-instruct",
    "apiToken": "dapi...",
    "workspaceUrl": "https://adb-123456.7.azuredatabricks.net",
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 256,
    "temperature": 0.1
  }'
```

---

## Rebuilding the Visual

```bash
cd DatabricksChatbotVisual
npm run package
# Output: dist/databricksChatbotVisual*.pbiviz
```

---

## Security Notes

- The API token is stored in the Power BI report's formatting settings (encrypted at rest by Power BI)
- The token is transmitted from the visual → your proxy → Databricks over HTTPS
- The proxy never logs the token
- For production, consider using Databricks OAuth (M2M) instead of PAT tokens
