import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { humanFileSize, IBit, IMetadata, Input, Slider, Textarea } from "@tm9657/flow-like-ui";
import { getModelSize, getOriginalRepo } from "../utils";
import { DEFAULT_PROJECTION } from "./page";

export function ProjectionConfiguration({ bit, setBit }: { bit: IBit, setBit: Dispatch<SetStateAction<IBit | undefined>> }) {
   return (<div className="flex flex-col gap-4 max-w-screen-lg w-full">
        <h3 className="text-lg font-semibold">Projection Configuration</h3>
        <div className="space-y-2">
            <label className="text-sm font-medium">Projection Link *</label>
            <Input
                value={bit.download_link ?? ""}
                onChange={(e) => {
                    const downloadLink = e.target.value.trim();

                    setBit(old => ({
                        ...(old ?? DEFAULT_PROJECTION),
                        download_link: downloadLink,
                        file_name: downloadLink.split("/").pop()?.split("?")[0] || "",
                    }));

                    if (downloadLink) {
                        Promise.all([
                            getModelSize(downloadLink),
                            getOriginalRepo(downloadLink)
                        ]).then(([size, repo]) => {
                            setBit(old => ({
                                ...(old ?? DEFAULT_PROJECTION),
                                size: size,
                                repository: repo ?? downloadLink
                            }));
                        });
                    }
                }}
                placeholder="Projection Download Link"
                required
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Repository</label>
                <Input
                    value={bit.repository ?? ""}
                    onChange={(e) => {
                        setBit(old => ({
                            ...(old ?? DEFAULT_PROJECTION),
                            repository: e.target.value.trim()
                        }));
                    }}
                    placeholder="Repository URL or name"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">File Name</label>
                <Input
                    value={bit.file_name ?? ""}
                    onChange={(e) => {
                        setBit(old => ({
                            ...(old ?? DEFAULT_PROJECTION),
                            file_name: e.target.value.trim()
                        }));
                    }}
                    placeholder="Model file name"
                />
            </div>
        </div>

        {bit.size && (
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Projection Size</label>
                <div className="text-sm bg-muted px-3 py-2 rounded-md">
                    {humanFileSize(bit.size)}
                </div>
            </div>
        )}
    </div>)
}