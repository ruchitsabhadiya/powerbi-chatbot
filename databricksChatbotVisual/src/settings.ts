import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// ─── Databricks Connection Card ─────────────────────────────────────────────

class DatabricksConfigCard extends FormattingSettingsCard {
    proxyUrl = new formattingSettings.TextInput({
        name: "proxyUrl",
        displayName: "Proxy URL",
        description: "HTTPS URL of your Databricks App proxy (e.g. https://your-app.azuredatabricks.net)",
        placeholder: "https://your-databricks-app-url/chat",
        value: ""
    });

    endpointName = new formattingSettings.TextInput({
        name: "endpointName",
        displayName: "Serving Endpoint Name",
        description: "Name of your Databricks Model Serving endpoint (e.g. llama-3-1-70b-instruct)",
        placeholder: "databricks-dbrx-instruct",
        value: ""
    });

    apiToken = new formattingSettings.TextInput({
        name: "apiToken",
        displayName: "API Token (PAT)",
        description: "Databricks Personal Access Token. Will be forwarded via the proxy.",
        placeholder: "dapi...",
        value: ""
    });

    workspaceUrl = new formattingSettings.TextInput({
        name: "workspaceUrl",
        displayName: "Workspace URL",
        description: "Your Databricks workspace URL (e.g. https://adb-123456.7.azuredatabricks.net)",
        placeholder: "https://adb-xxxxxxxx.x.azuredatabricks.net",
        value: ""
    });

    name: string = "databricksConfig";
    displayName: string = "🔧 Databricks Connection";
    slices: FormattingSettingsSlice[] = [
        this.proxyUrl, this.endpointName, this.apiToken, this.workspaceUrl
    ];
}

// ─── LLM Configuration Card ──────────────────────────────────────────────────

class LLMConfigCard extends FormattingSettingsCard {
    systemPrompt = new formattingSettings.TextArea({
        name: "systemPrompt",
        displayName: "System Prompt",
        description: "Instructions for the LLM. Tell it what kind of analyst it should be.",
        placeholder: "You are a helpful data analyst...",
        value: "You are an expert data analyst. Answer questions based on the data provided. Be concise and precise. Format numbers clearly. If the answer cannot be derived from the data, say so honestly."
    });

    maxTokens = new formattingSettings.NumUpDown({
        name: "maxTokens",
        displayName: "Max Tokens",
        description: "Maximum tokens in the LLM response (100–4096)",
        value: 512
    });

    temperature = new formattingSettings.NumUpDown({
        name: "temperature",
        displayName: "Temperature",
        description: "LLM creativity level (0 = deterministic, 1 = creative)",
        value: 0.1
    });

    maxSampleRows = new formattingSettings.NumUpDown({
        name: "maxSampleRows",
        displayName: "Max Sample Rows",
        description: "Number of data rows to include in LLM context (5–200)",
        value: 50
    });

    name: string = "llmConfig";
    displayName: string = "🤖 LLM Configuration";
    slices: FormattingSettingsSlice[] = [
        this.systemPrompt, this.maxTokens, this.temperature, this.maxSampleRows
    ];
}

// ─── UI Configuration Card ───────────────────────────────────────────────────

class UIConfigCard extends FormattingSettingsCard {
    placeholderText = new formattingSettings.TextInput({
        name: "placeholderText",
        displayName: "Input Placeholder",
        description: "Hint text shown in the question input box",
        placeholder: "Ask a question about your data...",
        value: "Ask a question about your data..."
    });

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Accent Color",
        description: "Color for buttons, user message bubbles, and highlights",
        value: { value: "#1B6EC2" }
    });

    assistantName = new formattingSettings.TextInput({
        name: "assistantName",
        displayName: "Assistant Name",
        description: "Display name shown for AI responses",
        placeholder: "Databricks AI",
        value: "Databricks AI"
    });

    showDataContext = new formattingSettings.ToggleSwitch({
        name: "showDataContext",
        displayName: "Show Data Context Badge",
        description: "Show a badge indicating how many rows are in context",
        value: true
    });

    name: string = "uiConfig";
    displayName: string = "🎨 Visual Appearance";
    slices: FormattingSettingsSlice[] = [
        this.placeholderText, this.accentColor, this.assistantName, this.showDataContext
    ];
}

// ─── Root Model ───────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    databricksConfig = new DatabricksConfigCard();
    llmConfig = new LLMConfigCard();
    uiConfig = new UIConfigCard();

    cards: FormattingSettingsCard[] = [
        this.databricksConfig,
        this.llmConfig,
        this.uiConfig
    ];
}
