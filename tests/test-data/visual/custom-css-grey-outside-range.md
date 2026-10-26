---
showToday: false
css: |
  .calendar-blocks-root {
    --calendar-blocks-month-title-color: #64748b;
    --calendar-blocks-day-color: var(--text-faint);
    --calendar-blocks-weekend-color: var(--text-faint);
    --calendar-blocks-range-color-1: #008080;
    --calendar-blocks-range-day-color: var(--calendar-blocks-range-color-1);
    --calendar-blocks-range-opacity: 1;
    --calendar-blocks-range-day-font-weight: 800;
    --calendar-blocks-selected-day-font-weight: 800;
    --calendar-blocks-single-color-1: var(--color-red);
    --calendar-blocks-selected-day-color: var(--calendar-blocks-single-color-1);
  }
  .theme-dark .calendar-blocks-root {
    --calendar-blocks-month-title-color: #94a3b8;
    --calendar-blocks-range-color-1: #2dd4bf;
  }
  .calendar-blocks-selection-circle {
    display: none;
  }
  .calendar-blocks-range-segment {
    fill: none;
  }
---

# Grey out days outside the range

Color Vacation dates with a custom teal CSS color, including weekends, and use
the same color for its legend marker. Mute all
other unselected dates instead of painting a colored range highlight. A separate
appointment uses colored text instead of a circle, matching its legend marker.
All range and single-date numbers use bold text; unselected dates keep their
normal weight. Both entries appear in the legend. The month heading uses a muted
blue-grey color.
This snippet uses theme colors and works in both light and dark mode.

```date
Vacation: 2026.10.10 - 2026.10.20
Appointment: 2026.10.24
```

![linux-light](linux/custom-css-grey-outside-range-light.png)

![linux-dark](linux/custom-css-grey-outside-range-dark.png)
