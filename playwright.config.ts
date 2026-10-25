import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/visual",
	testMatch: "**/*.spec.ts",
	snapshotPathTemplate: "{testDir}/../test-data/visual/{platform}/{arg}{ext}",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	updateSnapshots: "none",
	workers: 2,
	reporter: [["list"], ["html", { open: "never" }]],
	expect: {
		toHaveScreenshot: {
			threshold: 0,
			maxDiffPixels: 0,
			animations: "disabled",
			caret: "hide",
			scale: "css",
		},
	},
	use: {
		browserName: "chromium",
		headless: true,
		viewport: { width: 900, height: 1200 },
		deviceScaleFactor: 1,
		locale: "en-US",
		timezoneId: "UTC",
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "node tests/visual/server.mjs",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: false,
	},
});
