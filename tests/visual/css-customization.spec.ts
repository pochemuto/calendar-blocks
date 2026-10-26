import { expect, test } from "@playwright/test";
import { loadVisualCases } from "./markdown-fixtures";

for (const theme of ["light", "dark"]) {
	test(`CSS snippets apply live with inherited variables / ${theme}`, async ({ page }) => {
		await page.clock.setFixedTime(new Date("2026-10-26T12:00:00Z"));
		await page.goto("/");
		await page.evaluate(async (theme) => {
			await window.renderVisualCase({ name: "css", source: "Range: 2026.10.23 - 2026.10.29\nSingle: 2026.10.24\nOther: 2026.10.28" }, theme);
		}, theme);
		const circle = page.locator(".calendar-blocks-selection-circle").first();
		const range = page.locator(".calendar-blocks-range-segment").first();
		const singleLegend = page.locator(".calendar-blocks-legend-marker.calendar-blocks-single-highlight").first();
		const rangeLegend = page.locator(".calendar-blocks-legend-marker--range").first();
		const today = page.locator(".calendar-blocks-today");
		const initial = await circle.evaluate((el) => getComputedStyle(el).fill);
		const snippet = await page.addStyleTag({ content: `
			body.theme-${theme} {
				--calendar-blocks-palette-1: #123456;
				--calendar-blocks-day-color: #234567;
				--calendar-blocks-weekend-color: #345678;
				--calendar-blocks-weekday-color: #456789;
				--calendar-blocks-weekend-label-color: #56789a;
				--calendar-blocks-range-day-color: #6789ab;
				--calendar-blocks-selected-day-color: #789abc;
				--calendar-blocks-day-font-weight: 400;
				--calendar-blocks-range-day-font-weight: 600;
				--calendar-blocks-selected-day-font-weight: 800;
				--calendar-blocks-single-opacity: .8;
				--calendar-blocks-range-opacity: .3;
				--calendar-blocks-today-marker-color: #89abcd;
			}
		` });
		await expect(circle).toHaveCSS("fill", "rgb(18, 52, 86)");
		await expect(range).toHaveCSS("fill", "rgb(18, 52, 86)");
		await expect(singleLegend).toHaveCSS("background-color", "rgb(18, 52, 86)");
		await expect(rangeLegend).toHaveCSS("background-color", "rgb(18, 52, 86)");
		await expect(circle).toHaveCSS("opacity", "0.8");
		await expect(singleLegend).toHaveCSS("opacity", "0.8");
		await expect(range).toHaveCSS("fill-opacity", "0.3");
		await expect(rangeLegend).toHaveCSS("opacity", "0.3");
		for (const [selector, fill, weight] of [
			['.calendar-blocks-day[data-date="2026.10.01"]', "rgb(35, 69, 103)", "400"],
			['.calendar-blocks-day[data-date="2026.10.03"]', "rgb(52, 86, 120)", "400"],
			['.calendar-blocks-day[data-date="2026.10.25"]', "rgb(103, 137, 171)", "600"],
			['.calendar-blocks-day[data-date="2026.10.24"]', "rgb(120, 154, 188)", "800"],
		] as const) {
			await expect(page.locator(selector)).toHaveCSS("fill", fill);
			await expect(page.locator(selector)).toHaveCSS("font-weight", weight);
		}
		await expect(page.locator(".calendar-blocks-weekday:not(.calendar-blocks-weekend)").first()).toHaveCSS("fill", "rgb(69, 103, 137)");
		await expect(page.locator(".calendar-blocks-weekday.calendar-blocks-weekend").first()).toHaveCSS("fill", "rgb(86, 120, 154)");
		await expect(today).toHaveCSS("fill", "rgb(103, 137, 171)");
		await expect(page.locator(".calendar-blocks-today-marker path")).toHaveCSS("fill", "rgb(137, 171, 205)");
		const scoped = await page.addStyleTag({ content: `#calendar {
			--calendar-blocks-single-color-1: #abcdef;
			--calendar-blocks-range-color-1: #fedcba;
			--calendar-blocks-today-day-color: #112233;
			--calendar-blocks-today-day-font-weight: 900;
			--calendar-blocks-today-marker-opacity: 0;
		}` });
		await expect(circle).toHaveCSS("fill", "rgb(171, 205, 239)");
		await expect(singleLegend).toHaveCSS("background-color", "rgb(171, 205, 239)");
		await expect(range).toHaveCSS("fill", "rgb(254, 220, 186)");
		await expect(rangeLegend).toHaveCSS("background-color", "rgb(254, 220, 186)");
		await expect(today).toHaveCSS("fill", "rgb(17, 34, 51)");
		await expect(today).toHaveCSS("font-weight", "900");
		await expect(page.locator(".calendar-blocks-today-marker")).toHaveCSS("opacity", "0");
		await scoped.evaluate((el) => el.parentNode!.removeChild(el));
		await snippet.evaluate((el) => el.parentNode!.removeChild(el));
		await expect(circle).toHaveCSS("fill", initial);
		const direct = await page.addStyleTag({ content: ".calendar-blocks-selection-circle { fill: #010203; }" });
		await expect(circle).toHaveCSS("fill", "rgb(1, 2, 3)");
		await direct.evaluate((el) => el.parentNode!.removeChild(el));
		await expect(circle).toHaveCSS("fill", initial);
	});
}

