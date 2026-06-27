# Calendar Blocks Improvement Roadmap

- [ ] Reduce the calendar width.
- [ ] Support a horizontal two-month layout.
- [ ] Extract the SVG calendar into a template that the code uses instead of
      drawing the SVG from scratch.
  - [ ] Mark editable and dynamic template elements with stable tags or IDs.
  - [ ] Allow the template to be edited independently in Inkscape without
        changing the renderer code.
  - [ ] Represent every supported visual case in the template:
    - [ ] Current-date rendering.
    - [ ] Horizontal layout.
    - [ ] Vertical layout.
    - [ ] A date range within one week.
    - [ ] A date range spanning multiple weeks within one month.
    - [ ] A date range spanning adjacent months.
    - [ ] A date range spanning three or more months.
- [ ] Add plugin settings.
  - [ ] Calendar width.
  - [ ] Selected calendar design.
- [ ] Cache rendered calendars.
