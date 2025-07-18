import type { IProfile } from "./lib/schema/profile/profile";

export interface ISystemInfo {
	cores: number;
	vram: number;
	ram: number;
}

interface IExecutionSettings {
	gpu_mode: boolean;
	max_context_size: number;
}

export interface ISettingsProfile {
	hub_profile: IProfile;
	execution_settings: IExecutionSettings;
	updated: string;
	created: string;
}

export interface IDate {
	secs_since_epoch: number;
	nanos_since_epoch: number;
}

export enum IThemes {
	FLOW_LIKE = "Flow Like",
	AMBER_MINIMAL = "Amber Minimal",
	AMETHYST_HAZE = "Amethyst Haze",
	BOLD_TECH = "Bold Tech",
	BUBBLEGUM = "Bubblegum",
	CAFFEINE = "Caffeine",
	CANDYLAND = "Candyland",
	CATPPUCCIN = "Catppuccin",
	CLAYMORPHISM = "Claymorphism",
	CLEAN_SLATE = "Clean Slate",
	COSMIC_NIGHT = "Cosmic Night",
	CYBERPUNK = "Cyberpunk",
	DOOM_64 = "Doom 64",
	ELEGANT_LUXURY = "Elegant Luxury",
	GRAPHITE = "Graphite",
	KODAMA_GROVE = "Kodama Grove",
	MIDNIGHT_BLOOM = "Midnight Bloom",
	MOCHA_MOUSSE = "Mocha Mousse",
	MODERN_MINIMAL = "Modern Minimal",
	MONO = "Mono",
	NATURE = "Nature",
	NEO_BRUTALISM = "Neo Brutalism",
	NORTHERN_LIGHTS = "Northern Lights",
	NOTEBOOK = "Notebook",
	OCEAN_BREEZE = "Ocean Breeze",
	PASTEL_DREAMS = "Pastel Dreams",
	PERPETUITY = "Perpetuity",
	QUANTUM_ROSE = "Quantum Rose",
	RETRO_ARCADE = "Retro Arcade",
	SOLAR_DUSK = "Solar Dusk",
	STARRY_NIGHT = "Starry Night",
	SUNSET_HORIZON = "Sunset Horizon",
	VINTAGE_PAPER = "Vintage Paper",
}
