import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function generateReleaseNotes(tag, cwd = process.cwd()) {
	if (!/^\d+\.\d+\.\d+$/.test(tag)) {
		throw new Error("Expected a release tag in the form 1.2.3.");
	}
	const git = (...args) => execFileSync("git", args, {
		cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
	}).trim();
	// Fail for a missing release tag instead of silently describing another ref.
	const releaseRef = `refs/tags/${tag}`;
	git("rev-parse", "--verify", `${releaseRef}^{commit}`);
	const changelog = git("show", `${releaseRef}:CHANGELOG.md`);
	let previousTag;
	const hasParent = git("rev-list", "--parents", "-n", "1", releaseRef).split(" ").length > 1;
	if (hasParent) {
		const releaseTags = git("tag", "--merged", `${releaseRef}^`, "--list")
			.split("\n").filter((name) => /^v?\d+\.\d+\.\d+$/.test(name));
		if (releaseTags.length > 0) {
			previousTag = git("describe", "--tags", "--abbrev=0",
				...releaseTags.flatMap((name) => ["--match", name]), `${releaseRef}^`);
		}
	}
	const addedLines = previousTag
		? git("diff", "--no-ext-diff", "--no-textconv", "--no-color", "--unified=0",
			previousTag, releaseRef, "--", "CHANGELOG.md")
			.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"))
			.map((line) => line.slice(1))
		: changelog.split("\n");
	const entries = addedLines.map((line) => /^-\s+(.+?)\s*$/.exec(line)?.[1]).filter(Boolean);
	const uniqueEntries = [...new Set(entries)];
	return uniqueEntries.length > 0
		? `${uniqueEntries.map((entry) => `- ${entry}`).join("\n")}\n`
		: "No changes.\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [, , tag, outputPath] = process.argv;
	if (!outputPath) throw new Error("Usage: generate-release-notes.mjs <tag> <output-path>");
	writeFileSync(outputPath, generateReleaseNotes(tag));
}
