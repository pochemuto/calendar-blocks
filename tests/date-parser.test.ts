import { describe, expect, it, vi } from "vitest";

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

	it.each([
		"2026.3.2", "2026-03-02", "2026/3/2", "02.03.2026",
		"2/3/2026", "2 Mar 2026", "2 March 2026", "2 MAR. 2026",
	])("parses the supported format %s", (source) => {
		expect(parseDateInput(source, 2001)).toEqual({
			ok: true,
			value: { kind: "single", date: { year: 2026, month: 3, day: 2 } },
		});
	});

	it.each(["2.3", "02/03", "2 Mar", "2 march"])(
		"uses the supplied creation year for %s", (source) => {
			expect(parseDateInput(source, 2004)).toMatchObject({
				ok: true, value: { date: { year: 2004, month: 3, day: 2 } },
			});
		},
	);

	it.each([
		"1 Mar - 4 Apr", "1 March–4 April", "01.03 — 04.04",
		"2026-03-01-2026-04-04", "1 Mar 2026 - 04/04/2026",
		"1 Mar - 4 Apr 2026", "1 Mar 2026 - 4 Apr",
	])("parses a flexible range %s", (source) => {
		expect(parseDateInput(source, 2026)).toEqual({
			ok: true,
			value: {
				kind: "range",
				start: { year: 2026, month: 3, day: 1 },
				end: { year: 2026, month: 4, day: 4 },
			},
		});
	});

	it.each<[string, number | undefined, string]>([
		["1 Mar", undefined, "missing-year"],
		["1.3", undefined, "missing-year"],
		["1 Mar - 4 Apr 2026", undefined, "missing-year"],
		["1 Mar", 0, "invalid-year"],
		["1 Mar", 10000, "invalid-year"],
		["1 Mar", NaN, "invalid-year"],
		["29 Feb", 2025, "invalid-day"],
		["31/04/2026", 2026, "invalid-day"],
		["1 Unknown 2026", 2026, "invalid-month"],
		["12/31/2026", 2026, "invalid-month"],
		["31 Dec - 1 Jan", 2026, "reversed-range"],
		["2026-03.02", 2026, "invalid-format"],
		["02.03/2026", 2026, "invalid-format"],
		["1 Mar 26", 2026, "invalid-format"],
		["1 Mar\n4 Apr", 2026, "invalid-format"],
		["2026-03-02 trailing", 2026, "invalid-format"],
	])("rejects %s with creation year %s", (source, year, code) => {
		expect(parseDateInput(source, year)).toMatchObject({ ok: false, code });
	});

	it("validates leap dates using the creation year", () => {
		expect(parseDateInput("29 Feb", 2024).ok).toBe(true);
	});

	it.each([
		"Jan", "February", "Mar", "April", "May", "Jun", "July", "Aug",
		"Sept", "October", "Nov", "December",
	])("recognizes month %s", (name) => {
		const result = parseDateInput(`1 ${name} 2026`);
		expect(result.ok).toBe(true);
		if (result.ok && result.value.kind === "single") {
			const names = ["Jan", "February", "Mar", "April", "May", "Jun", "July", "Aug", "Sept", "October", "Nov", "December"];
			expect(result.value.date.month).toBe(names.indexOf(name) + 1);
		}
	});

	it.each<[string, string, number]>([
		["ru-RU", "1 марта", 3],
		["ru", "1 март", 3],
		["ru", "1 МАР.", 3],
		["ru", "1 МАЯ 2026", 5],
		["de_CH", "1 März", 3],
		["de", "1 Ma\u0308rz", 3],
		["fr", "1 FÉVR.", 2],
		["pl", "1 marca", 3],
		["fi", "1 maaliskuuta", 3],
		["tr", "1 MAYIS", 5],
		["ar", "1 مارس", 3],
		["vi", "1 tháng 3", 3],
		["zh", "1 三月", 3],
		["ru", "1 March", 3],
		["invalid_locale!", "1 March", 3],
	])("parses %s month name %s", (locale, source, month) => {
		expect(parseDateInput(source, 2026, locale)).toEqual({
			ok: true,
			value: { kind: "single", date: { year: 2026, month, day: 1 } },
		});
	});

	it("parses a localized range using the note creation year", () => {
		expect(parseDateInput("1 марта - 4 апр.", 2004, "ru")).toEqual({
			ok: true,
			value: {
				kind: "range",
				start: { year: 2004, month: 3, day: 1 },
				end: { year: 2004, month: 4, day: 4 },
			},
		});
	});

	it("accepts system month names even when the app uses English", () => {
		const options = new Intl.DateTimeFormat().resolvedOptions();
		const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
			.mockReturnValue({ ...options, locale: "ru-RU" });
		try {
			for (const locale of [undefined, "en"]) {
				expect(parseDateInput("1 марта", 2026, locale)).toMatchObject({
					ok: true, value: { date: { year: 2026, month: 3, day: 1 } },
				});
			}
		} finally {
			spy.mockRestore();
		}
	});

	it.each([
		["31 апреля", "invalid-day"],
		["29 февраля", "invalid-day"],
		["1 неизвестный", "invalid-month"],
		["4 апреля - 1 марта", "reversed-range"],
	])("validates localized date %s", (source, code) => {
		expect(parseDateInput(source, 2026, "ru")).toMatchObject({ ok: false, code });
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
