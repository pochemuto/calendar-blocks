import { Plugin } from "obsidian";

export default class CalendarBlocksPlugin extends Plugin {
	onload(): void {
		console.log("[Calendar Blocks] loaded");
	}

	onunload(): void {
		console.log("[Calendar Blocks] unloaded");
	}
}
