import { expect, test } from "@playwright/test";
import { loadVisualCases, VISUAL_THEMES } from "./markdown-fixtures";
import { expectExactScreenshot } from "./exact-screenshot";

for (const visualCase of loadVisualCases()) {
	for (const theme of VISUAL_THEMES) {
		test(`${visualCase.name} / ${theme}`, async ({ page }, testInfo) => {
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			await page.clock.setFixedTime(new Date("2026-10-26T12:00:00Z"));
			await page.goto("/");
			await page.evaluate(async ({ visualCase, theme }) => {
				await window.renderVisualCase(visualCase, theme);
			}, { visualCase, theme });
			expect(errors).toEqual([]);
			// Reject a browser environment that silently drops translucent highlights.
			expect(await page.locator(".calendar-blocks-range-segment").evaluateAll((segments) =>
				segments.every((segment) => Number(getComputedStyle(segment).fillOpacity) > 0),
			)).toBe(true);
			// Catch overflow even when it would otherwise fall outside the PNG crop.
			expect(await page.locator("#fixture").evaluate((element) =>
				element.scrollWidth <= element.clientWidth,
			)).toBe(true);
			// Months with different week counts must share a heading baseline in each row.
			expect(await page.locator(".calendar-blocks-calendars").evaluateAll((rows) =>
				rows.every((row) => {
					if (getComputedStyle(row).gridTemplateColumns.split(" ").length === 1) return true;
					const calendars = row.querySelectorAll(":scope > .calendar-blocks-calendar");
					if (calendars.length !== 2) return true;
					const [first, second] = Array.from(calendars, (calendar) =>
						calendar.querySelector(".calendar-blocks-month-title")!.getBoundingClientRect(),
					);
					return Math.abs(first.top - second.top) < 0.1;
				}),
			)).toBe(true);
			await expectExactScreenshot(page.locator("#fixture"), `${visualCase.name}-${theme}.png`, testInfo);
		});
	}
}
