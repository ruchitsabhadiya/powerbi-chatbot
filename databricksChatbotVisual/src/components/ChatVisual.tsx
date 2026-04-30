import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ConfigWarning } from "./ConfigWarning";
import { sendChatMessage, ChatMessage } from "../utils/apiClient";
import { DataContext, serializeDataContext } from "../utils/dataContextBuilder";

export interface VisualSettings {
    proxyUrl: string;
    endpointName: string;
    apiToken: string;
    workspaceUrl: string;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
    placeholderText: string;
    accentColor: string;
    assistantName: string;
    showDataContext: boolean;
    maxSampleRows: number;
}

interface ChatVisualProps {
    settings: VisualSettings;
    dataContext: DataContext | null;
    width: number;
    height: number;
}

export const ChatVisual: React.FC<ChatVisualProps> = ({
    settings,
    dataContext,
    width,
    height
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isConfigured = Boolean(
        settings.proxyUrl &&
        settings.endpointName &&
        settings.apiToken
    );

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = useCallback(async (question: string) => {
        if (!question.trim() || isLoading || !isConfigured) return;

        const userMessage: ChatMessage = { role: "user", content: question };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);
        setError(null);

        try {
            const response = await sendChatMessage(settings.proxyUrl, {
                messages: updatedMessages,
                dataContext,
                endpointName: settings.endpointName,
                apiToken: settings.apiToken,
                workspaceUrl: settings.workspaceUrl,
                systemPrompt: settings.systemPrompt,
                maxTokens: settings.maxTokens,
                temperature: settings.temperature
            });

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.answer
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Unknown error occurred";
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    }, [messages, isLoading, isConfigured, settings, dataContext]);

    const handleClearChat = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    if (!isConfigured) {
        return <ConfigWarning width={width} height={height} />;
    }

    const accentColor = settings.accentColor || "#1B6EC2";

    return (
        <div className="chat-visual" style={{ width, height }}>
            {/* Header */}
            <div className="chat-header" style={{ borderBottomColor: accentColor }}>
                <div className="chat-header-left">
                    <span className="chat-logo" style={{ color: accentColor }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </span>
                    <span className="chat-title">{settings.assistantName || "Databricks AI"}</span>
                    {settings.showDataContext && dataContext && (
                        <span className="data-badge" title={`${dataContext.rowCount} rows, ${dataContext.columns.length} columns in context`}>
                            {dataContext.rowCount.toLocaleString()} rows
                        </span>
                    )}
                </div>
                {messages.length > 0 && (
                    <button
                        className="clear-btn"
                        onClick={handleClearChat}
                        title="Clear conversation"
                        aria-label="Clear conversation"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Messages area */}
            <div className="chat-body">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon" style={{ color: accentColor }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            </svg>
                        </div>
                        <p className="chat-empty-title">Ask about your data</p>
                        <p className="chat-empty-subtitle">
                            {dataContext
                                ? `${dataContext.rowCount.toLocaleString()} rows · ${dataContext.columns.length} columns loaded`
                                : "Bind fields from the Fields pane to get started"}
                        </p>
                        {dataContext && dataContext.columns.length > 0 && (
                            <div className="chat-suggestions">
                                <p className="suggestions-label">Try asking:</p>
                                <button className="suggestion-chip" onClick={() => handleSend("What is the total sum of each numeric column?")}>
                                    What is the total sum of each numeric column?
                                </button>
                                <button className="suggestion-chip" onClick={() => handleSend("What are the key trends in this data?")}>
                                    What are the key trends in this data?
                                </button>
                                <button className="suggestion-chip" onClick={() => handleSend(`What are the unique values in ${dataContext.columns[0]?.name}?`)}>
                                    Unique values in {dataContext.columns[0]?.name}?
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <ChatMessages
                        messages={messages}
                        isLoading={isLoading}
                        assistantName={settings.assistantName}
                        accentColor={accentColor}
                    />
                )}
                {error && (
                    <div className="error-bar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="error-dismiss">✕</button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                placeholder={settings.placeholderText}
                accentColor={accentColor}
                disabled={!isConfigured}
            />
        </div>
    );
};
