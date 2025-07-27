import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import playformCompress from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://flow-like.com",
	integrations: [
		react(),
		// markdoc(),
		// robotsTxt(),
		// sitemap(),
		// playformCompress(),
	],
	vite: {
		ssr: {
			noExternal: [
				"katex",
				"rehype-katex",
				"@tm9657/flow-like-ui",
				"lodash-es",
				"@platejs/math",
				"react-lite-youtube-embed",
				"react-tweet",
			],
		},
		plugins: [tailwindcss()],
	},
	output: "static",
	markdown: {
		shikiConfig: {
			themes: {
				light: "min-light",
				dark: "nord",
			},
			wrap: true,
		},
	},
});
