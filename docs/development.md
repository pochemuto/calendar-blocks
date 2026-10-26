# Development

## Build

```sh
npm ci
npm run build
```

Copy the contents of `build/` to:

```text
<vault>/.obsidian/plugins/calendar-blocks/
```

Then reload Obsidian and enable **Calendar Blocks** in the community plugins
settings.

## Publishing

Before publishing, run `npm test`, `npm run build`, and `git diff --check`.
Keep the version in `manifest.json`, `package.json`, and `package-lock.json`
in sync, and record its minimum Obsidian version in `versions.json`.
The minimum supported Obsidian version is 1.5.7, which introduced the
`Vault.getFileByPath` API used to resolve the source note.

Create a Git tag that exactly matches the manifest version, without a `v`
prefix (for example, `0.1.1`). Pushing that tag runs CI and publishes a GitHub
release with only `main.js`, `manifest.json`, and `styles.css` as attached assets.
Append a concise, readable bullet to [CHANGELOG.md](../CHANGELOG.md) when committing
a change. Keep it as a flat list, with one entry per line and no version sections.
CI generates the release description from added bullet lines in the changelog
diff since the previous release tag, preserving file order and removing duplicates.
The first release, or the first release with a changelog, includes all its entries.
Both current tags (`0.1.1`) and legacy tags (`v0.1.0`) delimit the diff.

Before publishing the release, CI generates GitHub build provenance attestations
for the three individual plugin assets. The signing permissions are restricted
to the release job, which runs only for version tags after tests and the build
succeed. Verify downloaded assets with the GitHub CLI:

```sh
gh attestation verify main.js --repo pochemuto/calendar-blocks
gh attestation verify manifest.json --repo pochemuto/calendar-blocks
gh attestation verify styles.css --repo pochemuto/calendar-blocks
```

The initial directory submission is made through
[Obsidian Community](https://community.obsidian.md) after signing in and
connecting the repository owner's GitHub account. Subsequent updates use
GitHub releases. See the official
[submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin).

## Visual regression tests

`npm test` runs unit tests and screenshot comparisons in light and dark themes. Visual tests require a running Docker engine. The first run
downloads the pinned Playwright image. Local runs and CI use the same Linux
arm64 image, Chromium version, bundled Noto Sans font, locale, timezone and
pixel density; no host fonts or Obsidian installation are needed.

```sh
npm ci
npm test
# Run just one suite:
npm run test:unit
npm run test:visual
# Filter visual cases:
npm run test:visual -- --grep omitted-months
```

Reference PNGs live in `tests/test-data/visual/linux/` and belong in Git.
Every pixel must match: both the color threshold and allowed differing pixel
count are zero. An additional decoded RGBA comparison includes antialiased
pixels that Playwright's comparator can ignore. Missing references fail a normal test run. On failure,
`test-results/` contains expected, actual and diff images, and
`npm run test:visual:report` opens the HTML report. CI uploads these artifacts.

After an intentional visual change, explicitly regenerate references:

```sh
npm run test:visual:update
# Or update only the affected cases:
npm run test:visual:update -- --grep legend
```

Review the changed PNGs before accepting them, then rerun `npm test`.
The input fixtures live in `tests/test-data/visual/*.md`. Each scenario has one
Markdown file (for example, `adjacent-months.md`) shared by all platforms and
themes. It contains one fenced `date` or `dates` block and embeds light and dark
reference images for every platform directory using relative links. Screenshot
paths follow `<platform>/<case>-<theme>.png`, for example
`linux/adjacent-months-light.png` and `linux/adjacent-months-dark.png`.
Open the Markdown file on GitHub to see all inputs and outputs together.
The test runner automatically runs each scenario in both light and dark themes;
Playwright selects the screenshot directory for the platform it runs on.

Optional fixture settings go in YAML frontmatter at the start of the file:

```yaml
---
width: 280
locale: ru
stretch: true
showToday: true
---
```

Defaults are width 640, locale `en-US`, stretching disabled, and Show today enabled.
The source note creation year is fixed at 2026, and the browser clock is fixed at
October 26, 2026, 12:00 UTC. Marker randomness uses a fixed seed of 7 for
each fixture, so today's marker produces stable screenshots. Set `markerSeed` in
fixture frontmatter to cover another variant reproducibly.
To add a scenario in both themes, add
`<name>.md` with the input, settings and image links for all platforms and themes,
then run `npm run test:visual:update`. There is no separate case list in code.
Unit tests validate the Markdown format, all screenshot embeds and their
relative paths, existing PNG targets, and a matching Markdown file for every
reference image across every platform directory. Broken, missing, duplicate or
swapped image links fail tests. Adding another platform requires its light and
dark screenshot embeds in each existing scenario, with no duplicate input files.
Keep the Docker image version in `tests/visual/run.mjs` aligned with the exact
`@playwright/test` dependency. Browser or font upgrades may require reviewed
reference updates.

The harness uses the production parser, renderer and stylesheet with fixed
Obsidian theme variables. It covers responsive container queries, highlight
layers, legends, localization, month lengths, year boundaries, stretching and
all 40 selection colors. These tests exercise the shared calendar rendering;
Live Preview/Reading integration and third-party Obsidian themes still need
manual checking in Obsidian.
