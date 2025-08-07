"use client";
/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
const nextConfig = {
	output: "export",
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
	images: {
		unoptimized: true,
	},
	staticPageGenerationTimeout: 120,
	missingSuspenseWithCSRBailout: false,
	experimental: {
		missingSuspenseWithCSRBailout: false,
		serverComponentsHmrCache: true,
		webpackMemoryOptimizations: true,
		webpackBuildWorkers: true,
		preloadEntriesOnStart: false,
		reactCompiler: true,
	},
	devIndicators: {
		appIsrStatus: false,
	},
	transpilePackages: ["@tm9657/flow-like-ui"],
};

export default withSentryConfig(nextConfig, {
	org: "good-code",
	project: "flow-like-desktop",

	// An auth token is required for uploading source maps.
	authToken: process.env.SENTRY_AUTH_TOKEN,

	silent: false, // Can be used to suppress logs
});
