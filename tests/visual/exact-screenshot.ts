import { expect, type Locator, type TestInfo } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

export async function expectExactScreenshot(
	locator: Locator,
	name: string,
	testInfo: TestInfo,
): Promise<void> {
	// Playwright waits for stable screenshots and handles explicit baseline updates.
	await expect(locator).toHaveScreenshot(name);
	const expectedBuffer = await readFile(testInfo.snapshotPath(name));
	const actualBuffer = await locator.screenshot({
		animations: "disabled", caret: "hide", scale: "css",
	});
	const expected = PNG.sync.read(expectedBuffer);
	const actual = PNG.sync.read(actualBuffer);
	expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
	if (actual.data.equals(expected.data)) return;

	// Also compare raw RGBA: Playwright's pixelmatch can ignore antialiased pixels.
	const diff = new PNG({ width: actual.width, height: actual.height });
	let changedPixels = 0;
	for (let offset = 0; offset < actual.data.length; offset += 4) {
		const changed = [0, 1, 2, 3].some((channel) =>
			actual.data[offset + channel] !== expected.data[offset + channel],
		);
		if (changed) changedPixels += 1;
		diff.data.set(changed ? [255, 0, 255, 255] : [255, 255, 255, 255], offset);
	}
	if (changedPixels > 0) {
		for (const [suffix, body] of [
			["expected", expectedBuffer], ["actual", actualBuffer],
			["diff", PNG.sync.write(diff)],
		] as const) {
			const path = testInfo.outputPath(`${name.slice(0, -4)}-${suffix}.png`);
			await writeFile(path, body);
			await testInfo.attach(suffix, { path, contentType: "image/png" });
		}
	}
	expect(changedPixels, `Exact RGBA comparison: ${name}`).toBe(0);
}
