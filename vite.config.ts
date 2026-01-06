import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	root: "webview",
	base: "./",
	build: {
		outDir: "../dist/webview",
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(__dirname, "webview/index.html"),
			output: {
				entryFileNames: "index.js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "webview"),
			shared: path.resolve(__dirname, "shared"),
		},
	},
});
