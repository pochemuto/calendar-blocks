# Calendar Blocks

Calendar Blocks is an Obsidian plugin for rendering dates and date ranges as
calendars.

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

### Legend

````
```dates
Vacation: 7 May 2027 - 17 May
Birthday: 9 May
Conference: 19 May
```
````

<img src="docs/images/minimal-legend.png"
     alt="Legend with smart year selection"
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

## Usage

Use a fenced `date` or `dates` block. Put each date or range on its own line:

````markdown
```dates
Vacation: 7 May 2027 - 17 May
Birthday: 9 May
19 May
```
````

Labels are optional. Labeled entries appear in a legend below the calendars.
Ranges use translucent highlights, and single dates use colored circles.
Overlapping ranges blend their colors.

Each block supports up to 40 entries. Blank lines are ignored. Invalid input
shows an error with the line number.

Long ranges show their first and last months, with a wave for skipped months.
Calendars automatically stack in narrow panes.

### Supported date formats

- Year first: `2026.03.02`, `2026-03-02`, `2026/3/2`.
- Day first: `2.3.2026`, `2/3/2026` (day/month/year).
- Month names: `2 Mar 2026`, `2 March 2026`, `Feb 14 2026`.
- Without a year: `2.3`, `2/3`, `2 Mar`, `Feb 14`.

Days and months can use one or two digits. Month names support your system and
Obsidian languages; English names are always accepted.

Smart year inference uses the note's creation year and surrounding dates, so
you can usually omit repeated years, including in ranges crossing New Year.
Specify a year explicitly whenever you need a particular one.

Mix formats freely within a range. Separate endpoints with `-`, `–`, or `—`:

````markdown
```date
31 Dec 2026 - 1 Jan
```
````

### Local properties

Override settings for an individual calendar with these properties:

| Property | Effect |
| --- | --- |
| `today` | Show today's marker in the displayed months. |
| `no-today` | Hide today's marker. |
| `stretch` | Use the full available note width. |
| `no-stretch` | Keep the compact calendar width. |

Put properties before the first date, on separate lines or together:

````markdown
```dates
today
no-stretch
Feb 14
```
````

The same block can be written as:

````markdown
```dates
today no-stretch Feb 14
```
````

Properties override the global settings for this block. Omitted properties use
the global settings; if a property repeats, the last value wins.

## CSS Snippets

Customize calendar colors, text weight, highlights, and today's marker with
Obsidian CSS snippets. See the [CSS customization guide](docs/css-snippets.md)
for supported variables, styling classes, and examples with screenshots.

## Settings

Open **Settings → Calendar Blocks**:

| Setting | Default | Effect |
| --- | --- | --- |
| **Stretch calendar** | Off | Use the full available note width. |
| **Show today** | On | Mark today's date with a red, hand-drawn outline. |

Today's marker refreshes automatically when the day changes.

## Installation

### Manual installation from Releases

1. Open the [latest release](https://github.com/pochemuto/calendar-blocks/releases/latest)
   and download the attached `main.js`, `manifest.json`, and `styles.css` files. Do not
   download GitHub's automatically generated source code archives.
2. Create this directory inside your Obsidian vault:

   ```text
   <vault>/.obsidian/plugins/calendar-blocks/
   ```

3. Copy the three downloaded files directly into that directory. The resulting
   layout must be:

   ```text
   <vault>/.obsidian/plugins/calendar-blocks/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

4. Reload Obsidian, open **Settings → Community plugins**, and enable
   **Calendar Blocks**.

## Development

```sh
npm ci
npm test
npm run build
```

Tests require a running Docker engine. Copy the contents of `build/` into your
vault's `.obsidian/plugins/calendar-blocks/` directory, then reload Obsidian.

See the [development guide](docs/development.md) for test filtering, screenshot
updates, visual fixtures, and publishing instructions.

## License

[MIT](LICENSE).
