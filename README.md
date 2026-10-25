# Calendar Blocks

Calendar Blocks is an Obsidian plugin for rendering dates and date ranges as
calendars.

## Usage

Use a fenced `date` code block for a single date:

````markdown
```date
2025.07.27
```
````

The `dates` block name is supported as an alias and has identical behavior.

Use a hyphen between two dates for a range:

````markdown
```date
2025.07.27 - 2025.08.03
```
````

### Multiple ranges and dates

Put each range or single date on its own line in the same block:

````markdown
```dates
2026.06.05 - 2026.06.11
2026.06.09 - 2026.06.15
2026.06.10
2026.07.03 - 2026.08.05
```
````

All entries appear together. Ranges and single dates use a predefined palette of
40 colors in source-line order, starting with red, blue, and green. Each entry keeps its color
across weeks and months. Overlapping ranges retain their translucent layers,
so their colors blend at intersections. Single dates appear as colored circles above all ranges,
regardless of line order. Blank lines are ignored; an invalid entry reports its
line number and rejects the whole block.

A block accepts up to 40 entries in total; adding a 41st range or single date
shows an error. Blank lines do not consume colors or count toward the limit.

Months are shown once, in chronological order, adding the endpoint months of
each range and the months of single dates. Long ranges still show their first
and last months, with a wave at each gap. Additional months form rows of two
calendars and stack vertically in narrow panes.

### Legend

Add a label followed by a colon before a range or single date:

````markdown
```dates
Vacation: 1 Mar - 9 Mar
Conference: 5 Mar - 7 Mar
Birthday: 8 Mar
```
````

The legend appears below all calendars, with one labeled entry per line and a
circle of the entry's color on the left. Unlabeled entries are omitted from the
legend but still consume their palette color. If no entries have labels, no
legend is shown. Labels support plain text, including spaces and Unicode.

### Supported date formats

Dates accept one- or two-digit days and months:

- Year first: `2026.03.02`, `2026-03-02`, `2026/3/2`.
- Day first: `02.03.2026`, `2/3/2026` (always day/month/year).
- Month names in the system locale and Obsidian language, case-insensitive:
  full names, abbreviations (with or without a trailing period), and grammatical
  forms used in dates, such as `1 марта`, `1 март`, or `1 мар.` in Russian.
  English names (`2 Mar 2026`, `2 March 2026`) are always accepted.
- Without a year: `2.3`, `02/03`, `2 Mar`.

When a single date or both range endpoints omit their years, the plugin uses the source
note's creation year (Obsidian's file creation timestamp). It does not use the
current year or the last modification year. If both range years are omitted,
the creation year determines the start year and the end may roll into the next year.
If the source note is unavailable, specify the year of the single date or either
range endpoint explicitly.

A range end without a year uses the start's year, advancing to the next year
when its month/day would fall before the start. For example,
`28 Dec 2005 - 1 Jan` ends on January 1, 2006, independently of the note's creation
year. Conversely, `28 Dec - 1 Jan 2006` starts on December 28, 2005: an omitted
start year uses the end's year, moving back one year if its month/day would fall
after the end. Explicit years are always respected.

For example, in a note created in 2026:

````markdown
```date
1 Mar - 4 Apr
```
````

This selects March 1 through April 4, 2026. Formats can be mixed within a
range; hyphens, en dashes and em dashes are accepted as separators. Invalid
calendar dates and reversed ranges with explicit years are rejected. Ranges
crossing New Year can omit the end year, for example `31 Dec 2026 - 1 Jan`.

## Examples

### Single date

````
```date
2026.06.06
```
````

<img src="docs/images/minimal-single-date.png"
     alt="A minimal calendar with June 6 selected"
     width="200">

### Range within one month

````
```date
2026.06.05 - 2026.06.11
```
````

<img src="docs/images/minimal-same-month-range.png"
     alt="A minimal calendar with a range from June 5 through June 11"
     width="200">

### Range across adjacent months

````
```date
2026.06.05 - 2026.07.05
```
````

<img src="docs/images/minimal-adjacent-month-range.png"
     alt="Minimal calendars with a range from June 5 through July 5"
     width="400">

### Range with omitted months

````
```date
2026.06.05 - 2026.10.05
```
````

<img src="docs/images/minimal-omitted-months-range.png"
     alt="Minimal calendars with a range from June 5 through October 5 and a wave for omitted months"
     width="400">

## Settings

Calendars use the grid-free Minimal design with narrow weekday labels and a
filled circle for a single selected date.

Enable **Stretch calendar** in the Calendar Blocks settings to make calendars
use the full available note width. It is disabled by default, preserving the
compact layout.

## Installation

### Manual installation from Releases

1. Open the [latest release](https://github.com/pochemuto/calendar-blocks/releases/latest)
   and download the attached `calendar-blocks-<version>.zip` archive. Do not
   download GitHub's automatically generated source code archives.
2. Create this directory inside your Obsidian vault:

   ```text
   <vault>/.obsidian/plugins/calendar-blocks/
   ```

3. Extract the archive contents directly into that directory. The resulting
   layout must be:

   ```text
   <vault>/.obsidian/plugins/calendar-blocks/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

4. Reload Obsidian, open **Settings → Community plugins**, and enable
   **Calendar Blocks**.

## Build

```sh
npm install
npm run build
```

Copy the contents of `build/` to:

```text
<vault>/.obsidian/plugins/calendar-blocks/
```

Then reload Obsidian and enable **Calendar Blocks** in the community plugins
settings.
