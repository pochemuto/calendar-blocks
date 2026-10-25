import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { DATE_BLOCK_LANGUAGES } from "../../src/date-block";

export interface VisualCase {
	name: string;
	source: string;
	width?: number;
	locale?: string;
	stretch?: boolean;
}

export const VISUAL_THEMES = ["light", "dark"] as const;
const fixtureDirectory = fileURLToPath(new URL("../test-data/visual/", import.meta.url));

export function loadVisualPlatforms(): string[] {
	return readdirSync(fixtureDirectory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export function parseVisualCase(
	markdown: string,
	filename: string,
	platforms: readonly string[] = ["linux"],
): VisualCase {
	const fail = (message: string): never => { throw new Error(`${filename}: ${message}`); };
	const name = /^(.+)\.md$/.exec(filename);
	if (!name || /-(light|dark)$/.test(name[1])) return fail("expected <case>.md without a theme suffix");
	markdown = markdown.replace(/\r\n/g, "\n");
	let options: Record<string, unknown> = {};
	const lines = markdown.split("\n");
	if (lines[0].trim() === "---") {
		const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
		if (end < 0) return fail("unclosed YAML frontmatter");
		const settings = parseDocument(lines.slice(1, end).join("\n"));
		if (settings.errors.length > 0) return fail(`invalid YAML frontmatter: ${settings.errors[0].message}`);
		options = settings.contents === null ? {} : settings.toJS();
		if (options === null || typeof options !== "object" || Array.isArray(options)) {
			return fail("frontmatter settings must be a YAML mapping");
		}
		markdown = lines.slice(end + 1).join("\n");
	}
	const fencePattern = /^```([^\r\n`]*)\r?\n([\s\S]*?)^```[ \t]*\r?$/gm;
	const blocks = Array.from(markdown.matchAll(fencePattern));
	const dates = blocks.filter((block) => DATE_BLOCK_LANGUAGES.some((language) => language === block[1]));
	if (dates.length !== 1 || dates[0][2].trim() === "") {
		return fail("expected exactly one nonempty date or dates code block");
	}
	if (blocks.some((block) => block[1] === "json")) return fail("settings belong in YAML frontmatter");
	for (const key of Object.keys(options)) {
		if (!["width", "locale", "stretch"].includes(key)) return fail(`unknown setting: ${key}`);
	}
	if (options.width !== undefined && (typeof options.width !== "number" ||
		!Number.isInteger(options.width) || options.width <= 32 || options.width > 900)) {
		return fail("width must be an integer between 33 and 900");
	}
	if (options.locale !== undefined && (typeof options.locale !== "string" || !options.locale.trim())) {
		return fail("locale must be a nonempty string");
	}
	if (options.stretch !== undefined && typeof options.stretch !== "boolean") {
		return fail("stretch must be a boolean");
	}
	// Require rendered image embeds, not links shown as code or hidden in comments.
	const prose = markdown.replace(fencePattern, "").replace(/<!--[\s\S]*?(?:-->|$)/g, "");
	const imagePattern = /^!\[([^\]\r\n]*)\]\(([^)\r\n]*)\)[ \t]*\r?$/gm;
	const images = Array.from(prose.matchAll(imagePattern));
	if (prose.replace(imagePattern, "").includes("![")) {
		return fail("screenshot embeds must use standalone Markdown image lines");
	}
	if (images.length !== platforms.length * VISUAL_THEMES.length) {
		return fail("expected one screenshot embed per platform and theme");
	}
	for (const platform of platforms) {
		for (const theme of VISUAL_THEMES) {
			const path = `${platform}/${name[1]}-${theme}.png`;
			if (!images.some((image) => image[1] === `${platform}-${theme}` && image[2] === path)) {
				return fail(`expected ![${platform}-${theme}](${path})`);
			}
		}
	}
	return {
		name: name[1],
		source: dates[0][2].replace(/\r\n/g, "\n").replace(/\n$/, ""),
		width: options.width as number | undefined,
		locale: options.locale as string | undefined,
		stretch: options.stretch as boolean | undefined,
	};
}

export function loadVisualCases(): VisualCase[] {
	const filenames = readdirSync(fixtureDirectory).filter((filename) => filename.endsWith(".md")).sort();
	if (filenames.length === 0) throw new Error("No Markdown visual cases found");
	const platforms = loadVisualPlatforms();
	if (platforms.length === 0) throw new Error("No visual screenshot platform directories found");
	return filenames.map((filename) => parseVisualCase(
		readFileSync(join(fixtureDirectory, filename), "utf8"), filename, platforms,
	));
}
