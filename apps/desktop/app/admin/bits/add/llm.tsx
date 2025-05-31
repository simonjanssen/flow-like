import { humanFileSize, IBit, IBitModelClassification, ILlmParameters, IModelProvider, Input, Slider } from "@tm9657/flow-like-ui";
import { Dispatch, SetStateAction } from "react";

export function LLMConfiguration({ bit, setBit }: { bit: IBit, setBit: Dispatch<SetStateAction<IBit>> }) {
    const parameters = bit.parameters as ILlmParameters;

    const updateParameter = (key: keyof ILlmParameters, value: any) => {
        setBit(old => ({
            ...old,
            parameters: {
                ...old.parameters,
                [key]: value
            }
        }));
    };

    const updateClassification = (key: keyof IBitModelClassification, value: number) => {
        updateParameter('model_classification', {
            ...parameters.model_classification,
            [key]: value
        });
    };

    const updateProvider = (key: keyof IModelProvider, value: string | null) => {
        updateParameter('provider', {
            ...parameters.provider,
            [key]: value
        });
    };

    return (
        <div className="w-full max-w-screen-lg space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">LLM Configuration</h2>

                {/* Context Length */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Context Length</label>
                    <Input
                        type="number"
                        value={parameters?.context_length || 2048}
                        onChange={(e) => updateParameter('context_length', parseInt(e.target.value) || 2048)}
                        placeholder="2048"
                        min="1"
                        max="2000000"
                    />
                    <p className="text-xs text-muted-foreground">Maximum number of tokens the model can process</p>
                </div>

                {/* Provider Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="text-lg font-medium">Provider Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Provider Name</label>
                            <Input
                                value={parameters?.provider?.provider_name || "Local"}
                                onChange={(e) => updateProvider('provider_name', e.target.value)}
                                placeholder="Local"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Model ID</label>
                            <Input
                                value={parameters?.provider?.model_id || ""}
                                onChange={(e) => updateProvider('model_id', e.target.value || null)}
                                placeholder="Optional model identifier"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Version</label>
                            <Input
                                value={parameters?.provider?.version || ""}
                                onChange={(e) => updateProvider('version', e.target.value || null)}
                                placeholder="Optional version"
                            />
                        </div>
                    </div>
                </div>

                {/* Model Classification */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="text-lg font-medium">Model Classification</h3>
                    <p className="text-sm text-muted-foreground">Rate each capability from 0.0 (poor) to 1.0 (excellent)</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(parameters?.model_classification || {}).map(([key, value]) => {
                            if (typeof value !== 'number') return null;

                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium">{label}</label>
                                        <span className="text-sm text-muted-foreground">{value.toFixed(1)}</span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={[value]}
                                        onValueChange={(val) => updateClassification(key as keyof IBitModelClassification, val[0])}
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Poor</span>
                                        <span>Excellent</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {bit.size && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Model Size</label>
                                <div className="text-sm bg-muted px-3 py-2 rounded-md">
                                    {humanFileSize(bit.size)}
                                </div>
                            </div>
                        )}
            </div>
        </div>
    );
}