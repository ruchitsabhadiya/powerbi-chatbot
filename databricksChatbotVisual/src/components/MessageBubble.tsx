import React from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "../utils/apiClient";

interface MessageBubbleProps {
    message: ChatMessage;
    assistantName: string;
    accentColor: string;
    isLatest: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    assistantName,
    accentColor,
    isLatest
}) => {
    const isUser = message.role === "user";

    return (
        <div className={`message-row ${isUser ? "user" : "assistant"} ${isLatest ? "latest" : ""}`}>
            {!isUser && (
                <div
                    className="message-avatar assistant-avatar"
                    style={{ backgroundColor: accentColor }}
                    aria-label={assistantName}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    </svg>
                </div>
            )}
            <div className="message-content">
                <span className="message-sender">
                    {isUser ? "You" : assistantName}
                </span>
                <div
                    className={`message-bubble ${isUser ? "user-bubble" : "assistant-bubble"}`}
                    style={isUser ? { backgroundColor: accentColor } : {}}
                >
                    {isUser ? (
                        <p className="message-text">{message.content}</p>
                    ) : (
                        <div className="message-markdown">
                            <ReactMarkdown
                                components={{
                                    // Style tables nicely
                                    table: ({ children }) => (
                                        <div className="md-table-wrap">
                                            <table className="md-table">{children}</table>
                                        </div>
                                    ),
                                    // Open links in new tab safely
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer">
                                            {children}
                                        </a>
                                    ),
                                    // Inline code styling
                                    code: ({ children, className }) => {
                                        const isBlock = className?.includes("language-");
                                        return isBlock ? (
                                            <pre className="md-code-block">
                                                <code>{children}</code>
                                            </pre>
                                        ) : (
                                            <code className="md-code-inline">{children}</code>
                                        );
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
            {isUser && (
                <div className="message-avatar user-avatar" aria-label="You">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                </div>
            )}
        </div>
    );
};
