"use client"

import { createId } from "@paralleldrive/cuid2";
import { IBit, IBitTypes, ILlmParameters, Input, IBitModelClassification, IModelProvider, nowSystemTime, Separator, IEmbeddingModelParameters, IPooling, Progress, Button } from "@tm9657/flow-like-ui"
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { getContextLength, getModelLicense, getModelName, getModelSize, getModelTags, getOriginalRepo, getUserInfo } from "../utils";
import { MetaConfiguration } from "./meta";
import { LLMConfiguration } from "./llm";
import { Loader2Icon } from "lucide-react";
import { ProjectionConfiguration } from "./projection";
import { put } from "../../../../lib/api";
import { useAuth } from "react-oidc-context";

const DEFAULT_LLM_PARAMETERS: ILlmParameters = {
    context_length: 2048,
    model_classification: {
        cost: 0.3,
        creativity: 0.3,
        factuality: 0.3,
        function_calling: 0.3,
        multilinguality: 0.3,
        openness: 0.3,
        reasoning: 0.3,
        coding: 0.3,
        safety: 0.3,
        speed: 0.3,
    },
    provider: {
        provider_name: "Local",
        model_id: null,
        version: null,
    }
}

const DEFAULT_EMBEDDING_PARAMETERS: IEmbeddingModelParameters = {
    input_length: 512,
    languages: [],
    pooling: IPooling.Mean,
    provider: {
        provider_name: "Local",
        model_id: null,
        version: null,
    },
    prefix: {
        paragraph: "",
        query: "",
    },
    vector_length: 768,
}

const DEFAULT_BIT: IBit = {
    id: createId(),
    authors: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    dependencies: [],
    dependency_tree_hash: "",
    download_link: "",
    file_name: "",
    hash: "",
    hub: "",
    meta: {
        "en": {
            name: "",
            description: "",
            long_description: "",
            tags: [],
            icon: "",
            thumbnail: "",
            preview_media: [],
            website: "",
            support_url: "",
            docs_url: "",
            created_at: nowSystemTime(),
            updated_at: nowSystemTime(),
            age_rating: null,
            use_case: "",
            organization_specific_values: null,
            release_notes: ""
        }
    },
    name: "",
    parameters: {},
    type: IBitTypes.Llm,
    repository: "",
    size: 0,
    license: "",
    version: "0.0.1",
}

export const DEFAULT_PROJECTION: IBit = {
    ...DEFAULT_BIT,
    id: createId(),
    parameters: {},
    type: IBitTypes.Projection,
}

