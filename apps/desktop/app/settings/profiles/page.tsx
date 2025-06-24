"use client";

import { invoke } from "@tauri-apps/api/core";
import {
	Badge,
	IConnectionMode,
	IThemes,
	Input,
	type UseQueryResult,
	useBackend,
	useInvalidateInvoke,
	useInvoke
} from "@tm9657/flow-like-ui";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tm9657/flow-like-ui/components/ui/card";
import { Label } from "@tm9657/flow-like-ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@tm9657/flow-like-ui/components/ui/select";
import { Switch } from "@tm9657/flow-like-ui/components/ui/switch";
import { Textarea } from "@tm9657/flow-like-ui/components/ui/textarea";
import type { ISettingsProfile } from "@tm9657/flow-like-ui/types";
import { useDebounce } from "@uidotdev/usehooks";
import {
	Calendar,
	Camera,
	Cpu,
	GitBranch,
	Save,
	Settings,
	User,
	X,
	Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTauriInvoke } from "../../../components/useInvoke";
import AMBER_MINIMAL from "./themes/amber-minimal.json";
import AMETHYST_HAZE from "./themes/amethyst-haze.json";
import BOLD_TECH from "./themes/bold-tech.json";
import BUBBLEGUM from "./themes/bubblegum.json";
import CAFFEINE from "./themes/caffeine.json";
import CANDYLAND from "./themes/candyland.json";
import CATPPUCHIN from "./themes/catppuccin.json";
import CLAYMORPHISM from "./themes/claymorphism.json";
import CLEAN_SLATE from "./themes/clean-slate.json";
import COSMIC_NIGHT from "./themes/cosmic-night.json";
import VINTAGE_PAPER from "./themes/vintage-paper.json";

const THEME_TRANSLATION: Record<IThemes, any> = {
	[IThemes.FLOW_LIKE]: undefined,
	[IThemes.AMBER_MINIMAL]: AMBER_MINIMAL,
	[IThemes.AMETHYST_HAZE]: AMETHYST_HAZE,
	[IThemes.BOLD_TECH]: BOLD_TECH,
	[IThemes.BUBBLEGUM]: BUBBLEGUM,
	[IThemes.CAFFEINE]: CAFFEINE,
	[IThemes.CANDYLAND]: CANDYLAND,
	[IThemes.CATPPUCCIN]: CATPPUCHIN,
	[IThemes.CLAYMORPHISM]: CLAYMORPHISM,
	[IThemes.CLEAN_SLATE]: CLEAN_SLATE,
	[IThemes.COSMIC_NIGHT]: COSMIC_NIGHT,
	[IThemes.CYBERPUNK]: undefined,
	[IThemes.DOOM_64]: undefined,
	[IThemes.ELEGANT_LUXURY]: undefined,
	[IThemes.GRAPHITE]: undefined,
	[IThemes.KODAMA_GROVE]: undefined,
	[IThemes.MIDNIGHT_BLOOM]: undefined,
	[IThemes.MOCHA_MOUSSE]: undefined,
	[IThemes.MODERN_MINIMAL]: undefined,
	[IThemes.MONO]: undefined,
	[IThemes.NATURE]: undefined,
	[IThemes.NEO_BRUTALISM]: undefined,
	[IThemes.NORTHERN_LIGHTS]: undefined,
	[IThemes.NOTEBOOK]: undefined,
	[IThemes.OCEAN_BREEZE]: undefined,
	[IThemes.PASTEL_DREAMS]: undefined,
	[IThemes.PERPETUITY]: undefined,
	[IThemes.QUANTUM_ROSE]: undefined,
	[IThemes.RETRO_ARCADE]: undefined,
	[IThemes.SOLAR_DUSK]: undefined,
	[IThemes.STARRY_NIGHT]: undefined,
	[IThemes.SUNSET_HORIZON]: undefined,
	[IThemes.VINTAGE_PAPER]: VINTAGE_PAPER,
};

