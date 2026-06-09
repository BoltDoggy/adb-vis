import { ApplicationMenu, BrowserView, BrowserWindow } from "electrobun/bun";
import type { MainRPC } from "shared/rpc";
import {
	getDevices,
	getDeviceDetails,
	executeShell,
	takeScreenshot,
	listApps,
	installApp,
	uninstallApp,
	pushFile,
	pullFile,
	getLogcat,
	rebootDevice,
	getScreenSize,
	startLogcatStream,
	stopLogcatStream,
} from "./adb";

// HMR: use Vite dev server if running, otherwise use bundled views
async function getMainViewUrl(): Promise<string> {
	try {
		const response = await fetch("http://localhost:5173");
		if (response.ok) {
			return "http://localhost:5173";
		}
	} catch {
		// Vite dev server not running, use bundled views
	}
	return "views://mainview/index.html";
}

// Application menu
ApplicationMenu.setApplicationMenu([
	{
		submenu: [
			{ label: "About ADB Vis", role: "about" },
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
	{
		label: "View",
		submenu: [
			{ label: "Reload", role: "reload", accelerator: "r" },
			{ label: "Toggle DevTools", role: "toggleDevTools", accelerator: "Alt+Command+I" },
		],
	},
]);

// Define RPC handlers for webview communication
const mainRPC = BrowserView.defineRPC<MainRPC>({
	maxRequestTime: 30000,
	handlers: {
		requests: {
			ping: () => "pong",
			getDevices: async () => {
				return await getDevices();
			},
			getDeviceDetails: async ({ serial }) => {
				return await getDeviceDetails(serial);
			},
			executeShell: async ({ serial, command }) => {
				return await executeShell(serial, command);
			},
			takeScreenshot: async ({ serial }) => {
				return await takeScreenshot(serial);
			},
			listApps: async ({ serial, systemOnly }) => {
				return await listApps(serial, systemOnly);
			},
			installApp: async ({ serial, apkPath }) => {
				return await installApp(serial, apkPath);
			},
			uninstallApp: async ({ serial, packageName }) => {
				return await uninstallApp(serial, packageName);
			},
			pushFile: async ({ serial, localPath, remotePath }) => {
				return await pushFile(serial, localPath, remotePath);
			},
			pullFile: async ({ serial, remotePath, localPath }) => {
				return await pullFile(serial, remotePath, localPath);
			},
			getLogcat: async ({ serial, lines, filter }) => {
				return await getLogcat(serial, lines, filter);
			},
			startLogcatStream: async ({ serial, grep, tagOnly }) => {
				await startLogcatStream(serial, (log) => {
					mainRPC.send("logcatStream", { serial, log });
				}, grep, tagOnly);
				return { success: true };
			},
			stopLogcatStream: async ({ serial }) => {
				stopLogcatStream(serial);
				return { success: true };
			},
			rebootDevice: async ({ serial, mode }) => {
				return await rebootDevice(serial, mode);
			},
			getScreenSize: async ({ serial }) => {
				return await getScreenSize(serial);
			},
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
	title: "ADB Vis - Android Debug Bridge Visual Tool",
	url: await getMainViewUrl(),
	frame: {
		width: 1400,
		height: 900,
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

console.log("ADB Vis app started");
