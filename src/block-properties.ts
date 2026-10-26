/** DOM-free registry shared by block parsing and rendering. */
export interface BooleanBlockProperties {
	showToday: boolean;
	stretchCalendar: boolean;
}

export type BlockOverrides = Partial<BooleanBlockProperties>;

// Register future binary properties here; every name also accepts `no-`.
export const BLOCK_PROPERTIES = {
	today: "showToday",
	stretch: "stretchCalendar",
} as const satisfies Record<string, keyof BooleanBlockProperties>;

export function parseBlockProperty(token: string): BlockOverrides | undefined {
	const enabled = !token.startsWith("no-");
	const name = enabled ? token : token.slice(3);
	if (!Object.prototype.hasOwnProperty.call(BLOCK_PROPERTIES, name)) return undefined;
	return { [BLOCK_PROPERTIES[name as keyof typeof BLOCK_PROPERTIES]]: enabled };
}