export default function SettingsPage() {
	const backend = useBackend();
	const invalidate = useInvalidateInvoke();
	const profiles: UseQueryResult<ISettingsProfile> = useTauriInvoke(
		"get_profiles",
		{},
	);

	const currentProfile = useInvoke(backend.getSettingsProfile, []);

	// Local state for editing
	const [localProfile, setLocalProfile] = useState<ISettingsProfile | null>(
		null,
	);
	const debouncedLocalProfile = useDebounce(localProfile, 500);
	const [hasChanges, setHasChanges] = useState(false);

	// Initialize local state when profile loads
	useEffect(() => {
		if (currentProfile.data) {
			setLocalProfile(currentProfile.data);
			setHasChanges(false);
		}
	}, [currentProfile.data]);

	useEffect(() => {
		if (debouncedLocalProfile) {
			upsertProfile(debouncedLocalProfile).then(() => {
				currentProfile.refetch();
			});
			setHasChanges(false);
		}
	}, [debouncedLocalProfile]);

	// Update local state and trigger debounced save
	const updateProfile = (updates: Partial<ISettingsProfile>) => {
		if (!localProfile) return;

		const newProfile = { ...localProfile, ...updates };
		setLocalProfile(newProfile);
		setHasChanges(true);
	};

	async function upsertProfile(profile: ISettingsProfile) {
		await invoke("upsert_profile", { profile });
		await profiles.refetch();
		await invalidate(backend.getProfile, []);
		await currentProfile.refetch();
	}

	if (!localProfile) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center w-full">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
			</main>
		);
	}

	return (
		<main className="min-h-dvh bg-gradient-to-br from-background via-background to-muted/20 p-6 max-h-dvh overflow-y-auto pb-10">
			<div className="mx-auto max-w-6xl space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
							<User className="h-8 w-8 text-primary" />
							{localProfile.hub_profile.name || "Profile Settings"}
						</h1>
						<p className="text-muted-foreground">
							Manage your profile settings and preferences
						</p>
					</div>
					{hasChanges && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Save className="h-4 w-4" />
							Saving changes...
						</div>
					)}
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Profile Information */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Profile Information
							</CardTitle>
							<CardDescription>
								Basic information about your profile
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex gap-6">
								<div className="flex-shrink-0">
									<div className="relative group">
										<img
											className="rounded-lg border-2 border-border hover:border-primary transition-colors"
											width={160}
											height={160}
											src={
												localProfile.hub_profile.thumbnail ??
												"/placeholder-thumbnail.webp"
											}
											alt="Profile thumbnail"
										/>
										<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
											<Camera className="h-8 w-8 text-white" />
										</div>
									</div>
								</div>
								<div className="flex-1 space-y-4">
									<div className="space-y-2">
										<Label htmlFor="name">Profile Name</Label>
										<Input
											id="name"
											placeholder="Enter profile name"
											value={localProfile.hub_profile.name}
											onChange={(e) =>
												updateProfile({
													hub_profile: {
														...localProfile.hub_profile,
														name: e.target.value,
													},
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											placeholder="Describe your profile..."
											value={localProfile.hub_profile.description ?? ""}
											onChange={(e) =>
												updateProfile({
													hub_profile: {
														...localProfile.hub_profile,
														description: e.target.value,
													},
												})
											}
											rows={3}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="hub">Current Hub</Label>
										<Input
											disabled
											id="hub"
											placeholder="Hub name or ID"
											value={localProfile.hub_profile.hub ?? ""}
										/>
									</div>
								</div>
							</div>

							{/* Tags Section */}
							<div className="space-y-2">
								<Label htmlFor="tags">Tags</Label>
								<div className="space-y-2">
									<Input
										id="tags"
										placeholder="Add tag and press Enter"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												const value = e.currentTarget.value.trim();
												if (
													value &&
													!localProfile.hub_profile.tags?.includes(value)
												) {
													updateProfile({
														hub_profile: {
															...localProfile.hub_profile,
															tags: [
																...(localProfile.hub_profile.tags ?? []),
																value,
															],
														},
													});
													e.currentTarget.value = "";
												}
											}
										}}
									/>
									<div className="flex flex-wrap gap-2">
										{localProfile.hub_profile.tags?.map((tag, index) => (
											<Badge
												key={index}
												variant="secondary"
												className="flex items-center gap-1"
											>
												{tag}
												<X
													className="h-3 w-3 cursor-pointer hover:text-destructive"
													onClick={() =>
														updateProfile({
															hub_profile: {
																...localProfile.hub_profile,
																tags: localProfile.hub_profile.tags?.filter(
																	(_, i) => i !== index,
																),
															},
														})
													}
												/>
											</Badge>
										))}
									</div>
								</div>
							</div>

							{/* Interests Section */}
							<div className="space-y-2">
								<Label htmlFor="interests">Interests</Label>
								<div className="space-y-2">
									<Input
										id="interests"
										placeholder="Add interest and press Enter"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												const value = e.currentTarget.value.trim();
												if (
													value &&
													!localProfile.hub_profile.interests?.includes(value)
												) {
													updateProfile({
														hub_profile: {
															...localProfile.hub_profile,
															interests: [
																...(localProfile.hub_profile.interests ?? []),
																value,
															],
														},
													});
													e.currentTarget.value = "";
												}
											}
										}}
									/>
									<div className="flex flex-wrap gap-2">
										{localProfile.hub_profile.interests?.map(
											(interest, index) => (
												<Badge
													key={index}
													variant="outline"
													className="flex items-center gap-1"
												>
													{interest}
													<X
														className="h-3 w-3 cursor-pointer hover:text-destructive"
														onClick={() =>
															updateProfile({
																hub_profile: {
																	...localProfile.hub_profile,
																	interests:
																		localProfile.hub_profile.interests?.filter(
																			(_, i) => i !== index,
																		),
																},
															})
														}
													/>
												</Badge>
											),
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Profile Stats */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Profile Stats
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Created</span>
									<span>
										{new Date(localProfile.created).toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Updated</span>
									<span>
										{new Date(localProfile.updated).toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Apps</span>
									<span className="font-medium">
										{localProfile.hub_profile.apps?.length ?? 0}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Hubs</span>
									<span className="font-medium">
										{localProfile.hub_profile.hubs?.length ?? 0}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Tags</span>
									<span className="font-medium">
										{localProfile.hub_profile.tags?.length ?? 0}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Interests</span>
									<span className="font-medium">
										{localProfile.hub_profile.interests?.length ?? 0}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Execution Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Cpu className="h-5 w-5" />
								Execution Settings
							</CardTitle>
							<CardDescription>
								Configure performance and execution options
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="context_size">Max Context Size</Label>
								<Input
									id="context_size"
									placeholder="8192"
									value={
										localProfile.execution_settings?.max_context_size || ""
									}
									type="number"
									onChange={(e) =>
										updateProfile({
											execution_settings: {
												...localProfile.execution_settings,
												max_context_size: Number.parseInt(e.target.value) || 0,
											},
										})
									}
								/>
							</div>
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label htmlFor="gpu" className="flex items-center gap-2">
										<Zap className="h-4 w-4" />
										GPU Mode
									</Label>
									<p className="text-sm text-muted-foreground">
										Enable GPU acceleration
									</p>
								</div>
								<Switch
									id="gpu"
									checked={localProfile.execution_settings?.gpu_mode ?? true}
									onCheckedChange={(checked) =>
										updateProfile({
											execution_settings: {
												...localProfile.execution_settings,
												gpu_mode: checked,
											},
										})
									}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Theme Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings className="h-5 w-5" />
								Theme Settings
							</CardTitle>
							<CardDescription>
								Customize your visual experience
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<Label htmlFor="theme">Theme</Label>
								<Select
									value={
										localProfile?.hub_profile?.theme?.id ?? IThemes.FLOW_LIKE
									}
									onValueChange={(value: string) =>
										updateProfile({
											hub_profile: {
												...localProfile.hub_profile,
												theme:
													THEME_TRANSLATION[value as IThemes] ??
													THEME_TRANSLATION[IThemes.FLOW_LIKE],
											},
										})
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select theme" />
									</SelectTrigger>
									<SelectContent className="max-h-60">
										{Object.values(IThemes).map((theme) => (
											<SelectItem key={theme} value={theme}>
												{theme}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Credits to{" "}
									<a
										href="https://tweakcn.com/"
										target="_blank"
										className="underline font-bold"
										rel="noreferrer"
									>
										tweakcn.com
									</a>
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Flow Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<GitBranch className="h-5 w-5" />
								Flow Settings
							</CardTitle>
							<CardDescription>
								Configure flow visualization preferences
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<Label htmlFor="connection_mode">Connection Mode</Label>
								<Select
									value={
										localProfile.hub_profile.settings?.connection_mode ??
										IConnectionMode.Simplebezier
									}
									onValueChange={(value: IConnectionMode) =>
										updateProfile({
											hub_profile: {
												...localProfile.hub_profile,
												settings: {
													...localProfile.hub_profile.settings,
													connection_mode: value,
												},
											},
										})
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select connection mode" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={IConnectionMode.Straight}>
											Straight
										</SelectItem>
										<SelectItem value={IConnectionMode.Step}>Step</SelectItem>
										<SelectItem value={IConnectionMode.Simplebezier}>
											Simple Bezier
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
