# Moraview

Three takes on the same question: **what does my money look like on a given future
date?** You describe what comes in and what goes out — recurring lines and planned
one-offs — and the forecast runs day by day from today to the horizon.

All three interfaces share one engine (`src/finance.js`) and one sample household
(`src/scenario.js`), so they answer identically and differ only in how you ask.

| Interface | The question it is built around | How you steer it |
|---|---|---|
| **Horizon Dial** | "How much will I have on *that* day?" | Drag a needle along the timeline |
| **Cashflow River** | "Which lines are doing this to me?" | Edit and mute lines, watch the river re-cut |
| **Runway Grid** | "Which days are the tight ones?" | Every day of the next 30 months as a cell |

## Layout

```
src/finance.js    forecast engine — occurrences, daily projection, rollups, formatting
src/scenario.js   the sample household (EUR, Belgian household lines)
src/*.html        one template per interface
build.mjs         inlines the shared scripts into dist/
dist/*.html       what gets published
```

## Build

```bash
node build.mjs
```

Each interface keeps your edits in `localStorage` under its own key and offers a
reset back to the sample. Nothing leaves the page.
