"use client";

import type { TElement } from "platejs";

import { faker } from "@faker-js/faker";
import { CopilotPlugin } from "@platejs/ai/react";
import { serializeMd, stripMarkdown } from "@platejs/markdown";

import { GhostText } from "../ui/ghost-text";

import { request } from "http";
import { init } from "@paralleldrive/cuid2";
import { IRole } from "../../../lib";
import { useBackend, useBackendStore } from "../../../state/backend-state";
import { MarkdownKit } from "./markdown-kit";

const SYSTEM_PROMPT = `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.

  Rules:
  - Continue the text naturally up to the next punctuation mark (., ,, ;, :, ?, or !).
  - Maintain style and tone. Don't repeat given text.
  - For unclear context, provide the most likely continuation.
  - Handle code snippets, lists, or structured text if needed.
  - Don't include """ in your response.
  - CRITICAL: Always end with a punctuation mark.
  - CRITICAL: Avoid starting a new block. Do not use block formatting like >, #, 1., 2., -, etc. The suggestion should continue in the same block as the context.
  - If no context is provided or you can't generate a continuation, return "0" without explanation.`;

export const CopilotKit = [
	...MarkdownKit,
	// @ts-ignore
	CopilotPlugin.configure(({ api }) => ({
		options: {
			completeOptions: {
				api: "/api/ai/copilot",
				body: {
					system: SYSTEM_PROMPT,
				},
				// @ts-ignore
				fetch: async (request, init) => {
					const backend = useBackendStore.getState().backend;
					console.dir({
						request,
						init,
					});
					const body = JSON.parse(init?.body?.toString() ?? "{}") || {};

					if (!backend) {
						throw new Error("Backend not initialized");
					}
					const response = await backend.aiState.chatComplete([
						{
							role: IRole.System,
							content: body.system,
						},
						{
							role: IRole.User,
							content: body.prompt,
						},
					]);

					console.dir(response);
					const text = response.choices[0]?.message?.content || "0";

					return new Response(JSON.stringify({ ...response, text: text }));
				},
				onError: (err) => {
					// Mock the API response. Remove it when you implement the route /api/ai/copilot
					console.warn(err);
					api.copilot.setBlockSuggestion({
						text: stripMarkdown(faker.lorem.sentence()),
					});
				},
				onFinish: (_, completion) => {
					if (completion === "0") return;

					api.copilot.setBlockSuggestion({
						text: stripMarkdown(completion),
					});
				},
			},
			debounceDelay: 500,
			renderGhostText: GhostText,
			getPrompt: ({ editor }) => {
				const contextEntry = editor.api.block({ highest: true });

				if (!contextEntry) return "";

				const prompt = serializeMd(editor, {
					value: [contextEntry[0] as TElement],
				});

				return `Continue the text up to the next punctuation mark:
  """
  ${prompt}
  """`;
			},
		},
		shortcuts: {
			accept: {
				keys: "tab",
			},
			acceptNextWord: {
				keys: "mod+right",
			},
			reject: {
				keys: "escape",
			},
			triggerSuggestion: {
				keys: "ctrl+space",
			},
		},
	})),
];
