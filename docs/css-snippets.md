# CSS Snippets

Customize calendars with an Obsidian CSS snippet: save a `.css` file in your
vault's `.obsidian/snippets/` directory and enable it in **Settings → Appearance →
CSS snippets**. Changes apply immediately to existing calendars in Live Preview
and Reading mode.

Set variables on `body` for all calendars, `.theme-light` / `.theme-dark` for a
particular theme, or `.calendar-blocks-root` for the calendar itself. Variables
also inherit from a note container, so a note's CSS class can scope a snippet.
No `!important` is needed. For example:

```css
body {
  --calendar-blocks-palette-1: #008080;
  --calendar-blocks-palette-2: #7c3aed;
  --calendar-blocks-range-color-1: #2563eb;
  --calendar-blocks-weekend-color: #a16207;
  --calendar-blocks-day-font-weight: 400;
  --calendar-blocks-selected-day-font-weight: 700;
  --calendar-blocks-today-day-color: #be185d;
  --calendar-blocks-today-day-font-weight: 800;
  --calendar-blocks-today-marker-color: #008080;
  --calendar-blocks-range-opacity: 0.22;
}

body.theme-dark {
  --calendar-blocks-palette-1: #2dd4bf;
  --calendar-blocks-range-color-1: #60a5fa;
  --calendar-blocks-weekend-color: #fbbf24;
  --calendar-blocks-today-day-color: #f9a8d4;
  --calendar-blocks-today-marker-color: #2dd4bf;
}
```

## CSS variables

The following variables are public. Every name starts with `--calendar-blocks-`;
`N` is a number from **1 to 40**. Unset variables retain the default appearance.

| Variable suffix | Controls / default |
| --- | --- |
| `palette-N` | Shared palette slot; existing 40-color palette |
| `single-color-N`, `range-color-N` | Override one type's slot; falls back to `palette-N` |
| `red` | Legacy base red; Obsidian `--color-red`, then `#d32f2f`; used by slot 1 and the month title |
| `background-color` | Calendar background; `--background-primary` |
| `month-title-color`, `month-title-font-weight` | Month heading; base red and `--font-bold` |
| `weekday-color`, `weekend-label-color` | Weekday headings; `--text-normal` and `--text-muted` |
| `weekday-font-weight` | Weekday headings; `--font-semibold` or 600 |
| `day-color`, `weekend-color`, `day-font-weight` | Unselected dates; `--text-normal`, `--text-muted`, `--font-medium` |
| `range-day-color`, `range-day-font-weight` | Dates inside ranges, including weekends; `--text-normal` and day weight |
| `selected-day-color`, `selected-day-font-weight` | Single selected dates; `--text-on-accent` or white, and `--font-bold` |
| `range-opacity`, `single-opacity` | Range / circle and matching legend opacity; 0.16 / 1 |
| `today-day-color`, `today-day-font-weight` | Today's number; defaults to its underlying day state |
| `today-marker-color`, `today-marker-opacity` | Brush marker; `#e53935` and 1; opacity 0 hides it |
| `legend-color`, `legend-font-weight` | Legend labels; `--text-normal` and inherited weight |
| `separator-color`, `separator-opacity` | Omitted-month wave; `--text-faint` or `--text-muted`, and 0.35 |

Single dates and ranges count palette slots independently, in source order,
including entries without labels. A range reduced to one day uses the single-date
pool. Legend markers use the same slot and type as their calendar highlights.
Today's explicit text overrides take priority over other day states; otherwise
single-date styling takes priority over range styling, then unselected-day styling.

## CSS classes

These classes are also public styling hooks (all prefixed with `calendar-blocks-`):

| Classes | Elements |
| --- | --- |
| `root`, `calendar` | Block container and each month's SVG |
| `background`, `month-title` | Calendar background and heading |
| `weekday`, `weekend` | Weekday heading; `weekend` also marks weekend day numbers |
| `day`, `range-day`, `selected-day`, `today` | Day number and combinable state classes |
| `selection-circle`, `range-segment` | Highlight shapes |
| `single-highlight`, `range-highlight`, `palette-N` | Highlight type and palette slot, including legend markers |
| `today-marker` | Today's brush marker |
| `legend`, `legend-item`, `legend-label`, `legend-marker`, `legend-marker--range` | Legend and its parts |
| `separator`, `separator-wave` | Omitted-month separator and its wave |

For example, `.calendar-blocks-month-title { font-style: italic; }` customizes a
heading directly. Documented classes and variables form the stable CSS interface;
the internal SVG structure does not. Previous `calendar-blocks-minimal-*` classes
and `--minimal` modifiers have been removed.

## Custom CSS examples

These visual test cases include the complete CSS snippet in YAML frontmatter,
the calendar input, and screenshots for both light and dark themes:

- [Grey out dates outside a range](../tests/test-data/visual/custom-css-grey-outside-range.md):
  muted unselected dates, custom colors and bold text for range and single-date
  numbers, no filled highlights, a matching legend, and a blue-grey month heading.
- [Today on an unselected date](../tests/test-data/visual/custom-css-today-plain.md):
  custom palette, bold numbers, muted unselected dates, and a custom today marker.
- [Today inside a range](../tests/test-data/visual/custom-css-today-range.md):
  the same snippet with today overlapping a range highlight.
- [Today on a single selected date](../tests/test-data/visual/custom-css-today-single.md):
  the same snippet with today overlapping a selected-date circle.

Copy the CSS from the `css: |` frontmatter field into your snippet file, without
the YAML key or frontmatter delimiters.
