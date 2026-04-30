import React from "react";
import { ChatMessage } from "../utils/apiClient";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
    messages: ChatMessage[];
    isLoading: boolean;
    assistantName: string;
    accentColor: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
    messages,
    isLoading,
    assistantName,
    accentColor
}) => {
    return (
        <div className="messages-list">
            {messages.map((msg, idx) => (
                <MessageBubble
                    key={idx}
                    message={msg}
                    assistantName={assistantName}
                    accentColor={accentColor}
                    isLatest={idx === messages.length - 1}
                />
            ))}
            {isLoading && (
                <div className="message-row assistant">
                    <div className="message-avatar assistant-avatar" style={{ backgroundColor: accentColor }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        </svg>
                    </div>
                    <div className="message-content">
                        <span className="message-sender">{assistantName}</span>
                        <div className="message-bubble assistant-bubble loading-bubble">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
