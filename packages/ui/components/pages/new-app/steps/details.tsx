"use client";

import { Sparkles, Tag } from "lucide-react";
import type { IMetadata } from "../../../../lib";
import { Input, Label, Textarea } from "../../../ui";

export function AppDetailsStep({
	meta,
	setMeta,
}: Readonly<{
	meta: IMetadata;
	setMeta: (meta: IMetadata | ((prev: IMetadata) => IMetadata)) => void;
}>) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="name" className="flex items-center gap-2 text-base">
					<Sparkles className="h-4 w-4" />
					App Name
				</Label>
				<Input
					id="name"
					placeholder="My Awesome App"
					value={meta.name}
					onChange={(e) =>
						setMeta((prev) => ({ ...prev, name: e.target.value }))
					}
					className="h-12 text-base"
				/>
			</div>

			<div className="space-y-2">
				<Label
					htmlFor="description"
					className="flex items-center gap-2 text-base"
				>
					<Tag className="h-4 w-4" />
					Description
				</Label>
				<Textarea
					id="description"
					placeholder="Describe what your app does and its key features..."
					value={meta.description}
					onChange={(e) =>
						setMeta((prev) => ({
							...prev,
							description: e.target.value,
						}))
					}
					rows={6}
					className="text-base resize-none"
				/>
			</div>
		</div>
	);
}
