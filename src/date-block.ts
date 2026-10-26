export const DATE_BLOCK_LANGUAGES = ["date", "dates"] as const;

/** Zero-based source order, independent of which blocks Obsidian renders first. */
export function getCalendarBlockIndex(markdown: string, lineStart: number): number {
	let count = 0;
	let fence: { character: string; length: number } | undefined;
	const lines = markdown.split(/\r?\n/);
	let firstLine = 0;
	if (lines[0].replace(/^\uFEFF/, "").trim() === "---") {
		const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
		if (end < 0) return 0;
		firstLine = end + 1;
	}
	for (let line = firstLine; line < Math.min(lineStart, lines.length); line++) {
		// Strip blockquote/list prefixes as well as indentation before a fence.
		const match = /^(?:[ \t]*>[ \t]?)*[ \t]*(?:[-+*][ \t]+|\d+[.)][ \t]+)?(`{3,}|~{3,})(.*)$/.exec(lines[line]);
		if (match === null) continue;
		const [, delimiter, info] = match;
		if (fence !== undefined) {
			if (delimiter[0] === fence.character && delimiter.length >= fence.length && info.trim() === "") {
				fence = undefined;
			}
			continue;
		}
		if (delimiter[0] === "`" && info.includes("`")) continue;
		fence = { character: delimiter[0], length: delimiter.length };
		const language = info.trim().split(/\s+/)[0];
		if (DATE_BLOCK_LANGUAGES.some((name) => name === language)) count++;
	}
	return count;
}
