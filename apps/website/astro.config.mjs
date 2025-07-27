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
		define: {
			// stub out `process.env` so next/dist/client code can import it without blowing up
			"process.env": {},
			// if any code reads process.env.NODE_ENV, you can explicitly set it:
			"process.env.NODE_ENV": JSON.stringify(
				process.env.NODE_ENV || "production",
			),
		},
		plugins: [
			{
				name: "ignore-css-imports-ssr",
				enforce: "pre",
				load(id, { ssr }) {
					if (ssr && id.endsWith(".css")) {
						// pretend it was an empty module
						return { code: "" };
					}
				},
			},
			tailwindcss(),
		],
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
