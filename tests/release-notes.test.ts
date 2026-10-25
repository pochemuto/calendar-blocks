import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let directory: string;
const git = (...args: string[]) => execFileSync("git", args, {
	cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
});
const commit = (message = "Internal implementation change") => git("commit", "--allow-empty", "-m", message);
function recordChangelog(content: string) {
	writeFileSync(join(directory, "CHANGELOG.md"), content);
	git("add", "CHANGELOG.md");
	commit();
}
const script = fileURLToPath(new URL("../scripts/generate-release-notes.mjs", import.meta.url));
function generateReleaseNotes(tag: string): string {
	const output = join(directory, "notes.md");
	execFileSync(process.execPath, [script, tag, output], {
		cwd: directory, stdio: ["ignore", "pipe", "pipe"],
	});
	return readFileSync(output, "utf8");
}

describe("release notes from the changelog diff", () => {
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "calendar-blocks-release-notes-"));
		git("init", "--quiet");
		git("config", "user.name", "Release notes test");
		git("config", "user.email", "release-test@example.invalid");
		git("config", "commit.gpgsign", "false");
	});
	afterEach(() => rmSync(directory, { recursive: true, force: true }));

	it.each(["0.1.0", "v0.1.0"])("lists only new unique bullets since %s in file order", (previousTag) => {
		recordChangelog("- Previously released feature.\n");
		git("tag", previousTag);
		recordChangelog("- Previously released feature.\n- Render dates correctly.\n");
		git("tag", "checkpoint");
		recordChangelog("- Previously released feature.\n- Render dates correctly.\n- Improve the legend.\n- Render dates correctly.\n");
		git("tag", "0.1.1-preview");
		commit("This subject must not appear in the release notes");
		git("tag", "-a", "0.1.1", "-m", "Release 0.1.1");
		recordChangelog("- A change committed after the release.\n");
		writeFileSync(join(directory, "CHANGELOG.md"), "- An uncommitted change.\n");
		expect(generateReleaseNotes("0.1.1")).toBe("- Render dates correctly.\n- Improve the legend.\n");
	});

	it("uses the nearest preceding release rather than all older releases", () => {
		recordChangelog("- Initial feature.\n");
		git("tag", "0.1.0");
		recordChangelog("- Initial feature.\n- Already released.\n");
		git("tag", "0.1.1");
		recordChangelog("- Initial feature.\n- Already released.\n- New fix.\n");
		git("tag", "0.1.2");
		expect(generateReleaseNotes("0.1.2")).toBe("- New fix.\n");
	});

	it("includes every bullet for the first release, including on the root commit", () => {
		recordChangelog("- Render calendars.\n- Highlight dates.\n- Render calendars.\n");
		git("tag", "0.1.0");
		expect(generateReleaseNotes("0.1.0")).toBe("- Render calendars.\n- Highlight dates.\n");
	});

	it("includes the full changelog when the previous release did not have one", () => {
		commit("Initial release without a changelog");
		git("tag", "v0.1.0");
		recordChangelog("- Infer missing years.\n- Search plugin settings.\n");
		git("tag", "0.1.1");
		expect(generateReleaseNotes("0.1.1")).toBe("- Infer missing years.\n- Search plugin settings.\n");
	});

	it("ignores deleted bullets, unchanged entries and non-list text", () => {
		recordChangelog("- Retained feature.\n- Removed entry.\n");
		git("tag", "0.1.0");
		recordChangelog("# Changelog\n\n- Retained feature.\n\nA note outside the list.\n- A new improvement.\n");
		git("tag", "0.1.1");
		expect(generateReleaseNotes("0.1.1")).toBe("- A new improvement.\n");
	});

	it("provides an explicit description when the changelog has not changed", () => {
		recordChangelog("- Existing feature.\n");
		git("tag", "0.1.0");
		commit("Maintenance without a changelog addition");
		git("tag", "0.1.1");
		expect(generateReleaseNotes("0.1.1")).toBe("No changes.\n");
	});

	it("preserves literal Markdown and shell characters", () => {
		recordChangelog("- Fix `dates` and $(literal) parsing.\n");
		git("tag", "0.1.0");
		expect(generateReleaseNotes("0.1.0")).toBe("- Fix `dates` and $(literal) parsing.\n");
	});

	it("fails if the release changelog is missing rather than using commit subjects", () => {
		commit("Internal implementation details");
		git("tag", "0.1.0");
		expect(() => generateReleaseNotes("0.1.0")).toThrow();
	});

	it("rejects missing tags and non-release refs", () => {
		recordChangelog("- Initial feature.\n");
		expect(() => generateReleaseNotes("0.1.0")).toThrow();
		expect(() => generateReleaseNotes("HEAD")).toThrow("Expected a release tag");
	});
});
