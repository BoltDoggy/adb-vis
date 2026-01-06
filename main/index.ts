import { ApplicationMenu, BrowserView, BrowserWindow } from "electrobun/bun";
import type { MainRPC } from "shared/rpc";

// Application menu
ApplicationMenu.setApplicationMenu([
	{
		submenu: [
			{ label: "About product", role: "about" },
			{ type: "separator" },
			{ label: "Quit", role: "quit", accelerator: "q" },
		],
	},
	{
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ role: "selectAll" },
		],
	},
]);

// Define RPC handlers for webview communication
const mainRPC = BrowserView.defineRPC<MainRPC>({
	maxRequestTime: 5000,
	handlers: {
		requests: {
			ping: () => "pong",
			getGreeting: () => "Greetings from the Bun side!",
		},
		messages: {
			log: ({ msg }) => {
				console.log("[Webview]:", msg);
			},
		},
	},
});

// Create main window
const mainWindow = new BrowserWindow({
	title: "product",
	url: "views://main/index.html",
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
	rpc: mainRPC,
});

// Handle window events
mainWindow.on("close", () => {
	console.log("Main window closed");
	process.exit(0);
});

mainWindow.webview.on("dom-ready", () => {
	console.log("Webview DOM ready");
});

console.log("product app app started");
