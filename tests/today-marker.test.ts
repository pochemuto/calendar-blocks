import { describe, expect, it } from "vitest";
import { getTodayMarkerIndex, TODAY_MARKER_COUNT } from "../src/today-marker";

describe("today marker identity", () => {
	const today = { year: 2026, month: 10, day: 26 };

	it("is repeatable and reaches all four variants", () => {
		const variants = new Set<number>();
		for (let index = 0; index < 100; index++) {
			const variant = getTodayMarkerIndex(today, "note.md", index);
			expect(getTodayMarkerIndex(today, "note.md", index)).toBe(variant);
			variants.add(variant);
		}
		expect([...variants].sort()).toEqual([0, 1, 2, 3]);
		expect(variants.size).toBe(TODAY_MARKER_COUNT);
	});

	it("uses each of the date, filename and calendar ordinal to vary the result", () => {
		const days = new Set<number>();
		const names = new Set<number>();
		const ordinals = new Set<number>();
		for (let index = 0; index < 28; index++) {
			days.add(getTodayMarkerIndex({ ...today, day: index + 1 }, "note.md", 0));
			names.add(getTodayMarkerIndex(today, `заметка-${index}.md`, 0));
			ordinals.add(getTodayMarkerIndex(today, "note.md", index));
		}
		for (const variants of [days, names, ordinals]) expect(variants.size).toBe(4);
	});
});
