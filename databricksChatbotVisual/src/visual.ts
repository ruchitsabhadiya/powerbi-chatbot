"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";
import { buildDataContext } from "./utils/dataContextBuilder";
import { ChatVisual, VisualSettings } from "./components/ChatVisual";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import * as React from "react";
import * as ReactDOM from "react-dom";

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;
    private reactRoot: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();

        // Create a dedicated mount point for React
        this.reactRoot = document.createElement("div");
        this.reactRoot.id = "react-root";
        this.reactRoot.style.width = "100%";
        this.reactRoot.style.height = "100%";
        this.target.appendChild(this.reactRoot);
    }

    public update(options: VisualUpdateOptions): void {
        if (!options?.dataViews?.length) return;

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews[0]
        );

        const settings = this.extractSettings();
        const dataContext = buildDataContext(
            options.dataViews[0],
            settings.maxSampleRows
        );

        const { width, height } = options.viewport;

        ReactDOM.render(
            React.createElement(ChatVisual, {
                settings,
                dataContext,
                width,
                height
            }),
            this.reactRoot
        );
    }

    private extractSettings(): VisualSettings {
        const db = this.formattingSettings?.databricksConfig;
        const llm = this.formattingSettings?.llmConfig;
        const ui = this.formattingSettings?.uiConfig;

        return {
            proxyUrl: db?.proxyUrl?.value ?? "",
            endpointName: db?.endpointName?.value ?? "",
            apiToken: db?.apiToken?.value ?? "",
            workspaceUrl: db?.workspaceUrl?.value ?? "",
            systemPrompt: llm?.systemPrompt?.value ?? "You are a helpful data analyst.",
            maxTokens: Number(llm?.maxTokens?.value ?? 512),
            temperature: Number(llm?.temperature?.value ?? 0.1),
            maxSampleRows: Number(llm?.maxSampleRows?.value ?? 50),
            placeholderText: ui?.placeholderText?.value ?? "Ask a question about your data...",
            accentColor: (ui?.accentColor?.value as { value: string })?.value ?? "#1B6EC2",
            assistantName: ui?.assistantName?.value ?? "Databricks AI",
            showDataContext: ui?.showDataContext?.value ?? true
        };
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.reactRoot);
    }
}