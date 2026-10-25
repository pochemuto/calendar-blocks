import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Pin OS, CPU architecture, browser and fonts so macOS and CI share the same PNGs.
const root = fileURLToPath(new URL("../../", import.meta.url));
const result = spawnSync("docker", [
	"run", "--rm", "--platform", "linux/arm64", "--ipc=host",
	"-e", `CI=${process.env.CI ?? ""}`,
	"-v", `${root}:/work`,
	"-v", "/work/node_modules",
	"-w", "/work",
	"mcr.microsoft.com/playwright:v1.64.1-noble",
	"sh", "-c", 'npm ci && npx playwright test "$@"',
	"visual-tests", ...process.argv.slice(2),
], { stdio: "inherit" });

if (result.error) {
	console.error("Visual tests require Docker with a running engine.", result.error.message);
}
process.exit(result.status ?? 1);
