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
		["1 Mar", 0, "invalid-year"],
		["1 Mar", 10000, "invalid-year"],
		["1 Mar", NaN, "invalid-year"],
		["29 Feb", 2025, "invalid-day"],
		["31/04/2026", 2026, "invalid-day"],
		["1 Unknown 2026", 2026, "invalid-month"],
		["12/31/2026", 2026, "invalid-month"],
		["2026-03.02", 2026, "invalid-format"],
		["02.03/2026", 2026, "invalid-format"],
		["1 Mar 26", 2026, "invalid-format"],
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
		["4 апреля 2026 - 1 марта 2026", "reversed-range"],
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

	it.each([
		"2025.07.27 - 2025.07.27",
		"2025-7-27 – 27/7/2025",
		"27 Jul 2025 — 27 July",
		"27 Jul - 27 July 2025",
		"27.7 - 27 Jul",
	])("collapses equal endpoints into a single date: %s", (source) => {
		expect(parseDateInput(source, 2025)).toEqual({
			ok: true,
			value: { kind: "single", date: { year: 2025, month: 7, day: 27 } },
		});
	});
	it.each(["1 Mar 2005 - 1 Mar", "1 Mar - 1 Mar 2005"])("collapses inferred equal endpoints after resolving explicit years: %s", (source) => {
		expect(parseDateInput(source, 2026)).toEqual({
			ok: true, value: { kind: "single", date: { year: 2005, month: 3, day: 1 } },
		});
	});
});

