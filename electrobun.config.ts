export default {
	app: {
		name: "product",
		identifier: "dev.product.app",
		version: "0.1.0",
	},
	build: {
		useAsar: true,
		bun: {
			entrypoint: "main/index.ts",
			external: [],
		},
		views: {
			// Empty - views are built by postBuild script via Vite
		},
		copy: {
			// HTML is copied, but JS/CSS are built by Vite in postBuild
			"assets/": "views/assets/",
		},
		mac: {
			codesign: false,
			notarize: false,
			bundleCEF: true,
			entitlements: {},
		},
	},
	scripts: {
		postBuild: "./scripts/post-build.ts",
	},
	release: {
		bucketUrl: "",
	},
};
