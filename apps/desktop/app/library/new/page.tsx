"use client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Checkbox,
	type IBit,
	IBitTypes,
	type IMetadata,
	Input,
	Label,
	Textarea,
	humanFileSize,
	nowSystemTime,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import {
	Brain,
	Check,
	DownloadCloud,
	ExternalLink,
	FileSearch,
	FileText,
	Filter,
	Grid,
	Package2,
	PackageCheck,
	Plus,
	Rocket,
	ScanEye,
	Search,
	Settings,
	Sparkles,
	Tag,
	Workflow,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Crossfire from "react-canvas-confetti/dist/presets/crossfire";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";

const BLANK_BIT: IBit = {
	authors: [],
	created: "",
	dependencies: [],
	dependency_tree_hash: "",
	hash: "",
	hub: "",
	icon: "/blank-template.webp",
	id: "blank",
	license: "",
	meta: {
		en: {
			description: "Start from a blank canvas and create your own App",
			long_description: "Create your own App from scratch",
			name: "Blank",
			tags: [],
			use_case: "Create your own App from scratch",
			created_at: nowSystemTime(),
			updated_at: nowSystemTime(),
			preview_media: [],
		},
	},
	parameters: {},
	size: 0,
	type: IBitTypes.Template,
	updated: "",
	version: "",
};

export default function CreateAppPage() {
	const backend = useBackend();
	const auth = useAuth();
	const router = useRouter();
	const templates = useInvoke(backend.searchBits, [
		{ bit_types: [IBitTypes.Template] },
	]);
	const apps = useInvoke(backend.getApps, []);
	const currentProfile = useInvoke(backend.getSettingsProfile, []);

	const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
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
		selectedTemplate !== "" &&
		(skipModels || selectedModels.length > 0);

	const handleCreateApp = async () => {
		if (!canCreate) return;

		setIsCreating(true);
		try {
			await backend.createApp(meta, selectedModels, selectedTemplate, !isOffline);
			setShowConfetti(true);
			toast(`${isOffline ? "Offline" : "Online"} app created successfully! 🎉`);
			await apps.refetch();
			setTimeout(() => {
				router.push("/library/apps");
			}, 2000);
		} catch (error) {
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
				{/* Header */}
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

				<div className="grid lg:grid-cols-3 gap-8">
					{/* Left Column - App Details */}
					<div className="lg:col-span-1 space-y-6">
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
									<Label
										htmlFor="description"
										className="flex items-center gap-2"
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
										rows={4}
										className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 resize-none"
									/>
								</div>
							</CardContent>
						</Card>

						{/* App Configuration */}
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
									<Label className="text-sm font-medium">
										Connectivity Mode
									</Label>
									<div className="grid grid-cols-2 gap-3">
										<Card
											className={`cursor-pointer transition-all duration-200 ${
												!isOffline
													? "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-transparent"
													: "hover:border-primary/30"
											}`}
											onClick={() => {
												if(!auth?.isAuthenticated) {
													toast.error("You must be logged in to create an online project.");
													return;
												}
												setIsOffline(false)
											}}
										>
											<CardContent className="p-4 text-center">
												<div className="flex flex-col items-center gap-2">
													<div
														className={`p-2 rounded-lg ${!isOffline ? "bg-primary/20" : "bg-muted"}`}
													>
														<ExternalLink
															className={`h-5 w-5 ${!isOffline ? "text-primary" : "text-muted-foreground"}`}
														/>
													</div>
													<div>
														<div className="font-medium text-sm">Online</div>
														<div className="text-xs text-muted-foreground">
															Cloud-powered
														</div>
													</div>
													{!isOffline && (
														<div className="absolute top-2 right-2">
															<div className="p-1 bg-primary rounded-full">
																<Check className="h-3 w-3 text-primary-foreground" />
															</div>
														</div>
													)}
												</div>
											</CardContent>
										</Card>

										<Card
											className={`cursor-pointer transition-all duration-200 relative ${
												isOffline
													? "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-transparent"
													: "hover:border-primary/30"
											}`}
											onClick={() => setIsOffline(true)}
										>
											<CardContent className="p-4 text-center">
												<div className="flex flex-col items-center gap-2">
													<div
														className={`p-2 rounded-lg ${isOffline ? "bg-primary/20" : "bg-muted"}`}
													>
														<DownloadCloud
															className={`h-5 w-5 ${isOffline ? "text-primary" : "text-muted-foreground"}`}
														/>
													</div>
													<div>
														<div className="font-medium text-sm">Offline</div>
														<div className="text-xs text-muted-foreground">
															Local processing
														</div>
													</div>
													{isOffline && (
														<div className="absolute top-2 right-2">
															<div className="p-1 bg-primary rounded-full">
																<Check className="h-3 w-3 text-primary-foreground" />
															</div>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									</div>
									<div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
										{isOffline ? (
											<div className="flex items-start gap-2">
												<DownloadCloud className="min-w-4 min-h-4 h-4 w-4 mt-0.5 text-blue-500" />
												<div>
													<strong>Offline Mode:</strong> Your app will run
													entirely on your local machine. All processing,
													including AI models, will be handled locally for
													maximum privacy and reliability.
												</div>
											</div>
										) : (
											<div className="flex items-start gap-2">
												<ExternalLink className="min-w-4 min-h-4 h-4 w-4 mt-0.5 text-green-500" />
												<div>
													<strong>Online Mode:</strong> Your app can leverage
													cloud services and remote APIs for enhanced
													capabilities and performance, while maintaining local
													execution options.
												</div>
											</div>
										)}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Create Button */}
						<Button
							onClick={handleCreateApp}
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
					</div>

					{/* Right Column - Templates & Models */}
					<div className="lg:col-span-2 space-y-6">
						{/* Templates Section */}
						<Card className="border-2 hover:border-primary/20 transition-all duration-300">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-lg">
										<Workflow className="h-5 w-5 text-primary" />
									</div>
									<div className="flex-1">
										<CardTitle>Choose Template</CardTitle>
										<CardDescription>
											Start with a pre-built template or create from scratch
										</CardDescription>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowTemplateModal(true)}
										className="gap-2"
									>
										<Grid className="h-4 w-4" />
										Browse All
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
									<TemplateCard
										bit={BLANK_BIT}
										selected={selectedTemplate === "blank"}
										onSelect={() => setSelectedTemplate("blank")}
									/>
									{templates.data?.slice(0, 5).map((bit) => (
										<TemplateCard
											key={bit.id}
											bit={bit}
											selected={selectedTemplate === bit.id}
											onSelect={() => setSelectedTemplate(bit.id)}
										/>
									))}
								</div>
								{templates.data && templates.data.length > 5 && (
									<div className="mt-4 text-center">
										<Button
											variant="ghost"
											onClick={() => setShowTemplateModal(true)}
											className="text-sm text-muted-foreground hover:text-primary"
										>
											+{templates.data.length - 5} more templates
										</Button>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Models Section */}
						<Card className="border-2 hover:border-primary/20 transition-all duration-300">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-lg">
										<Brain className="h-5 w-5 text-primary" />
									</div>
									<div className="flex-1">
										<CardTitle>Embedding Models</CardTitle>
										<CardDescription>
											Select models for semantic search and AI capabilities
										</CardDescription>
									</div>
									<div className="flex items-center gap-2">
										{!skipModels && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setShowModelModal(true)}
												className="gap-2"
											>
												<Grid className="h-4 w-4" />
												Browse All
											</Button>
										)}
										<div className="flex items-center space-x-2">
											<Checkbox
												id="skip-models"
												checked={skipModels}
												onCheckedChange={(checked) => {
													setSkipModels(checked as boolean);
													if (checked) setSelectedModels([]);
												}}
											/>
											<Label
												htmlFor="skip-models"
												className="text-sm text-muted-foreground cursor-pointer"
											>
												Skip
											</Label>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{!skipModels ? (
									<div className="space-y-4">
										<div className="grid md:grid-cols-2 gap-4">
											{currentProfile.data?.hub_profile.bits
												?.slice(0, 4)
												.map((bit) => (
													<ModelCard
														key={bit}
														bitId={bit.split(":")[1]}
														hub={bit.split(":")[0]}
														selected={selectedModels.includes(
															bit.split(":")[1],
														)}
														onToggle={(id) => {
															setSelectedModels((prev) =>
																prev.includes(id)
																	? prev.filter((m) => m !== id)
																	: [...prev, id],
															);
														}}
													/>
												))}
										</div>
										{currentProfile.data?.hub_profile.bits &&
											currentProfile.data.hub_profile.bits.length > 4 && (
												<div className="text-center">
													<Button
														variant="ghost"
														onClick={() => setShowModelModal(true)}
														className="text-sm text-muted-foreground hover:text-primary"
													>
														+{currentProfile.data.hub_profile.bits.length - 4}{" "}
														more models
													</Button>
												</div>
											)}
										{selectedModels.length > 0 && (
											<div className="text-center text-sm text-muted-foreground">
												{selectedModels.length} model
												{selectedModels.length !== 1 ? "s" : ""} selected
											</div>
										)}
									</div>
								) : (
									<div className="text-center py-8 text-muted-foreground">
										<Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p>
											Model selection skipped - you can{" "}
											<span className="highlight">NOT</span> add models later
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Creation Progress */}
						<Card className="border-2 bg-gradient-to-br from-primary/5 to-transparent">
							<CardHeader className="pb-4">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-lg">
										<Check className="h-5 w-5 text-primary" />
									</div>
									<div className="flex-1">
										<CardTitle className="text-lg">Creation Progress</CardTitle>
										<CardDescription className="text-sm">
											{canCreate
												? "Ready to create"
												: "Complete all steps to proceed"}
										</CardDescription>
									</div>
									{canCreate && (
										<div className="flex items-center gap-1 text-emerald-600 text-sm">
											<Check className="h-4 w-4" />
											Ready
										</div>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="space-y-2">
									<div
										className={`flex items-center gap-2 text-sm ${meta.name.trim() !== "" ? "text-emerald-600" : "text-muted-foreground"}`}
									>
										{meta.name.trim() !== "" ? (
											<Check className="h-4 w-4" />
										) : (
											<div className="h-4 w-4 rounded-full border-2" />
										)}
										App Name
									</div>
									<div
										className={`flex items-center gap-2 text-sm ${meta.description.trim() !== "" ? "text-emerald-600" : "text-muted-foreground"}`}
									>
										{meta.description.trim() !== "" ? (
											<Check className="h-4 w-4" />
										) : (
											<div className="h-4 w-4 rounded-full border-2" />
										)}
										Description
									</div>
									<div
										className={`flex items-center gap-2 text-sm ${selectedTemplate !== "" ? "text-emerald-600" : "text-muted-foreground"}`}
									>
										{selectedTemplate !== "" ? (
											<Check className="h-4 w-4" />
										) : (
											<div className="h-4 w-4 rounded-full border-2" />
										)}
										Template Selected
									</div>
									<div
										className={`flex items-center gap-2 text-sm ${skipModels || selectedModels.length > 0 ? "text-emerald-600" : "text-muted-foreground"}`}
									>
										{skipModels || selectedModels.length > 0 ? (
											<Check className="h-4 w-4" />
										) : (
											<div className="h-4 w-4 rounded-full border-2" />
										)}
										{skipModels
											? "Models Skipped"
											: selectedModels.length > 0
												? `${selectedModels.length} Model${selectedModels.length !== 1 ? "s" : ""} Selected`
												: "Model Selection"}
									</div>
									<div className="flex items-center gap-2 text-sm text-emerald-600">
										<Check className="h-4 w-4" />
										{isOffline ? "Offline Mode" : "Online Mode"}
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Template Selection Modal */}
			<TemplateModal
				open={showTemplateModal}
				onClose={() => setShowTemplateModal(false)}
				templates={[BLANK_BIT, ...(templates.data || [])]}
				selectedTemplate={selectedTemplate}
				onSelectTemplate={(id) => {
					setSelectedTemplate(id);
					setShowTemplateModal(false);
				}}
			/>

			{/* Model Selection Modal */}
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

function TemplateCard({
	bit,
	selected,
	onSelect,
}: Readonly<{
	bit: IBit;
	selected: boolean;
	onSelect: () => void;
}>) {
	return (
		<Card
			className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
				selected
					? "ring-2 ring-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
					: "hover:border-primary/30"
			}`}
			onClick={onSelect}
		>
			<CardContent className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<Avatar className="h-12 w-12 border-2 border-background shadow-sm">
						<AvatarImage src={bit.icon} />
						<AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
							<Workflow className="h-6 w-6" />
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold truncate">{bit.meta?.en?.name}</h3>
						<Badge
							variant={selected ? "default" : "secondary"}
							className="text-xs"
						>
							<Workflow className="h-3 w-3 mr-1" />
							Template
						</Badge>
					</div>
					{selected && (
						<div className="p-1.5 bg-primary rounded-full">
							<Check className="h-4 w-4 text-primary-foreground" />
						</div>
					)}
				</div>
				<p className="text-sm text-muted-foreground line-clamp-2">
					{bit.meta?.en?.description}
				</p>
			</CardContent>
		</Card>
	);
}

// Template Modal Component
function TemplateModal({
	open,
	onClose,
	templates,
	selectedTemplate,
	onSelectTemplate,
}: Readonly<{
	open: boolean;
	onClose: () => void;
	templates: IBit[];
	selectedTemplate: string;
	onSelectTemplate: (id: string) => void;
}>) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	if (!open) return null;

	const filteredTemplates = templates.filter((template) => {
		const matchesSearch =
			template.meta?.en?.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			template.meta?.en?.description
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesTags =
			selectedTags.length === 0 ||
			selectedTags.some((tag) => template.meta?.en?.tags.includes(tag));
		return matchesSearch && matchesTags;
	});

	const allTags = [
		...new Set(templates.flatMap((t) => t.meta?.en?.tags || [])),
	];

	return (
		<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
			<div className="fixed inset-4 bg-background border rounded-lg shadow-2xl flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Workflow className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h2 className="text-2xl font-bold">Choose Template</h2>
							<p className="text-muted-foreground">
								Select a template to start building your app
							</p>
						</div>
					</div>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Search and Filters */}
				<div className="p-6 border-b space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search templates..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					{allTags.length > 0 && (
						<div className="flex items-center gap-2 flex-wrap">
							<Filter className="h-4 w-4 text-muted-foreground" />
							{allTags.map((tag) => (
								<Badge
									key={tag}
									variant={selectedTags.includes(tag) ? "default" : "outline"}
									className="cursor-pointer"
									onClick={() => {
										setSelectedTags((prev) =>
											prev.includes(tag)
												? prev.filter((t) => t !== tag)
												: [...prev, tag],
										);
									}}
								>
									{tag}
								</Badge>
							))}
						</div>
					)}
				</div>

				{/* Templates Grid */}
				<div className="flex-1 overflow-auto p-6">
					<div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{filteredTemplates.map((template) => (
							<TemplateCard
								key={template.id}
								bit={template}
								selected={selectedTemplate === template.id}
								onSelect={() => onSelectTemplate(template.id)}
							/>
						))}
					</div>
					{filteredTemplates.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No templates found matching your criteria</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Model Modal Component
function ModelModal({
	open,
	onClose,
	models,
	selectedModels,
	onUpdateModels,
}: Readonly<{
	open: boolean;
	onClose: () => void;
	models: string[];
	selectedModels: string[];
	onUpdateModels: (models: string[]) => void;
}>) {
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [localSelectedModels, setLocalSelectedModels] =
		useState(selectedModels);

	if (!open) return null;

	const handleSave = () => {
		onUpdateModels(localSelectedModels);
		onClose();
	};

	const handleToggle = (id: string) => {
		setLocalSelectedModels((prev) =>
			prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
		);
	};

	return (
		<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
			<div className="fixed inset-4 bg-background border rounded-lg shadow-2xl flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Brain className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h2 className="text-2xl font-bold">Select Models</h2>
							<p className="text-muted-foreground">
								Choose embedding models for your app
							</p>
						</div>
					</div>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Search and Filters */}
				<div className="p-6 border-b space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search models..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-muted-foreground" />
						<Badge
							variant={typeFilter === "all" ? "default" : "outline"}
							className="cursor-pointer"
							onClick={() => setTypeFilter("all")}
						>
							All Types
						</Badge>
						<Badge
							variant={typeFilter === "embedding" ? "default" : "outline"}
							className="cursor-pointer"
							onClick={() => setTypeFilter("embedding")}
						>
							Text Embedding
						</Badge>
						<Badge
							variant={typeFilter === "image" ? "default" : "outline"}
							className="cursor-pointer"
							onClick={() => setTypeFilter("image")}
						>
							Image Embedding
						</Badge>
					</div>
				</div>

				{/* Models Grid */}
				<div className="flex-1 overflow-auto p-6">
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{models.map((bit) => (
							<ModelCard
								key={bit}
								bitId={bit.split(":")[1]}
								hub={bit.split(":")[0]}
								selected={localSelectedModels.includes(bit.split(":")[1])}
								onToggle={handleToggle}
								searchQuery={searchQuery}
								typeFilter={typeFilter}
							/>
						))}
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						{localSelectedModels.length} model
						{localSelectedModels.length !== 1 ? "s" : ""} selected
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSave}>Save Selection</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Updated ModelCard to support filtering
function ModelCard({
	bitId,
	hub,
	selected,
	onToggle,
	searchQuery = "",
	typeFilter = "all",
}: Readonly<{
	bitId: string;
	hub: string;
	selected: boolean;
	onToggle: (id: string) => void;
	searchQuery?: string;
	typeFilter?: string;
}>) {
	const backend = useBackend();
	const bitData = useInvoke(backend.getBit, [bitId, hub]);
	const isInstalled = useInvoke(
		backend.isBitInstalled,
		[bitData.data!],
		!!bitData.data,
	);
	const bitSize = useInvoke(
		backend.getBitSize,
		[bitData.data!],
		!!bitData.data,
	);

	if (!bitData.data) return null;
	if (
		bitData.data.type !== IBitTypes.Embedding &&
		bitData.data.type !== IBitTypes.ImageEmbedding
	)
		return null;

	// Apply filters
	if (
		searchQuery &&
		!bitData.data.meta?.en?.name
			.toLowerCase()
			.includes(searchQuery.toLowerCase())
	) {
		return null;
	}

	if (typeFilter !== "all") {
		if (typeFilter === "embedding" && bitData.data.type !== IBitTypes.Embedding)
			return null;
		if (
			typeFilter === "image" &&
			bitData.data.type !== IBitTypes.ImageEmbedding
		)
			return null;
	}

	const getTypeIcon = (type: IBitTypes) => {
		switch (type) {
			case IBitTypes.Embedding:
				return FileSearch;
			case IBitTypes.ImageEmbedding:
				return ScanEye;
			default:
				return Package2;
		}
	};

	const TypeIcon = getTypeIcon(bitData.data.type);

	return (
		<Card
			className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
				selected
					? "ring-2 ring-primary shadow-md shadow-primary/10 bg-gradient-to-br from-primary/5 to-transparent"
					: "hover:border-primary/20"
			}`}
			onClick={() => onToggle(bitId)}
		>
			<CardContent className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<Avatar className="h-10 w-10 border border-border">
						<AvatarImage src={bitData.data.icon} />
						<AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10">
							<TypeIcon className="h-5 w-5" />
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<h4 className="font-medium truncate text-sm">
							{bitData.data.meta?.en?.name}
						</h4>
						<div className="flex items-center gap-2 mt-1">
							<Badge variant="outline" className="text-xs">
								<TypeIcon className="h-3 w-3 mr-1" />
								{bitData.data.type}
							</Badge>
							{isInstalled.data && (
								<Badge
									variant="secondary"
									className="text-xs bg-emerald-100 text-emerald-700"
								>
									<PackageCheck className="h-3 w-3 mr-1" />
									{humanFileSize(bitSize.data ?? 0)}
								</Badge>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						{selected ? (
							<div className="p-1.5 bg-primary rounded-full">
								<Check className="h-3 w-3 text-primary-foreground" />
							</div>
						) : (
							<div className="p-1.5 border-2 border-muted rounded-full">
								<Plus className="h-3 w-3 text-muted-foreground" />
							</div>
						)}
					</div>
				</div>
				<p className="text-xs text-muted-foreground line-clamp-2">
					{bitData.data.meta?.en?.description}
				</p>
			</CardContent>
		</Card>
	);
}
