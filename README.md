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

## Published

| Interface | Link |
|---|---|
| Horizon Dial | https://claude.ai/code/artifact/5a9b25e2-b81e-4fe5-9544-a44b9463aed7 |
| Cashflow River | https://claude.ai/code/artifact/58b00080-b35d-43eb-86ca-46a7d965412f |
| Runway Grid | https://claude.ai/code/artifact/a4e675e4-e635-45a3-a5d7-c36de199c270 |

## Build

```bash
node build.mjs
```

Each interface keeps your edits in `localStorage` under its own key and offers a
reset back to the sample. Nothing leaves the page.