for (const kind of ["single", "range"] as const) {
	test(`all 40 CSS palette slots support ${kind} overrides`, async ({ page }) => {
		await page.goto("/");
		await page.evaluate(async (kind) => {
			await window.renderVisualCase({ name: "palette", source: Array.from({ length: 40 }, (_, index) =>
				`Entry ${index}: ` + (kind === "single" ? "2026.06.10" : "2026.06.10 - 2026.06.11"),
			).join("\n") }, "light");
		}, kind);
		const slotCSS = (prefix: string, offset: number) => Array.from({ length: 40 }, (_, i) =>
			`--calendar-blocks-${prefix}-${i + 1}: rgb(${i + offset}, 100, 200);`,
		).join("\n");
		const shared = await page.addStyleTag({ content: `.calendar-blocks-root { ${slotCSS("palette", 1)} }` });
		const selector = kind === "single" ? ".calendar-blocks-selection-circle" : ".calendar-blocks-range-segment";
		const fills = () => page.locator(selector).evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
		const expected = (offset: number) => Array.from({ length: 40 }, (_, i) => `rgb(${i + offset}, 100, 200)`);
		expect(await fills()).toEqual(expected(1));
		const override = await page.addStyleTag({ content: `body { ${slotCSS(`${kind}-color`, 41)} }` });
		expect(await fills()).toEqual(expected(41));
		expect(await page.locator(".calendar-blocks-legend-marker").evaluateAll((els) =>
			els.map((el) => getComputedStyle(el).backgroundColor),
		)).toEqual(expected(41));
		await override.evaluate((el) => el.parentNode!.removeChild(el));
		expect(await fills()).toEqual(expected(1));
		await shared.evaluate((el) => el.parentNode!.removeChild(el));
	});
}

for (const [state, source, expected] of [
	["plain", "2026.10.01", "rgb(34, 34, 34)"],
	["range", "2026.10.25 - 2026.10.29", "rgb(34, 34, 34)"],
	["single", "2026.10.26", "rgb(255, 255, 255)"],
] as const) {
	test(`today text retains its ${state} state until explicitly overridden`, async ({ page }) => {
		await page.clock.setFixedTime(new Date("2026-10-26T12:00:00Z"));
		await page.goto("/");
		await page.evaluate(async (source) => window.renderVisualCase({ name: "today", source }, "light"), source);
		const today = page.locator(".calendar-blocks-today");
		await expect(today).toHaveCSS("fill", expected);
		const snippet = await page.addStyleTag({ content: "body { --calendar-blocks-today-day-color: #abcdef; --calendar-blocks-today-day-font-weight: 900; }" });
		await expect(today).toHaveCSS("fill", "rgb(171, 205, 239)");
		await expect(today).toHaveCSS("font-weight", "900");
		await snippet.evaluate((el) => el.parentNode!.removeChild(el));
		await expect(today).toHaveCSS("fill", expected);
	});
}

for (const theme of ["light", "dark"]) {
	test(`CSS can grey out dates outside a range without painting highlights / ${theme}`, async ({ page }) => {
		const visualCase = loadVisualCases().find((fixture) => fixture.name === "custom-css-grey-outside-range")!;
		await page.goto("/");
		await page.evaluate(async ({ visualCase, theme }) => window.renderVisualCase(visualCase, theme), { visualCase, theme });
		const active = page.locator(".calendar-blocks-day.calendar-blocks-range-day");
		const inactive = page.locator(".calendar-blocks-day:not(.calendar-blocks-range-day):not(.calendar-blocks-selected-day)");
		await expect(page.locator(".calendar-blocks-month-title")).toHaveCSS("fill",
			theme === "light" ? "rgb(100, 116, 139)" : "rgb(148, 163, 184)");
		await expect(active).toHaveCount(11);
		await expect(inactive).toHaveCount(19);
		const selected = page.locator('.calendar-blocks-selected-day[data-date="2026.10.24"]');
		await expect(selected).toHaveCSS("fill", "rgb(233, 49, 71)");
		await expect(selected).toHaveCSS("font-weight", "800");
		expect(await active.evaluateAll((days) => [...new Set(days.map((day) => getComputedStyle(day).fontWeight))])).toEqual(["800"]);
		expect(await inactive.evaluateAll((days) => [...new Set(days.map((day) => getComputedStyle(day).fontWeight))])).toEqual(["500"]);
		const circle = page.locator('.calendar-blocks-selection-circle[data-date="2026.10.24"]');
		await expect(circle).toHaveCount(1);
		await expect(circle).toHaveCSS("display", "none");
		await expect(page.locator(".calendar-blocks-legend-label")).toHaveText(["Vacation", "Appointment"]);
		await expect(page.locator(".calendar-blocks-legend-marker--range")).toHaveCount(1);
		await expect(page.locator(".calendar-blocks-legend-marker.calendar-blocks-single-highlight"))
			.toHaveCSS("background-color", await selected.evaluate((element) => getComputedStyle(element).fill));
		const activeColor = theme === "light" ? "rgb(0, 128, 128)" : "rgb(45, 212, 191)";
		await expect(page.locator(".calendar-blocks-legend-marker--range")).toHaveCSS("background-color", activeColor);
		await expect(page.locator(".calendar-blocks-legend-marker--range")).toHaveCSS("opacity", "1");
		const inactiveColor = theme === "light" ? "rgb(153, 153, 153)" : "rgb(102, 102, 102)";
		expect(await active.evaluateAll((days) => [...new Set(days.map((day) => getComputedStyle(day).fill))])).toEqual([activeColor]);
		expect(await inactive.evaluateAll((days) => [...new Set(days.map((day) => getComputedStyle(day).fill))])).toEqual([inactiveColor]);
		const segments = page.locator(".calendar-blocks-range-segment");
		await expect(segments).toHaveCount(3);
		expect(await segments.evaluateAll((paths) => paths.every((path) => getComputedStyle(path).fill === "none"))).toBe(true);
		await expect(page.locator(".calendar-blocks-today-marker")).toHaveCount(0);
	});
}
