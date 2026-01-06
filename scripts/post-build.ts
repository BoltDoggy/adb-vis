import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const { ELECTROBUN_BUILD_DIR, ELECTROBUN_APP_NAME } = process.env;

if (!ELECTROBUN_BUILD_DIR || !ELECTROBUN_APP_NAME) {
	console.error("Missing ELECTROBUN_BUILD_DIR or ELECTROBUN_APP_NAME environment variables");
	console.error("This script should be run by Electrobun's postBuild hook");
	process.exit(1);
}

const APP_BUNDLE_FOLDER = path.join(ELECTROBUN_BUILD_DIR, `${ELECTROBUN_APP_NAME}.app`);
const VIEWS_FOLDER = path.join(APP_BUNDLE_FOLDER, "Contents", "Resources", "app", "views", "main");

// Build webview with Vite (vite.config.ts is at project root)
execSync("bun run vite build", {
	cwd: path.resolve("."),
	stdio: "inherit",
});

// Ensure views folder exists
if (!existsSync(VIEWS_FOLDER)) {
	mkdirSync(VIEWS_FOLDER, { recursive: true });
}

// Copy built webview files to app bundle
const webviewDist = path.resolve("dist/webview");
if (!existsSync(webviewDist)) {
	console.error(`Webview dist folder not found: ${webviewDist}`);
	process.exit(1);
}

cpSync(webviewDist, VIEWS_FOLDER, { recursive: true });
