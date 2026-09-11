# Two more readings: Flow and Month ends

Built on a branch and merged. Both are still on probation — see the notes at the
end for what would have to improve if they are to stay.

## Flow — a Sankey of where it came from and where it went

One node per band on each side, a hub in the middle, and a ribbon per band whose
thickness is its share. The period is switchable: this month, the next twelve
months, or the whole forecast.

The two sides are **made to balance**: whatever income is not spent becomes a
"Left over" destination, and spending beyond income becomes a "Shortfall"
source. Without that the diagram would quietly imply the books balance when they
do not.

A figures table sits under the diagram — partly as the accessible reading, partly
because a Sankey is bad at exactly the thing a household wants from it: the
number. That is the honest case against this chart, and it is why I argued
against building it: the river already answers "which bands, how big, in what
order", in time order, which a Sankey throws away.

What it is genuinely good for: seeing at a glance that one band dwarfs the rest,
and that a band can be *both* — in the example, "Getting around" is a net source
over twelve months, because selling the car outweighs a year of fuel.

## Month ends — one bar per month

A bar per month, as tall as the figure asked for:

- **Ends at** — the closing balance, banded against the buffer (amber under it,
  red overdrawn) with the buffer line drawn.
- **Money in** — the month's total income.
- **Money out** — the month's total spending, drawn as a magnitude.

Neither total answers to the buffer, so the line is not drawn over them. The
read-out describes the whole month whichever bar is drawn — in, out, ends at,
lowest — because a bar is one figure and the other three are what make sense of
it.

This is the plainest thing in the app and probably the most useful: no reading
required, only glancing.

## The calendar, laid out either way

The grid reads as a wall calendar by default: a month per row, the days across,
years marked down the left. A year of days fits on one screen that way, and the
tight weeks show up as amber runs rather than as a column to decode.

"Months across" turns it back — months as columns, day of month down — which
packs far more months into the same width and is what the original prototype
did. The arrow keys follow the grain either way: sideways is always the next day
in the yearly layout and the next month in the compact one, so left and right
mean "next to this one on screen" rather than something fixed.

## Also on this branch

- **Part months are marked.** The first and last months of a forecast are
  shorter than a month, so their totals read as a collapse in income — the bars
  are drawn hollow, the table badges them, and the read-out says so.
- **The month detail can be sorted**: by date, biggest first, or smallest first
  (by size, in or out), remembered with the other view preferences.

## If they stay

- The Flow's period control and the Month ends' measure control are component
  state, so neither is remembered like the view itself. Both should join the
  preferences if they ship.
- The Sankey's node labels crowd when a band is tiny; the figures fall off first,
  then the label greys. A minimum ribbon thickness would read better than the
  present proportional-to-nothing sliver.
