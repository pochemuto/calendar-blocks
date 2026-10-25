import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

// Serve only these fixtures; never expose the repository or node_modules tree.
const bundle = await build({
	entryPoints: ["tests/visual/fixture.ts"],
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
});
const routes = new Map([
	["/", ["text/html", await readFile("tests/visual/fixture.html")]],
	["/fixture.js", ["text/javascript", bundle.outputFiles[0].contents]],
	["/fixture.css", ["text/css", await readFile("tests/visual/fixture.css")]],
	["/styles.css", ["text/css", await readFile("styles.css")]],
]);
for (const subset of ["latin", "cyrillic"]) {
	routes.set(`/font-${subset}.woff2`, ["font/woff2", await readFile(
		`node_modules/@fontsource-variable/noto-sans/files/noto-sans-${subset}-wght-normal.woff2`,
	)]);
}

createServer((request, response) => {
	const route = routes.get(request.url);
	if (!route) {
		response.writeHead(404).end();
		return;
	}
	response.writeHead(200, { "Content-Type": route[0], "Cache-Control": "no-store" });
	response.end(route[1]);
}).listen(4173, "127.0.0.1");
