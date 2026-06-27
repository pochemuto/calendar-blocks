# Calendar Blocks Agent Guide

## Project overview

Calendar Blocks is an Obsidian plugin that renders strict `date` fenced code
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

The parser accepts outer whitespace and spaces or tabs around the hyphen, but
the dates themselves must use `YYYY.MM.DD`. It validates Gregorian dates,
including leap years, and rejects ranges whose start is later than their end.
Years are limited to `0001` through `9999`.

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
- Saturday and Sunday labels and dates are red.
- A single selected date has a thin, theme-neutral rounded outline and does
  not use an accent color.
- Adjacent range dates within the same week merge into one rounded segment
  with a translucent fill and no outline. Multi-week ranges render one segment
  per week row. An edge that continues into another week is square and flush
  with the week boundary; only actual range boundaries are rounded.
- A same-month range renders one calendar.
- A multi-month range renders only the first and last months. A narrow
  vertical wave separates them when one or more complete months are omitted.
- For a multi-month range, free cells at the boundary of each displayed month
  show dimmed dates from the adjacent month. Range segments continue through
  those overflow dates when they fall inside the selection. The overflow
  portion of a segment uses a lower fill opacity while remaining visually
  joined to the main-month portion.
- Two calendars always remain side by side and shrink together in a narrow
  container.
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
- a narrow pane where two calendars must remain horizontal without overflow;
- localized labels and red Saturday/Sunday styling.

Do not commit `build/` or `node_modules/`; both are intentionally ignored.
Do not create Git commits unless the user explicitly requests one. When
adding or updating dependencies, update and include `package-lock.json`.

## Roadmap maintenance

When implementing a feature listed in `ROADMAP.md`, mark every corresponding
checkbox and completed subtask as done (`[x]`) in the same change. Do not mark
an item complete until its implementation and required validation are
finished.
