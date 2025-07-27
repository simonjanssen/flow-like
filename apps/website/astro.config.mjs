import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
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