describe("formatDateSelection", () => {
	it("preserves a collapsed range's label and formats it as a single date", () => {
		const result = parseDateInput("Vacation: 27 Jul 2025 - 27 Jul");
		expect(result).toEqual({
			ok: true, value: { kind: "single", date: { year: 2025, month: 7, day: 27 }, label: "Vacation" },
		});
		if (!result.ok) throw new Error(result.message);
		expect(formatDateSelection(result.value)).toBe("Vacation: 2025.07.27");
	});
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

describe("multiple date entries", () => {
	it("parses mixed ranges and dates, blank lines, CRLF and inherited years", () => {
		expect(parseDateInput(" 1 Mar - 4 Mar\r\n\r\n 3 Mar\r\n5.4 - 7.4 ", 2026)).toEqual({
			ok: true, value: { kind: "multiple", entries: [
				{ kind: "range", start: { year: 2026, month: 3, day: 1 }, end: { year: 2026, month: 3, day: 4 } },
				{ kind: "single", date: { year: 2026, month: 3, day: 3 } },
				{ kind: "range", start: { year: 2026, month: 4, day: 5 }, end: { year: 2026, month: 4, day: 7 } },
			] },
		});
	});
	it.each([
		["2026.03.01\n2026.02.30", "invalid-day", "Line 2"],
		["2026.03.01\n\n2026.04.02 - 2026.04.01", "reversed-range", "Line 3"],
		["1 Mar\n2026.03.01", "missing-year", "Line 1"],
		["2026.03.01 -\n2026.03.02", "invalid-format", "Line 1"],
	])("rejects the entire block for an invalid line", (source, code, line) => {
		expect(parseDateInput(source)).toMatchObject({ ok: false, code, message: expect.stringContaining(line) });
	});
	it("round trips a multi-line selection", () => {
		const source = "2026.03.01 - 2026.03.04\n2026.03.03";
		const result = parseDateInput(source);
		if (!result.ok) throw new Error(result.message);
		expect(formatDateSelection(result.value)).toBe(source);
	});
});

describe("years inferred from previous entries", () => {
	it.each([
		["Vacation: 7 May 2027 - 17 May\nBirthday: 9 May", "Vacation: 2027.05.07 - 2027.05.17\nBirthday: 2027.05.09"],
		["30 Dec 2010 - 7 Jan\n9 Jan\n5 Dec", "2010.12.30 - 2011.01.07\n2011.01.09\n2010.12.05"],
		["2026.03.01\n1 Mar", "2026.03.01\n2026.03.01"],
		["31 Dec 2010\n1 Jan - 7 Jan", "2010.12.31\n2011.01.01 - 2011.01.07"],
		["1 Jan 2011\n31 Dec", "2011.01.01\n2010.12.31"],
		["1 Jan 2010\n1 Jan 2020\n2 Jan", "2010.01.01\n2020.01.01\n2010.01.02"],
		["1 Jan 2010\n1 Jan 2020\n31 Dec 2009\n30 Dec", "2010.01.01\n2020.01.01\n2009.12.31\n2010.12.30"],
		["1 Jan 2027\n28 Dec - 1 Jan 2006", "2027.01.01\n2005.12.28 - 2006.01.01"],
		["1 Jan 2027\n9 May 2000", "2027.01.01\n2000.05.09"],
		["1 Jan 2027\n\n9.5\n10/5", "2027.01.01\n2027.05.09\n2027.05.10"],
		["1 Sep 2023\n29 Feb", "2023.09.01\n2024.02.29"],
		["1 Jan 2100\n29 Feb", "2100.01.01\n2096.02.29"],
		["1 Jan 0001\n31 Dec", "0001.01.01\n0001.12.31"],
		["31 Dec 9999\n1 Jan", "9999.12.31\n9999.01.01"],
		["2 Jul 2025\n1 Jan", "2025.07.02\n2025.01.01"],
	])("resolves %s using the entire preceding span", (source, expected) => {
		for (const creationYear of [undefined, 2004]) {
			const result = parseDateInput(source, creationYear);
			if (!result.ok) throw new Error(result.message);
			expect(formatDateSelection(result.value)).toBe(expected);
			expect(parseDateInput(expected)).toEqual(result);
		}
	});
	it("uses creation metadata for the first entry, then extends the span", () => {
		const result = parseDateInput("30 Dec - 7 Jan\n9 Jan\n5 Dec", 2010);
		if (!result.ok) throw new Error(result.message);
		expect(formatDateSelection(result.value)).toBe("2010.12.30 - 2011.01.07\n2011.01.09\n2010.12.05");
	});
	it.each(["31 Apr", "30 Feb", "1 Jan 0000", "7 May 2027 - 1 May 2027"])("still rejects invalid entries: %s", (entry) => {
		expect(parseDateInput(`7 May 2027\n${entry}`)).toMatchObject({
			ok: false, message: expect.stringContaining("Line 2"),
		});
	});
});


describe("entry limit", () => {
	it.each(["2026.06.05 - 2026.06.11", "2026.06.10", "2026.06.10 - 2026.06.10"])(
		"accepts 40 entries and rejects the 41st: %s", (entry) => {
			const forty = Array(40).fill(entry).join("\n");
			expect(parseDateInput(forty)).toMatchObject({ ok: true });
			expect(parseDateInput(`${forty}\n${entry}`)).toMatchObject({
				ok: false,
				code: "too-many-entries",
				message: "Line 41: A date block supports at most 40 ranges and single dates in total.",
			});
		},
	);
	it("counts ranges and single dates together while ignoring blank lines", () => {
		const forty = Array.from({ length: 40 }, (_, index) =>
			index % 2 === 0 ? "2026.06.05 - 2026.06.11" : "2026.06.10",
		).join("\n\n");
		expect(parseDateInput(forty).ok).toBe(true);
		expect(parseDateInput(`${forty}\n\n2026.06.12`)).toMatchObject({
			ok: false, code: "too-many-entries", message: expect.stringContaining("Line 81:"),
		});
	});
});


describe("labeled entries", () => {
	it("parses a named range with the note creation year", () => {
		expect(parseDateInput(" Vacation : 1 Mar - 9 Mar ", 2026)).toEqual({
			ok: true, value: { kind: "range", label: "Vacation",
				start: { year: 2026, month: 3, day: 1 }, end: { year: 2026, month: 3, day: 9 } },
		});
	});
	it("preserves labels, localized dates and unlabeled entries when formatting", () => {
		const parsed = parseDateInput("Отпуск 🌴: 1 марта - 9 марта\n2026.03.10\nBirthday: 11 Mar", 2026, "ru");
		if (!parsed.ok) throw new Error(parsed.message);
		expect(formatDateSelection(parsed.value)).toBe("Отпуск 🌴: 2026.03.01 - 2026.03.09\n2026.03.10\nBirthday: 2026.03.11");
		expect(parseDateInput(formatDateSelection(parsed.value))).toEqual(parsed);
	});
	it.each([
		[": 2026.03.01", "invalid-format"],
		["Vacation:", "invalid-format"],
		["Vacation: 31 Feb 2026", "invalid-day"],
		["Vacation: 9 Mar 2026 - 1 Mar 2026", "reversed-range"],
		["Vacation: 1 Mar - 9 Mar", "missing-year"],
		["Vacation: 2026.03.01: extra", "invalid-format"],
	])("validates dates and labels in %s", (source, code) => {
		expect(parseDateInput(source)).toMatchObject({ ok: false, code });
	});
	it("reports the line number of an invalid labeled entry", () => {
		expect(parseDateInput("2026.03.01\nVacation: 31 Feb 2026")).toMatchObject({
			ok: false, code: "invalid-day", message: expect.stringContaining("Line 2:"),
		});
	});
	it("applies the 40-entry limit to labeled entries", () => {
		const source = Array(40).fill("Vacation: 1 Mar 2026 - 9 Mar 2026").join("\n");
		expect(parseDateInput(source).ok).toBe(true);
		expect(parseDateInput(`${source}\nBirthday: 10 Mar 2026`)).toMatchObject({ ok: false, code: "too-many-entries" });
	});
});


describe("omitted range end year", () => {
	it.each([
		["28 Dec 2005 - 1 Jan", undefined, "en", 2005, 12, 28, 2006, 1, 1],
		["28 Dec 2005 - 1 Jan", 2026, "en", 2005, 12, 28, 2006, 1, 1],
		["1 Mar 2005 - 9 Mar", 2026, "en", 2005, 3, 1, 2005, 3, 9],
		["31 Dec - 1 Jan", 2026, "en", 2026, 12, 31, 2027, 1, 1],
		["28.12.2005 - 1.1", undefined, "en", 2005, 12, 28, 2006, 1, 1],
		["28/12/2005 — 1/1", 2026, "en", 2005, 12, 28, 2006, 1, 1],
		["28 декабря 2005 – 1 января", undefined, "ru", 2005, 12, 28, 2006, 1, 1],
		["28 Mar 2005 - 1 Mar", undefined, "en", 2005, 3, 28, 2006, 3, 1],
		["28 Dec 2023 - 29 Feb", undefined, "en", 2023, 12, 28, 2024, 2, 29],
	])("infers the end year in %s", (source, year, locale, sy, sm, sd, ey, em, ed) => {
		expect(parseDateInput(source, year, locale)).toEqual({
			ok: true, value: { kind: "range", start: { year: sy, month: sm, day: sd }, end: { year: ey, month: em, day: ed } },
		});
	});
	it.each([
		["28 Dec 9999 - 1 Jan", "invalid-year"],
		["28 Dec 2024 - 29 Feb", "invalid-day"],
		["28 Dec 2005 - 31 Apr", "invalid-day"],
		["28 Dec 2005 - 1 Jan 2005", "reversed-range"],
	])("validates inferred dates and preserves explicit years in %s", (source, code) => {
		expect(parseDateInput(source)).toMatchObject({ ok: false, code });
	});
	it("infers each labeled range independently in multi-line blocks", () => {
		const result = parseDateInput("Vacation: 28 Dec 2005 - 1 Jan\nTrip: 1 Mar 2008 - 9 Mar");
		if (!result.ok) throw new Error(result.message);
		expect(formatDateSelection(result.value)).toBe("Vacation: 2005.12.28 - 2006.01.01\nTrip: 2008.03.01 - 2008.03.09");
	});
});


describe("omitted range start year", () => {
	it.each([
		["28 Dec - 1 Jan 2006", undefined, "en", 2005, 12, 28, 2006, 1, 1],
		["28 Dec - 1 Jan 2006", 2026, "en", 2005, 12, 28, 2006, 1, 1],
		["1 Mar - 9 Mar 2005", 2026, "en", 2005, 3, 1, 2005, 3, 9],
		["28.12 - 1.1.2006", undefined, "en", 2005, 12, 28, 2006, 1, 1],
		["28/12 — 2006-01-01", undefined, "en", 2005, 12, 28, 2006, 1, 1],
		["28 декабря – 1 января 2006", undefined, "ru", 2005, 12, 28, 2006, 1, 1],
		["28 Mar - 1 Mar 2006", undefined, "en", 2005, 3, 28, 2006, 3, 1],
		["29 Feb - 1 Jan 2025", 2026, "en", 2024, 2, 29, 2025, 1, 1],
	])("infers the start year in %s", (source, year, locale, sy, sm, sd, ey, em, ed) => {
		expect(parseDateInput(source, year, locale)).toEqual({
			ok: true, value: { kind: "range", start: { year: sy, month: sm, day: sd }, end: { year: ey, month: em, day: ed } },
		});
	});
	it.each([
		["28 Dec - 1 Jan 0001", "invalid-year"],
		["29 Feb - 1 Jan 2024", "invalid-day"],
		["31 Apr - 1 Jan 2006", "invalid-day"],
		["28 Dec 2006 - 1 Jan 2006", "reversed-range"],
	])("validates inferred starts in %s", (source, code) => {
		expect(parseDateInput(source)).toMatchObject({ ok: false, code });
	});
	it("infers years independently for labeled ranges in both directions", () => {
		const result = parseDateInput("Vacation: 28 Dec - 1 Jan 2006\nTrip: 28 Dec 2008 - 1 Jan", 2026);
		if (!result.ok) throw new Error(result.message);
		expect(formatDateSelection(result.value)).toBe("Vacation: 2005.12.28 - 2006.01.01\nTrip: 2008.12.28 - 2009.01.01");
	});
});
