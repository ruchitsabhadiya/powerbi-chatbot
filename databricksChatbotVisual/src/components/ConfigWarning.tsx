import React from "react";

interface ConfigWarningProps {
    width: number;
    height: number;
}

export const ConfigWarning: React.FC<ConfigWarningProps> = ({ width, height }) => {
    const steps = [
        { num: 1, text: "Select this visual on the report canvas" },
        { num: 2, text: 'Open the Format pane (paint-roller icon)' },
        { num: 3, text: 'Expand "🔧 Databricks Connection"' },
        { num: 4, text: "Enter your Proxy URL, Endpoint Name, and API Token" }
    ];

    return (
        <div className="config-warning" style={{ width, height }}>
            <div className="config-content">
                <div className="config-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                    </svg>
                </div>
                <h3 className="config-title">Configuration Required</h3>
                <p className="config-subtitle">
                    Connect this visual to your Databricks workspace to start answering questions.
                </p>
                <div className="config-steps">
                    {steps.map(step => (
                        <div key={step.num} className="config-step">
                            <span className="step-num">{step.num}</span>
                            <span className="step-text">{step.text}</span>
                        </div>
                    ))}
                </div>
                <div className="config-required">
                    <span className="required-label">Required fields:</span>
                    <code>Proxy URL</code>
                    <code>Endpoint Name</code>
                    <code>API Token</code>
                </div>
            </div>
        </div>
    );
};
