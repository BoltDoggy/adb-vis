import { Electroview } from "electrobun/view";
import type { MainRPC, LogEntry } from "shared/rpc";

const logcatCallbacks = new Map<string, Set<(log: LogEntry) => void>>();

const rpc = Electroview.defineRPC<MainRPC>({
	maxRequestTime: 5000,
	handlers: {
		requests: {},
		messages: {
			logcatStream: ({ serial, log }) => {
				const callbacks = logcatCallbacks.get(serial);
				if (callbacks) {
					for (const cb of callbacks) {
						cb(log);
					}
				}
			},
		},
	},
});

export const electrobun = new Electroview({ rpc });

// Logcat stream helper
export function registerLogcatCallback(serial: string, callback: (log: LogEntry) => void) {
	const callbacks = logcatCallbacks.get(serial);
	if (callbacks) {
		callbacks.add(callback);
	} else {
		logcatCallbacks.set(serial, new Set([callback]));
	}
	return () => {
		const cbs = logcatCallbacks.get(serial);
		if (cbs) {
			cbs.delete(callback);
			if (cbs.size === 0) {
				logcatCallbacks.delete(serial);
			}
		}
	};
}
