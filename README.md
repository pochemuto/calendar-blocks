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

### Supported date formats

Dates accept one- or two-digit days and months:

- Year first: `2026.03.02`, `2026-03-02`, `2026/3/2`.
- Day first: `02.03.2026`, `2/3/2026` (always day/month/year).
- Month names in the system locale and Obsidian language, case-insensitive:
  full names, abbreviations (with or without a trailing period), and grammatical
  forms used in dates, such as `1 марта`, `1 март`, or `1 мар.` in Russian.
  English names (`2 Mar 2026`, `2 March 2026`) are always accepted.
- Without a year: `2.3`, `02/03`, `2 Mar`.

When a date omits its year, the plugin uses the source note's creation year
(Obsidian's file creation timestamp), even when the other endpoint has an
explicit year. It does not use the current year or the last modification year.
If the source note is unavailable, specify the year explicitly.

For example, in a note created in 2026:

````markdown
```date
1 Mar - 4 Apr
```
````

This selects March 1 through April 4, 2026. Formats can be mixed within a
range; hyphens, en dashes and em dashes are accepted as separators. Invalid
calendar dates and reversed ranges are rejected. For ranges crossing New Year,
include explicit years, for example `31 Dec 2026 - 1 Jan 2027`.

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

Use **Calendar design** to choose between the grid-based **Basic** design and
the default **Minimal** design. Minimal uses narrow weekday labels and a filled
circle for a single selected date.

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
