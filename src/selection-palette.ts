// Each entry kind advances independently; colors live exclusively in styles.css.
export const MAX_DATE_ENTRIES = 40;

export function getEntryPaletteClasses(
	entries: readonly { kind: "single" | "range" }[],
): string[] {
	const nextIndex = { single: 1, range: 1 };
	return entries.map((entry) => `calendar-blocks-palette-${nextIndex[entry.kind]++}`);
}
