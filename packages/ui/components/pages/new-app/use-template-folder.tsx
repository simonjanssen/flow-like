"use client"

import { useMemo } from "react";
import type { IMetadata } from "../../../lib";

export function useTemplateFolders(templates: [string, string, IMetadata | undefined][]) {
    return useMemo(() => {
        const templatesByApp = new Map<string, [string, IMetadata][]>();

        templates.forEach(([appId, templateId, metadata]) => {
            if (!metadata) return;

            if (!templatesByApp.has(appId)) {
                templatesByApp.set(appId, []);
            }
            templatesByApp.get(appId)!.push([templateId, metadata]);
        });

        return Array.from(templatesByApp.entries());
    }, [templates]);
}
