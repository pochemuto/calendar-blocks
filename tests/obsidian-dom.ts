import type {} from "obsidian";

// The renderer uses Obsidian's global helper; standalone test environments
// supply its tag-only behavior, which is all the renderer needs.
globalThis.createEl = <K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] =>
	document.createElement(tag);

globalThis.createDiv = () => document.createElement("div");
globalThis.createSpan = () => document.createElement("span");
