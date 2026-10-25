export interface VisualCase {
	name: string;
	source: string;
	width?: number;
	locale?: string;
	stretch?: boolean;
}

// Each case produces a separate PNG in both themes. Use fixed dates, never today.
export const visualCases: VisualCase[] = [
	{ name: "single-date", source: "2026.06.06" },
	{ name: "one-week-range", source: "2026.06.02 - 2026.06.05" },
	{ name: "multi-week-range", source: "2026.06.05 - 2026.06.23" },
	{ name: "same-day-range", source: "2026.06.06 - 2026.06.06" },
	{ name: "whole-month", source: "2026.06.01 - 2026.06.30" },
	{ name: "adjacent-months", source: "2026.06.25 - 2026.07.05" },
	{ name: "omitted-months", source: "2026.06.05 - 2026.10.05" },
	{ name: "adjacent-months-narrow", source: "2026.06.25 - 2026.07.05", width: 280 },
	{ name: "omitted-months-narrow", source: "2026.06.05 - 2026.10.05", width: 280 },
	{ name: "overlapping-selections", source: "2026.06.10\n2026.06.05 - 2026.06.18\n2026.06.09 - 2026.06.23\n2026.06.14" },
	{ name: "independent-color-pools", source: "First date: 1 Jun\nFirst range: 2 Jun - 4 Jun\n10 Jun\nSecond range: 12 Jun - 12 Jun\nThird date: 15 Jun\nThird range: 16 Jun - 18 Jun" },
	{ name: "multiple-rows", source: "2026.12.01\n2026.06.25 - 2026.07.05\n2026.09.01\n2027.01.01" },
	{ name: "multiple-rows-narrow", source: "2026.12.01\n2026.06.25 - 2026.07.05\n2026.09.01\n2027.01.01", width: 280 },
	{ name: "legend", source: "1 Jun\nVacation: 5 Jun - 18 Jun\nBirthday: 10 Jun\nConference: 14 Jun - 15 Jun" },
	{ name: "legend-wrapping", source: "Длинная подпись с переносом на несколько строк: 5 Jun - 18 Jun\n<img src=x> & plain text: 10 Jun", width: 240, locale: "ru" },
	{ name: "russian", source: "Отпуск: 25 марта - 4 апреля\nВстреча: 1 апреля", locale: "ru" },
	{ name: "german", source: "2026.03.25 - 2026.04.04", locale: "de" },
	{ name: "stretched-single", source: "2026.06.06", stretch: true },
	{ name: "stretched-pair", source: "2026.06.05 - 2026.10.05", stretch: true },
	{ name: "stretched-narrow", source: "2026.06.05 - 2026.10.05", stretch: true, width: 280 },
	{ name: "leap-february", source: "2024.02.28 - 2024.02.29" },
	{ name: "four-week-month", source: "2027.02.01 - 2027.02.28" },
	{ name: "six-week-month", source: "2026.03.01 - 2026.03.31" },
	{ name: "year-boundary", source: "2026.12.28 - 2027.01.04" },
	{ name: "full-palette", source: Array.from({ length: 40 }, (_, index) =>
		`Color ${index + 1}: ${index < 30 ? `${index + 1} Jun` : `${index - 29} Jul`}`,
	).join("\n") },
	{ name: "full-range-palette", source: Array.from({ length: 40 }, (_, index) => {
		const date = index < 30 ? `${index + 1} Jun` : `${index - 29} Jul`;
		return `Color ${index + 1}: ${date} - ${date}`;
	}).join("\n") },
];
