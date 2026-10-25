# Calendar Blocks Agent Guide

## Project overview

Calendar Blocks is an Obsidian plugin that renders `date` fenced code
blocks as responsive SVG calendars in Live Preview and Reading mode. The
`dates` block name is an exact alias.

Supported input:

````markdown
```date
2025.07.27
```
````

````markdown
```date
2025.07.27 - 2025.08.03
```
````

The parser accepts outer whitespace and spaces or tabs around range separators
(hyphen, en dash, or em dash). Dates support year-first numeric formats
(`YYYY.M.D`, `YYYY-M-D`, `YYYY/M/D`), day-first numeric formats (`D.M.YYYY`,
`D/M/YYYY`), and month names (`D Mon YYYY`, `D Month YYYY`) from the system locale and
Obsidian Moment locale. Generate full/short and standalone/date-context month
names with Intl in UTC, retaining English aliases. Days and
months may use one or two digits. Day-first dates may omit the year. Single dates
and ranges with both years omitted use the source note creation year, supplied
to the DOM-free parser by the code-block processor, as the single/start year.
A range end without a year uses the start's year, advancing one year if its
month/day precedes the start. A range start without a year uses an explicit end's
year, moving back one year if its month/day follows the end. Explicit endpoint
years take precedence over creation metadata and are never adjusted. Missing
source metadata requires an explicit year for a single date or either range
endpoint rather than defaulting to the current year. It validates Gregorian dates,
including leap years, and rejects ranges whose start is later than their end.
Years are limited to `0001` through `9999`.

Multiple ranges and single dates may be combined in one block, one entry per
line. Blank lines are ignored. Invalid entries reject the whole block and report
the source line. Range highlights remain independent translucent layers; single
date circles are rendered above every range. Ranges and single dates use two
independent pools of the 40-color palette in `src/selection-palette.ts`, each
in source order, starting with red, blue, and green. Entries of one type must
not advance the other type's colors. A range with identical endpoints uses the
range pool.
Preserve each entry's color across months and weeks. Reject blocks with more than
40 entries in total (ranges and single dates) in the parser. Blank lines do not
consume colors or count toward the limit. Show the sorted union of endpoint
months and single-date months, with waves only at actual month gaps. Additional
months form responsive rows of at most two calendars.

Each entry may have a plain-text label before a colon, for example
`Vacation: 1 Mar - 9 Mar`. Preserve labels in canonical formatting and accessible
SVG descriptions. If any entries have labels, render a legend below all calendars,
with one labeled entry per line and a marker on the left: a pill for ranges
(about 1.47 times the circle diameter, matching range color and opacity), or a solid circle
for single dates. Align markers to the right of a shared column so labels align.
Use the entry's original palette index within its type's pool, including
unlabeled entries of that type; omit unlabeled legend items.
Render label text with `textContent`, never HTML.

## Architecture

- `src/main.ts` is the plugin entry point. It registers the `date` and `dates`
  Markdown code-block processors and delegates parsing and rendering.
- `src/date-block.ts` defines the supported block-language names. Keep aliases
  centralized there so they cannot diverge.
- `src/date-parser.ts` contains the public date types, strict parser,
  comparison helpers, and canonical formatter. Keep this module independent
  of Obsidian and the DOM.
- `src/calendar-model.ts` converts a date selection into a timezone-safe,
  Monday-first calendar model. Keep calendar arithmetic and highlight
  decisions here.
- `src/calendar-renderer.ts` creates the SVG using standard DOM APIs. Do not
  use `innerHTML`; all SVG nodes must be created with `createElementNS`.
- `src/settings.ts` defines persisted plugin settings and the Obsidian settings
  tab. New settings must have backward-compatible defaults.
- `styles.css` contains all plugin styling. Prefix new classes with
  `calendar-blocks-` and prefer Obsidian CSS variables.
- `tests/` mirrors the parser, model, and renderer layers. Renderer tests use
  jsdom.

