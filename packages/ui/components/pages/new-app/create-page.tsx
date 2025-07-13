"use client"
import { Check, DownloadCloud, ExternalLink, FileText, Rocket, Settings, Sparkles, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Crossfire from "react-canvas-confetti/dist/presets/crossfire";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, nowSystemTime, Textarea, useBackend, useInvoke } from "../../..";
import type { IMetadata } from "../../../lib";
import { CreationProgress } from "./creation-process";
import { ModelModal } from "./model-modal";
import { ModelSection } from "./model-selection";
import { TemplateModal } from "./template-modal";
import { TemplateSection } from "./template-selection";

export function CreateAppPage() {
    const backend = useBackend();
    const auth = useAuth();
    const router = useRouter();
    const templates = useInvoke(backend.templateState.getTemplates, backend.templateState, []);
    const apps = useInvoke(backend.appState.getApps, backend.appState, []);
    const currentProfile = useInvoke(
        backend.userState.getSettingsProfile,
        backend.userState,
        [],
    );

    const [selectedTemplate, setSelectedTemplate] = useState<[string, string]>(["", ""]);
    const [skipTemplate, setSkipTemplate] = useState(true);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [skipModels, setSkipModels] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showModelModal, setShowModelModal] = useState(false);
    const [isOffline, setIsOffline] = useState(true);
    const [meta, setMeta] = useState<IMetadata>({
        description: "",
        name: "",
        tags: [],
        use_case: "",
        created_at: nowSystemTime(),
        updated_at: nowSystemTime(),
        preview_media: [],
    });

    const canCreate =
        meta.name.trim() !== "" &&
        meta.description.trim() !== "" &&
        (skipTemplate || selectedTemplate[0] !== "") &&
        (skipModels || selectedModels.length > 0);

    const handleCreateApp = async () => {
        if (!canCreate) return;

        setIsCreating(true);
        try {
            const template = skipTemplate ? undefined : await backend.templateState.getTemplate(selectedTemplate[0], selectedTemplate[1]);
            await backend.appState.createApp(
                meta,
                selectedModels,
                !isOffline,
                template,
            );
            setShowConfetti(true);
            toast(`${isOffline ? "Offline" : "Online"} app created successfully! 🎉`);
            await apps.refetch();
            setTimeout(() => {
                router.push("/library/apps");
            }, 2000);
        } catch (error) {
            console.error("Failed to create app:", error);
            toast("Failed to create app");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <main className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
            {showConfetti && (
                <div className="absolute z-50 pointer-events-none top-0 left-0 right-0 bottom-0">
                    <Crossfire className="" autorun={{ speed: 1 }} />
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                <PageHeader />

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <AppDetailsCard meta={meta} setMeta={setMeta} />
                        <ConnectivityModeCard
                            isOffline={isOffline}
                            setIsOffline={setIsOffline}
                            isAuthenticated={auth?.isAuthenticated}
                        />
                        <CreateButton
                            canCreate={canCreate}
                            isCreating={isCreating}
                            onCreateApp={handleCreateApp}
                        />
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <TemplateSection
                            templates={templates.data || []}
                            selectedTemplate={selectedTemplate}
                            skipTemplate={skipTemplate}
                            onSelectTemplate={(appId, templateId) => {setSelectedTemplate([appId, templateId])}}
                            onSkipTemplate={setSkipTemplate}
                            onShowModal={() => setShowTemplateModal(true)}
                        />

                        <ModelSection
                            models={currentProfile.data?.hub_profile.bits || []}
                            selectedModels={selectedModels}
                            skipModels={skipModels}
                            onUpdateModels={setSelectedModels}
                            onSkipModels={setSkipModels}
                            onShowModal={() => setShowModelModal(true)}
                        />

                        <CreationProgress
                            meta={meta}
                            skipTemplate={skipTemplate}
                            selectedTemplate={selectedTemplate}
                            skipModels={skipModels}
                            selectedModels={selectedModels}
                            isOffline={isOffline}
                            canCreate={canCreate}
                        />
                    </div>
                </div>
            </div>

            <TemplateModal
                open={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                templates={templates.data?.filter(([_appId, _templateId, metadata]) => metadata) as any || []}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={(appId, templateId) => {
                    setSelectedTemplate([appId, templateId]);
                    setShowTemplateModal(false);
                }}
            />

            <ModelModal
                open={showModelModal}
                onClose={() => setShowModelModal(false)}
                models={currentProfile.data?.hub_profile.bits || []}
                selectedModels={selectedModels}
                onUpdateModels={setSelectedModels}
            />
        </main>
    );
}

function PageHeader() {
    return (
        <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                    <Rocket className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-4xl font-bold">
                    Create <span className="highlight">New App</span>
                </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Build your next AI-powered application with our intuitive creation
                wizard. Choose a template, configure your models, and launch in
                minutes.
            </p>
        </div>
    );
}

function AppDetailsCard({
    meta,
    setMeta,
}: Readonly<{
    meta: IMetadata;
    setMeta: (meta: IMetadata | ((prev: IMetadata) => IMetadata)) => void;
}>) {
    return (
        <Card className="border-2 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>App Details</CardTitle>
                </div>
                <CardDescription>
                    Define your app&apos;s identity and purpose
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
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
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
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
                        rows={4}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function ConnectivityModeCard({
    isOffline,
    setIsOffline,
    isAuthenticated,
}: Readonly<{
    isOffline: boolean;
    setIsOffline: (offline: boolean) => void;
    isAuthenticated?: boolean;
}>) {
    return (
        <Card className="border-2 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>App Configuration</CardTitle>
                </div>
                <CardDescription>
                    Configure how your app will operate
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Connectivity Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <ConnectivityModeOption
                            title="Online"
                            subtitle="Cloud-powered"
                            icon={ExternalLink}
                            selected={!isOffline}
                            onClick={() => {
                                if (!isAuthenticated) {
                                    toast.error("You must be logged in to create an online project.");
                                    return;
                                }
                                setIsOffline(false);
                            }}
                        />
                        <ConnectivityModeOption
                            title="Offline"
                            subtitle="Local processing"
                            icon={DownloadCloud}
                            selected={isOffline}
                            onClick={() => setIsOffline(true)}
                        />
                    </div>
                    <ModeDescription isOffline={isOffline} />
                </div>
            </CardContent>
        </Card>
    );
}

function ConnectivityModeOption({
    title,
    subtitle,
    icon: Icon,
    selected,
    onClick,
}: Readonly<{
    title: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    selected: boolean;
    onClick: () => void;
}>) {
    return (
        <Card
            className={`cursor-pointer transition-all duration-200 relative ${
                selected
                    ? "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-transparent"
                    : "hover:border-primary/30"
            }`}
            onClick={onClick}
        >
            <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div className={`p-2 rounded-lg ${selected ? "bg-primary/20" : "bg-muted"}`}>
                        <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <div className="font-medium text-sm">{title}</div>
                        <div className="text-xs text-muted-foreground">{subtitle}</div>
                    </div>
                    {selected && (
                        <div className="absolute top-2 right-2">
                            <div className="p-1 bg-primary rounded-full">
                                <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ModeDescription({ isOffline }: Readonly<{ isOffline: boolean }>) {
    return (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {isOffline ? (
                <div className="flex items-start gap-2">
                    <DownloadCloud className="min-w-4 min-h-4 h-4 w-4 mt-0.5 text-blue-500" />
                    <div>
                        <strong>Offline Mode:</strong> Your app will run entirely on your
                        local machine. All processing, including AI models, will be handled
                        locally for maximum privacy and reliability.
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-2">
                    <ExternalLink className="min-w-4 min-h-4 h-4 w-4 mt-0.5 text-green-500" />
                    <div>
                        <strong>Online Mode:</strong> Your app can leverage cloud services
                        and remote APIs for enhanced capabilities and performance, while
                        maintaining local execution options.
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateButton({
    canCreate,
    isCreating,
    onCreateApp,
}: Readonly<{
    canCreate: boolean;
    isCreating: boolean;
    onCreateApp: () => void;
}>) {
    return (
        <Button
            onClick={onCreateApp}
            disabled={!canCreate || isCreating}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
        >
            {isCreating ? (
                <>
                    <Settings className="h-5 w-5 mr-2 animate-spin" />
                    Creating App...
                </>
            ) : (
                <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Create App
                </>
            )}
        </Button>
    );
}