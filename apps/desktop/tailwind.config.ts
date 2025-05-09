import preset from "@tm9657/flow-like-ui/tailwind.config";
import type { Config } from "tailwindcss";

const config = {
	presets: [preset],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"../../node_modules/@tm9657/flow-like-ui/**/*.{ts,tsx}",
	],
} satisfies Config;

export default config;
