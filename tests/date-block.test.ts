import { describe, expect, it } from "vitest";

import { DATE_BLOCK_LANGUAGES } from "../src/date-block";

describe("DATE_BLOCK_LANGUAGES", () => {
	it("registers dates as an alias for date", () => {
		expect(DATE_BLOCK_LANGUAGES).toEqual(["date", "dates"]);
	});
});
