import esbuild from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { builtinModules } from "node:module";

const production = process.argv[2] === "production";
const buildDirectory = "build";

await rm(buildDirectory, { recursive: true, force: true });
await mkdir(buildDirectory, { recursive: true });
await Promise.all([
	copyFile("manifest.json", `${buildDirectory}/manifest.json`),
	copyFile("styles.css", `${buildDirectory}/styles.css`),
]);

const buildOptions = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	outfile: `${buildDirectory}/main.js`,
};

if (production) {
	await esbuild.build(buildOptions);
} else {
	const context = await esbuild.context(buildOptions);
	await context.watch();
}