export default function Page() {
    const [bit, setBit] = useState<IBit>(DEFAULT_BIT);
    const [loading, setLoading] = useState<boolean>(false);
    const [projection, setProjection] = useState<IBit | undefined>(undefined);
    const auth = useAuth();

    const prefillLLM = useCallback(async () => {
        if (!bit.download_link || bit.download_link === "" || (bit.type !== IBitTypes.Llm && bit.type !== IBitTypes.Vlm)) return;
        setLoading(true);
        try {
            let size = await getModelSize(bit.download_link);
            // Repo from Download Link
            if (!bit.repository || bit.repository === "") {
                bit.repository = bit.download_link.split("/resolve/")[0];
            }
            bit.repository = await getOriginalRepo(bit.repository) ?? bit.repository;
            const userInfo = await getUserInfo(bit.repository);
            const license = await getModelLicense(bit.repository);
            const tags = await getModelTags(bit.repository);
            const modelName = await getModelName(bit.repository);
            let parameters: ILlmParameters = {
                ...bit.parameters,
                context_length: await getContextLength(bit.download_link) || 2048,
            }
            setBit(old => ({
                ...old,
                meta: {
                    ...old.meta,
                    en: {
                        ...old.meta.en,
                        icon: userInfo.avatarUrl,
                        tags: tags,
                        name: modelName || old.meta.en.name,
                    }
                },
                file_name: old.download_link?.split("/").pop()?.split("?")[0] || "",
                repository: bit.repository,
                authors: [userInfo.authorUrl],
                license: license,
                size: size,
                parameters
            }))
        }
        catch (error) {
            console.error("Error pre-filling LLM parameters:", error);
        }
        finally {
            setLoading(false);
        }
    }, [bit])

    const prefillEmbeddingModel = useCallback(async () => {
        if (!bit.download_link || bit.download_link === "" || (bit.type !== IBitTypes.Llm && bit.type !== IBitTypes.Vlm)) return;
        setLoading(true);
        try {
            let size = await getModelSize(bit.download_link);
            // Repo from Download Link
            if (!bit.repository || bit.repository === "") {
                bit.repository = bit.download_link.split("/resolve/")[0];
            }
            bit.repository = await getOriginalRepo(bit.repository) ?? bit.repository;
            const userInfo = await getUserInfo(bit.repository);
            const license = await getModelLicense(bit.repository);
            const tags = await getModelTags(bit.repository);
            const modelName = await getModelName(bit.repository);
            let parameters: ILlmParameters = {
                ...bit.parameters,
                context_length: await getContextLength(bit.download_link) || 2048,
            }
            setBit(old => ({
                ...old,
                meta: {
                    ...old.meta,
                    en: {
                        ...old.meta.en,
                        icon: userInfo.avatarUrl,
                        tags: tags,
                        name: modelName || old.meta.en.name,
                    }
                },
                file_name: old.download_link?.split("/").pop()?.split("?")[0] || "",
                repository: bit.repository,
                authors: [userInfo.authorUrl],
                license: license,
                size: size,
                parameters
            }))
        }
        catch (error) {
            console.error("Error pre-filling LLM parameters:", error);
        }
        finally {
            setLoading(false);
        }
    }, [bit])

    useEffect(() => {
        if (bit.type === IBitTypes.Llm || bit.type === IBitTypes.Vlm) {
            setBit(old => ({
                ...old,
                parameters: {
                    ...DEFAULT_LLM_PARAMETERS,
                }
            }))
            if (bit.type === IBitTypes.Vlm) {
                setProjection(DEFAULT_PROJECTION);
            } else {
                setProjection(undefined)
            }
            prefillLLM();
        }
        else if (bit.type === IBitTypes.Embedding || bit.type === IBitTypes.ImageEmbedding) {
            setBit(old => ({
                ...old,
                parameters: {
                    ...DEFAULT_EMBEDDING_PARAMETERS,
                }
            }))
        }
    }, [bit.type])

    useEffect(() => {
        if (bit.type === IBitTypes.Llm || bit.type === IBitTypes.Vlm) {
            prefillLLM();
        }
    }, [bit.download_link])

    return <main className="flex flex-grow h-full bg-background max-h-full overflow-hidden flex-col items-start w-full justify-start p-4">
        <h1>Add a new Bit</h1>
        <p className="max-w-screen-md">
            This page is for adding new bits, which are the building blocks of extra models available to the user. You can add bits here by providing the necessary information.
        </p>
        <div className="max-w-screen-md flex flex-row items-center gap-2 mt-4">
            <button className={`p-4 transition-all border bg-card hover:bg-card/80 rounded-lg ${bit.type === IBitTypes.Llm ? "border-primary bg-primary/50 text-primary-foreground" : ""}`} onClick={() => setBit(old => ({ ...old, type: IBitTypes.Llm }))}>
                LLM
            </button>
            <button className={`p-4 transition-all border bg-card hover:bg-card/80 rounded-lg ${bit.type === IBitTypes.Vlm ? "border-primary bg-primary/50 text-primary-foreground" : ""}`} onClick={() => setBit(old => ({ ...old, type: IBitTypes.Vlm }))}>
                VLM
            </button>
            <button className={`p-4 transition-all border bg-card hover:bg-card/80 rounded-lg ${bit.type === IBitTypes.Embedding ? "border-primary bg-primary/50 text-primary-foreground" : ""}`} onClick={() => setBit(old => ({ ...old, type: IBitTypes.Embedding }))}>
                Embedding
            </button>
            <button className={`p-4 transition-all border bg-card hover:bg-card/80 rounded-lg ${bit.type === IBitTypes.ImageEmbedding ? "border-primary bg-primary/50 text-primary-foreground" : ""}`} onClick={() => setBit(old => ({ ...old, type: IBitTypes.ImageEmbedding }))}>
                Image Embedding
            </button>
            <button className={`p-4 transition-all border bg-card hover:bg-card/80 rounded-lg ${bit.type === IBitTypes.ObjectDetection ? "border-primary bg-primary/50 text-primary-foreground" : ""}`} onClick={() => setBit(old => ({ ...old, type: IBitTypes.ObjectDetection }))}>
                Classification
            </button>
        </div>
        <br />
        <div className="max-w-screen-lg flex flex-row items-center gap-2 w-full">
            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" rotate={2} /> : null}
            <Input disabled={loading} className="max-w-screen-md" value={bit.download_link ?? ""} onChange={(e) => setBit(old => ({ ...old, download_link: e.target.value.trim() }))} placeholder="File URL (ONNX)"></Input>
        </div>
        <br />
        {bit.type === IBitTypes.Llm || bit.type === IBitTypes.Vlm ? (
            <>
                <LLMConfiguration bit={bit} setBit={setBit} />
                <Separator className="my-4" />
            </>
        ) : null}
        {bit.type === IBitTypes.Vlm && projection ? (
            <>
                <ProjectionConfiguration bit={projection} setBit={setProjection} />
                <Separator className="my-4" />
            </>
        ) : null}
        <MetaConfiguration bit={bit} setBit={setBit} />
        <Button className="mt-4 w-full max-w-screen-lg" onClick={async () => {
            setLoading(true);
            try {
                let dependencies = [];
                if (projection) {
                    const projectionRegistration: IBit = await put(`bit/${projection.id}`, {
                        ...projection,
                        license: bit.license,
                        authors: bit.authors,
                        repository: bit.repository,
                    }, auth);
                    dependencies.push(projectionRegistration);
                }
                const response: IBit = await put(`bit/${bit.id}`, {
                    ...bit,
                    dependencies: dependencies.map(dep => dep.hub + ":" + dep.id),
                }, auth)
                console.dir(response)
                const metaUpload = await put(`bit/${response.id}/en`, bit.meta["en"], auth);
                console.dir(metaUpload);
                setBit(DEFAULT_BIT)
                setProjection(DEFAULT_PROJECTION);
            }catch (error) {
            }
            setLoading(false);
        }}>
            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" rotate={2} /> : "Add Bit"}
        </Button>
    </main>
}
