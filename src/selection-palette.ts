// Each entry kind uses this palette independently, in source order.
export const SELECTION_COLORS = [
	"var(--calendar-blocks-red, #d32f2f)",
	"#2563eb",
	"#16a34a",
	"#ea580c",
	"#9333ea",
	"#0891b2",
	"#db2777",
	"#ca8a04",
	"#4f46e5",
	"#0d9488",
	"#e11d48",
	"#65a30d",
	"#0284c7",
	"#c026d3",
	"#d97706",
	"#7c3aed",
	"#059669",
	"#dc2626",
	"#475569",
	"#a16207",
	"#1e40af",
	"#166534",
	"#9a3412",
	"#6b21a8",
	"#155e75",
	"#9d174d",
	"#854d0e",
	"#3730a3",
	"#115e59",
	"#9f1239",
	"#3f6212",
	"#075985",
	"#86198f",
	"#92400e",
	"#5b21b6",
	"#065f46",
	"#991b1b",
	"#64748b",
	"#a855f7",
	"#06b6d4",
] as const;

export const MAX_DATE_ENTRIES = SELECTION_COLORS.length;

export function getEntryColors(
	entries: readonly { kind: "single" | "range" }[],
): string[] {
	const nextIndex = { single: 0, range: 0 };
	return entries.map((entry) => SELECTION_COLORS[nextIndex[entry.kind]++]);
}
