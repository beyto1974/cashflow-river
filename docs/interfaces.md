# The three interfaces

Three ways to ask the same question — *what does my money look like on a given
future date?* — over one forecast engine and one sample household. Each was a
single self-contained file; the sources are in `legacy/` and `node
legacy/build.mjs` rebuilds exactly what was published. They were screenshotted at the
time; those files are not kept, since `legacy/build.mjs` rebuilds the pages
themselves.

## 1. Horizon Dial — `legacy/dial.html`


The whole page is one control. A needle is dragged along 30 months of projected
balance and the hero figure reads out what the accounts hold on that exact day;
arrow keys move it a day at a time, shift-arrow a month. Around it: the
movements between today and the needle, the lowest point ahead, the average
monthly rhythm, the first day under the buffer, three what-if dials (income,
living costs, savings transfer) and a switch per planned one-off. Stretches
under the buffer are shaded against the buffer line.

Identity: dark instrument panel. Instrument Sans with Chivo Mono figures, one
signal colour for the trace, status colours only for states that need alarm.

**Reads best for:** a single date you already have in mind — a completion date,
a holiday, a school bill.

## 2. Cashflow River — `legacy/river.html`  ← chosen direction


An editable ledger on the left, the river it cuts on the right. Monthly stacks
sit mirrored around the month axis — money in above, money out below, with a net
marker per month — and beneath them runs "the bed it leaves", the day-by-day
balance. Editing an amount, muting a line or adding a new line re-cuts both
panels. Clicking a month opens every movement in it.

Identity: editorial ledger. Newsreader for display, IBM Plex Sans and Mono for
the ledger itself, hairline rules instead of cards.

This is the one now rebuilt as the app (TypeScript, Svelte 5, Vite); the file in
`legacy/` is the original prototype.

Seven colour bands, stacked in an order that clears the palette validator's
adjacent-pair gates in both light and dark mode; the legend, the tooltip and the
table view carry identity for the two bands that sit under 3:1 on light paper.

**Reads best for:** finding out *which lines* are doing this to you, and what
changes if one of them stops.

## 3. Runway Grid — `legacy/grid.html`


No chart at all: 913 days as cells, months across, day of month down, each cell
coloured by what the accounts close at that evening. The bands are multiples of
the buffer, so the entire grid re-reads itself when the buffer changes. Amber is
under the buffer, hatched red is overdrawn — the alarming states never rest on
colour alone. Clicking a day shows what moves on it and lets a payment be parked
there, and the months after it recolour.

Identity: Swiss matrix. Archivo with Azeret Mono figures, a single-hue sequential
ramp (inverted for the dark ground), no rounded cards.

**Reads best for:** spotting the tight days — which weeks are actually the
problem, and how long the tight stretch runs.

## The decision

**Cashflow River** is the direction to build out. It is the only one of the
three that treats the input as the interface: the ledger is where the household
actually lives, the chart is the consequence. The Dial answers one date well but
has nowhere to put real data entry; the Grid is the best diagnostic of the three
but is a reading surface, not an editing one. The next roadmap is in
`docs/river-roadmap.md`.
