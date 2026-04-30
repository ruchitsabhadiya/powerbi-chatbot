import React, { useState, useRef, useCallback } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
    placeholder: string;
    accentColor: string;
    disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    isLoading,
    placeholder,
    accentColor,
    disabled
}) => {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || isLoading || disabled) return;
        onSend(trimmed);
        setValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [value, isLoading, disabled, onSend]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        // Auto-resize
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }, []);

    const canSend = value.trim().length > 0 && !isLoading && !disabled;

    return (
        <div className="chat-input-area">
            <div className="input-row">
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={value}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || isLoading}
                    rows={1}
                    aria-label="Type your question"
                    id="chat-question-input"
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                    style={{ backgroundColor: canSend ? accentColor : undefined }}
                    id="chat-send-button"
                >
                    {isLoading ? (
                        <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
                        </svg>
                    )}
                </button>
            </div>
            <p className="input-hint">
                {isLoading ? "Generating response…" : "Enter to send · Shift+Enter for new line"}
            </p>
        </div>
    );
};
