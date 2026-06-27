import { describe, expect, it } from "vitest";

import { formatDateSelection, parseDateInput } from "../src/date-parser";

describe("parseDateInput", () => {
	it("parses a single date", () => {
		expect(parseDateInput("2025.07.27")).toEqual({
			ok: true,
			value: {
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
		});
	});

	it("parses a date range with surrounding whitespace", () => {
		expect(parseDateInput("\n 2025.07.27  -\t2025.08.03 \n")).toEqual({
			ok: true,
			value: {
				kind: "range",
				start: { year: 2025, month: 7, day: 27 },
				end: { year: 2025, month: 8, day: 3 },
			},
		});
	});

	it.each(["2000.02.29", "2024.02.29"])(
		"accepts the leap date %s",
		(source) => {
			expect(parseDateInput(source).ok).toBe(true);
		},
	);

	it.each([
		["", "invalid-format"],
		["2025.7.27", "invalid-format"],
		["2025.07.27\n2025.08.03", "invalid-format"],
		["date: 2025.07.27", "invalid-format"],
		["0000.01.01", "invalid-year"],
		["2025.00.01", "invalid-month"],
		["2025.13.01", "invalid-month"],
		["2025.04.31", "invalid-day"],
		["2025.02.29", "invalid-day"],
		["2100.02.29", "invalid-day"],
	])("rejects %s with %s", (source, code) => {
		expect(parseDateInput(source)).toMatchObject({ ok: false, code });
	});

	it("rejects a reversed range", () => {
		expect(parseDateInput("2025.08.03 - 2025.07.27")).toMatchObject({
			ok: false,
			code: "reversed-range",
		});
	});

	it("allows a one-day range", () => {
		expect(parseDateInput("2025.07.27 - 2025.07.27")).toMatchObject({
			ok: true,
			value: { kind: "range" },
		});
	});
});

describe("formatDateSelection", () => {
	it("formats a parsed range canonically", () => {
		const result = parseDateInput(" 2025.07.27-2025.08.03 ");
		expect(result.ok).toBe(true);

		if (result.ok) {
			expect(formatDateSelection(result.value)).toBe(
				"2025.07.27 - 2025.08.03",
			);
		}
	});
});
