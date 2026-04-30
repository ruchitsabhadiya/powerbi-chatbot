import { DataContext } from "./dataContextBuilder";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];        // Full conversation history
    dataContext: DataContext | null;
    endpointName: string;
    apiToken: string;
    workspaceUrl: string;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
}

export interface ChatResponse {
    answer: string;
    tokensUsed?: number;
    error?: string;
}

/**
 * Sends a chat request to the Databricks proxy and returns the assistant's reply.
 * Includes full conversation history for multi-turn support.
 */
export async function sendChatMessage(
    proxyUrl: string,
    request: ChatRequest
): Promise<ChatResponse> {
    const endpoint = proxyUrl.endsWith("/") ? proxyUrl + "chat" : proxyUrl + "/chat";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        let errorText: string;
        try {
            const errorBody = await response.json();
            errorText = errorBody.detail || errorBody.error || `HTTP ${response.status}`;
        } catch {
            errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorText);
    }

    const data = await response.json();
    return data as ChatResponse;
}

/**
 * Tests the proxy connection without sending real data.
 */
export async function testProxyConnection(proxyUrl: string): Promise<boolean> {
    const healthUrl = proxyUrl.endsWith("/") ? proxyUrl + "health" : proxyUrl + "/health";
    try {
        const response = await fetch(healthUrl, { method: "GET" });
        return response.ok;
    } catch {
        return false;
    }
}