Dates are represented as numeric `{ year, month, day }` values rather than
local JavaScript `Date` objects. If a `Date` is required for weekday or locale
formatting, construct and read it in UTC to avoid timezone and DST shifts.

## Rendering rules

- The Obsidian Moment locale determines month and weekday labels.
- Weeks always start on Monday, independently of locale.
- Saturday and Sunday labels and unselected dates are muted. Dates inside ranges
  use the normal text color, including weekends, to stay legible over highlights.
- A single selected date uses a filled red circle with contrasting text.
- Adjacent range dates within the same week merge into one rounded segment
  with a translucent fill and no outline. Multi-week ranges render one segment
  per week row. An edge that continues into another week is square and flush
  with the week boundary; only actual range boundaries are rounded.
- A same-month range renders one calendar.
- A multi-month range renders only the first and last months. A narrow
  vertical wave separates them when one or more complete months are omitted.
- Adjacent-month dates and their range highlights are omitted.
- Two calendars remain side by side while each retains a readable width. A
  container query switches them to a vertical stack before they become too
  compressed. The omitted-month separator changes from a vertical wave to a
  horizontal wave in the stacked layout.
- The optional **Stretch calendar** setting removes the compact maximum width
  while preserving the responsive one- or two-column layout.
- Calendars always use the grid-free Minimal design; there is no design setting.
- Every SVG must retain its localized `title`, `role="img"`, and `aria-label`.
- Invalid input must render a compact error instead of throwing.

## Toolchain and commands

Use a Node.js version supported by both Vitest and jsdom: Node 20.19+, 22.13+,
or 24+. Install the locked dependency graph with:

```sh
npm ci
```

Run the complete automated test suite:

```sh
npm test
```

This includes pixel-exact visual regression tests in a pinned Playwright Docker
image; Docker must be running. Reference screenshots are tracked under
`tests/test-data/visual/linux/`. Use `npm run test:visual:update` only for
intentional visual changes and review the resulting PNGs. See README.md for
filtering, reports, and adding cases. `npm run test:unit` runs only Vitest.

Create a production bundle:

```sh
npm run build
```

The production build type-checks the project, deletes the previous `build/`
directory, and creates exactly these installable files:

```text
build/main.js
build/manifest.json
build/styles.css
```

`main.js` is the exact filename Obsidian requires. Do not rename it or allow
copy tools to create names such as `main 2.js`.

Development watch mode is available with:

```sh
npm run dev
```

Watch mode rebuilds TypeScript changes, but `manifest.json` and `styles.css`
are copied only when the command starts. Restart watch mode after changing
either static file.

## Installing into Obsidian

Copy the contents of `build/`, not the `build` directory itself, into:

```text
<vault>/.obsidian/plugins/calendar-blocks/
```

For local development, a symlink is also valid:

```sh
ln -s /absolute/path/to/this/repository/build \
  <vault>/.obsidian/plugins/calendar-blocks
```

The plugin directory or symlink must be named `calendar-blocks`, matching the
ID in `manifest.json`. After rebuilding, reload Obsidian or disable and
re-enable the plugin.

## Validation before handoff

Always run:

```sh
npm test
npm run build
git diff --check
```

Also verify that `build/` contains only the three expected files. For visual
changes, manually check:

- Live Preview and Reading mode;
- light and dark Obsidian themes;
- a single date, a same-month range, and a multi-month range;
- a narrow pane where two calendars must stack without overflow;
- localized labels and muted Saturday/Sunday styling.

Do not commit `build/` or `node_modules/`; both are intentionally ignored.
Do not create Git commits unless the user explicitly requests one. When
adding or updating dependencies, update and include `package-lock.json`.

## Roadmap maintenance

When implementing a feature listed in `ROADMAP.md`, mark every corresponding
checkbox and completed subtask as done (`[x]`) in the same change. Do not mark
an item complete until its implementation and required validation are
finished.
