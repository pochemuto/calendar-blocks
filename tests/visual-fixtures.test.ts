import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { loadVisualCases, loadVisualPlatforms, parseVisualCase, VISUAL_THEMES } from "./visual/markdown-fixtures";

const input = "```dates\nVacation: 2026.06.25 - 2026.07.05\n```";
const fixtureDirectory = new URL("./test-data/visual/", import.meta.url);
const screenshots = (name: string): string =>
	`![linux-light](linux/${name}-light.png)\n\n![linux-dark](linux/${name}-dark.png)`;

describe("Markdown visual cases", () => {
	it("reads shared dates from a GitHub-viewable fixture", () => {
		const markdown = `${input}\n\nLinux Light / Linux Dark\n\n${screenshots("adjacent-months")}`;
		expect(parseVisualCase(markdown, "adjacent-months.md")).toMatchObject({
			name: "adjacent-months", source: "Vacation: 2026.06.25 - 2026.07.05",
		});
	});
	it("reads YAML frontmatter and preserves source whitespace and blank lines", () => {
		const markdown = '---\nwidth: 280\nlocale: "ru"\nstretch: true # enable stretching\n---\n\n```date\n  1 Jun\n\n2 Jun - 3 Jun\n```\n\n' + screenshots("narrow");
		expect(parseVisualCase(markdown.replace(/\n/g, "\r\n"), "narrow.md")).toEqual({
			name: "narrow", source: "  1 Jun\n\n2 Jun - 3 Jun",
			width: 280, locale: "ru", stretch: true,
			showToday: undefined,
			markerSeed: undefined,
		});
	});
	it("allows empty frontmatter with default settings", () => {
		expect(parseVisualCase(`---\n---\n\n${input}\n\n${screenshots("case")}`, "case.md"))
			.toMatchObject({ width: undefined, locale: undefined, stretch: undefined });
	});
	it("shares one input across all screenshot platforms and themes", () => {
		const platforms = ["linux", "darwin", "win32"];
		const images = platforms.map((platform) => screenshots("case").replace(/linux/g, platform)).join("\n\n");
		expect(parseVisualCase(`${input}\n\n${images}`, "case.md", platforms)).toMatchObject({
			name: "case", source: "Vacation: 2026.06.25 - 2026.07.05",
		});
	});
	it("requires both theme screenshots for every platform", () => {
		expect(() => parseVisualCase(`${input}\n\n${screenshots("case")}`, "case.md", ["linux", "darwin"]))
			.toThrow("one screenshot embed per platform and theme");
	});
	it("checks screenshot names on platforms other than Linux", () => {
		const images = `${screenshots("case")}\n\n${screenshots("other").replace(/linux/g, "darwin")}`;
		expect(() => parseVisualCase(`${input}\n\n${images}`, "case.md", ["linux", "darwin"]))
			.toThrow("expected ![darwin-light](darwin/case-light.png)");
	});
	it.each([
		["case-light.md", input],
		["case-dark.md", input],
		["case.txt", input],
		["case.md", "No input"],
		["case.md", "```dates\n\n```"],
		["case.md", `${input}\n${input}`],
		["case.md", `${input}\n\n\`\`\`json\n{"stretch":true}\n\`\`\``],
		["case.md", `---\nwidth: [\n---\n${input}`],
		["case.md", `---\nnull\n---\n${input}`],
		["case.md", `---\n- width\n---\n${input}`],
		["case.md", `---\nwidth: 280\nwidth: 300\n---\n${input}`],
		["case.md", `---\nwidht: 280\n---\n${input}`],
		["case.md", `---\nstretch: "true"\n---\n${input}`],
		["case.md", `---\nwidth: 0\n---\n${input}`],
		["case.md", `---\nlocale: 42\n---\n${input}`],
		["case.md", `---\nwidth: 280\n${input}`],
	])("reports invalid fixture %s with its filename", (filename, markdown) => {
		expect(() => parseVisualCase(`${markdown}\n\n${screenshots("case")}`, filename)).toThrow(`${filename}:`);
	});
	it.each([
		["missing all images", ""],
		["missing dark image", "![linux-light](linux/case-light.png)"],
		["duplicate light image", "![linux-light](linux/case-light.png)\n![linux-light](linux/case-light.png)"],
		["wrong scenario", screenshots("other")],
		["wrong directory", screenshots("case").replace(/linux\//g, "../linux/")],
		["absolute path", screenshots("case").replace(/\(linux\//g, "(/linux/")],
		["swapped images", "![linux-light](linux/case-dark.png)\n![linux-dark](linux/case-light.png)"],
		["ordinary links", screenshots("case").replace(/!/g, "")],
		["escaped parentheses", screenshots("case").replace(/\(/g, "\\(")],
		["images in a code fence", `\`\`\`markdown\n${screenshots("case")}\n\`\`\``],
		["images in a comment", `<!--\n${screenshots("case")}\n-->`],
		["extra image", `${screenshots("case")}\n![extra](linux/extra.png)`],
		["extra inline image", `${screenshots("case")}\nSee ![extra](wrong.png) here`],
	])("rejects malformed screenshot embeds: %s", (_description, images) => {
		expect(() => parseVisualCase(`${input}\n\n${images}`, "case.md")).toThrow("case.md:");
	});
	it("loads Markdown fixtures without duplicate snapshot names", () => {
		const cases = loadVisualCases();
		expect(cases.length).toBeGreaterThan(0);
		expect(new Set(cases.map((entry) => entry.name)).size).toBe(cases.length);
	});
	it.each(loadVisualCases())("$name embeds existing PNGs for every platform and theme", (fixture) => {
		const filename = `${fixture.name}.md`;
		const markdown = readFileSync(new URL(filename, fixtureDirectory), "utf8");
		// Validates the actual embeds in the document before checking their targets.
		expect(parseVisualCase(markdown, filename, loadVisualPlatforms())).toEqual(fixture);
		for (const platform of loadVisualPlatforms()) {
			for (const theme of VISUAL_THEMES) {
				const image = new URL(`${platform}/${fixture.name}-${theme}.png`, fixtureDirectory);
				expect(statSync(image).isFile(), `${filename}: ${image.pathname}`).toBe(true);
				expect(readFileSync(image).subarray(0, 8).toString("hex"), `${filename}: PNG signature`)
					.toBe("89504e470d0a1a0a");
			}
		}
	});
	it("has a same-named Markdown fixture for every reference PNG, with no orphan fixtures", () => {
		const markdownNames = readdirSync(fixtureDirectory).filter((name) => name.endsWith(".md"))
			.map((name) => name.replace(/\.md$/, "")).sort();
		for (const platform of loadVisualPlatforms()) {
			const pngNames = readdirSync(new URL(`${platform}/`, fixtureDirectory)).filter((name) => name.endsWith(".png"))
				.map((name) => name.replace(/\.png$/, "")).sort();
			const expected = markdownNames.flatMap((name) => VISUAL_THEMES.map((theme) => `${name}-${theme}`)).sort();
			expect(pngNames, platform).toEqual(expected);
		}
	});
});
