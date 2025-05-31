import { Button, humanFileSize, IBit, IMetadata, Input, Slider, Textarea } from "@tm9657/flow-like-ui";
import { Dispatch, SetStateAction } from "react";

export function MetaConfiguration({ bit, setBit }: { bit: IBit, setBit: Dispatch<SetStateAction<IBit>> }) {
    const getMeta = (field: keyof IMetadata) => {
        return bit.meta?.["en"]?.[field];
    };

    const updateMeta = <K extends keyof IMetadata>(field: K, value: IMetadata[K]) => {
        setBit(old => ({
            ...old,
            meta: {
                ...old.meta,
                "en": {
                    ...old.meta?.["en"],
                    [field]: value
                }
            }
        }));
    };

    const addTag = (tag: string) => {
        if (!tag.trim()) return;
        const currentTags = bit.meta?.["en"]?.tags || [];
        if (!currentTags.includes(tag.trim())) {
            updateMeta('tags', [...currentTags, tag.trim()]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        const currentTags = bit.meta?.["en"]?.tags || [];
        updateMeta('tags', currentTags.filter(tag => tag !== tagToRemove));
    };

    const addPreviewMedia = (url: string) => {
        if (!url.trim()) return;
        const currentMedia = bit.meta?.["en"]?.preview_media || [];
        if (!currentMedia.includes(url.trim())) {
            updateMeta('preview_media', [...currentMedia, url.trim()]);
        }
    };

    const removePreviewMedia = (urlToRemove: string) => {
        const currentMedia = bit.meta?.["en"]?.preview_media || [];
        updateMeta('preview_media', currentMedia.filter(url => url !== urlToRemove));
    };

    return (
        <div className="flex flex-col gap-4 max-w-screen-lg w-full">
            <div className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold">Metadata Configuration</h3>
            <small>{humanFileSize(bit.size ?? 0)}</small>
            </div>

            {/* Basic Information */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                        value={getMeta("name") || ""}
                        onChange={(e) => updateMeta('name', e.target.value)}
                        placeholder="Model name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Filename</label>
                    <Input
                        value={bit.file_name || ""}
                        onChange={(e) => setBit(old => ({ ...old, file_name: e.target.value }))}
                        placeholder="model-file.bin"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Age Rating [{getMeta("age_rating") ?? 0}+]</label>
                    <Slider
                        min={0}
                        max={18}
                        step={1}
                        value={[parseInt(getMeta("age_rating") || "") || 0]}
                        onValueChange={(value) => updateMeta('age_rating', value[0])}
                        className="py-3.5"
                    />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                    value={getMeta("description") || ""}
                    onChange={(e) => updateMeta('description', e.target.value)}
                    placeholder="Brief description of the model"
                    rows={2}
                    required
                />
            </div>

            {/* Long Description */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Long Description</label>
                <Textarea
                    value={getMeta("long_description") || ""}
                    onChange={(e) => updateMeta('long_description', e.target.value)}
                    placeholder="Detailed description of the model's capabilities and use cases"
                    rows={4}
                />
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <Input
                        type="url"
                        value={getMeta("website") || ""}
                        onChange={(e) => updateMeta('website', e.target.value)}
                        placeholder="https://example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Documentation URL</label>
                    <Input
                        type="url"
                        value={getMeta("docs_url") || ""}
                        onChange={(e) => updateMeta('docs_url', e.target.value)}
                        placeholder="https://docs.example.com"
                    />
                </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium">Support URL</label>
                    <Input
                        type="url"
                        value={getMeta("support_url") || "" || ""}
                        onChange={(e) => updateMeta('support_url', e.target.value)}
                        placeholder="https://support.example.com"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Repo URL</label>
                    <Input
                        type="url"
                        value={bit.repository || ""}
                        onChange={(e) => setBit(old => ({ ...old, repository: e.target.value }))}
                        placeholder="https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Use Case</label>
                    <Input
                        value={getMeta("use_case") || "" || ""}
                        onChange={(e) => updateMeta('use_case', e.target.value)}
                        placeholder="e.g., Chat, Code Generation, Analysis"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">License</label>
                    <Input
                        value={bit.license || ""}
                        onChange={(e) => setBit(old => ({ ...old, license: e.target.value }))}
                        placeholder="e.g., MIT, Apache-2.0, CC-BY-NC-4.0"
                    />
                </div>
            </div>

            {/* Media URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Icon URL</label>
                    <Input
                        type="url"
                        value={getMeta("icon") || "" || ""}
                        onChange={(e) => updateMeta('icon', e.target.value)}
                        placeholder="https://example.com/icon.png"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Thumbnail URL</label>
                    <Input
                        type="url"
                        value={getMeta("thumbnail") || "" || ""}
                        onChange={(e) => updateMeta('thumbnail', e.target.value)}
                        placeholder="https://example.com/thumbnail.png"
                    />
                </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {(getMeta("tags") || "" || []).map((tag: string, index: number) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:text-destructive"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <Input
                    placeholder="Add a tag and press Enter"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                />
            </div>

            {/* Preview Media */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Preview Media URLs</label>
                <div className="space-y-2">
                    {(bit.meta?.preview_media || []).map((url: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={url}
                                onChange={(e) => {
                                    const newMedia = [...(getMeta("preview_media") || "" || [])];
                                    newMedia[index] = e.target.value;
                                    updateMeta('preview_media', newMedia);
                                }}
                                placeholder="https://example.com/preview.png"
                            />
                            <button
                                type="button"
                                onClick={() => removePreviewMedia(url)}
                                className="px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/80"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <Input
                        placeholder="Add preview media URL and press Enter"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addPreviewMedia(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>
            </div>

            {/* Release Notes */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Release Notes</label>
                <Textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getMeta("release_notes") || "" || ""}
                    onChange={(e) => updateMeta('release_notes', e.target.value)}
                    placeholder="What's new in this version?"
                />
            </div>
        </div>
    );
}