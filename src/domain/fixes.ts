import { addDays, compareDates, type PlainDate } from './dates';
import { formatEUR, type Cents } from './money';
import { longDate, weeks as weekCount } from './phrasing';
import { project } from './forecast';
import { stretchesBelow, type Stretch } from './stretches';
import { isPlanned, isRecurring, type Line, type Scenario } from './types';

/** A single change to one line — the smallest thing a household could do. */
export type Change =
  | { type: 'move-line'; lineId: string; date: PlainDate }
  | { type: 'set-amount'; lineId: string; amount: Cents }
  | { type: 'split-line'; lineId: string; date: PlainDate };

export interface Fix {
  change: Change;
  /** What to do, in words the household can act on. */
  description: string;
  /** Lower is less disruptive. Only meaningful for ordering. */
  disruption: number;
  /** The fix clears the first tight stretch. */
  clearsFirst: boolean;
  /** The fix clears every tight stretch in the forecast. */
  clearsAll: boolean;
}

export function applyChange(scenario: Scenario, change: Change): Scenario {
  const target = scenario.lines.find((line) => line.id === change.lineId);
  if (!target) return scenario;

  if (change.type === 'set-amount') {
    return {
      ...scenario,
      lines: scenario.lines.map((line) => (line.id === change.lineId ? { ...line, amount: change.amount } : line))
    };
  }

  if (change.type === 'move-line') {
    if (!isPlanned(target)) return scenario;
    return {
      ...scenario,
      lines: scenario.lines.map((line) =>
        line.id === change.lineId && isPlanned(line) ? { ...line, date: change.date } : line
      )
    };
  }

  /* Half now, half on the later date. Rounding keeps the total exact. */
  if (!isPlanned(target)) return scenario;
  const firstHalf = Math.round(target.amount / 2);
  const secondHalf = target.amount - firstHalf;
  return {
    ...scenario,
    lines: [
      ...scenario.lines.map((line) =>
        line.id === change.lineId ? { ...line, amount: firstHalf, label: `${line.label} (first half)` } : line
      ),
      { ...target, id: `${target.id}-rest`, label: `${target.label} (second half)`, amount: secondHalf, date: change.date }
    ]
  };
}

const MOVE_WEEKS = [1, 2, 3, 4, 6, 8, 12];
/** What is left of a line after the cut. */
const SAVING_SHARES = [0.75, 0.5, 0.25, 0];
/** Living costs are only ever trimmed, never switched off: nobody stops eating. */
const LIVING_SHARES = [0.9, 0.8, 0.75];
const MAX_SUGGESTIONS = 4;

/**
 * The stretches a fix aims at: the likely reading, which is what the sentence
 * above the chart states and what a household plans against. Aiming at the
 * pessimistic edge of the band would demand fixes several times larger than the
 * problem it is actually solving.
 */
function likelyStretches(scenario: Scenario): Stretch[] {
  const forecast = project(scenario);
  return stretchesBelow(
    forecast.days.map((day) => ({ date: day.date, balance: day.balance })),
    scenario.buffer
  );
}

/**
 * Looks for the least disruptive single change that clears the first tight
 * stretch. Only three kinds of change are tried, because they are the three a
 * household can actually make this month: move a one-off later, spend less on a
 * line it controls, or split a one-off in two.
 *
 * One projection per candidate, so this is called on demand rather than on
 * every keystroke.
 */
export function suggestFixes(scenario: Scenario): Fix[] {
  const before = likelyStretches(scenario);
  const first = before[0];
  if (!first) return [];

  const candidates = [
    ...moveCandidates(scenario, first),
    ...trimCandidates(scenario),
    ...splitCandidates(scenario, first)
  ];

  const fixes: Fix[] = [];
  for (const candidate of candidates) {
    const after = likelyStretches(applyChange(scenario, candidate.change));
    const clearsFirst = !after.some((stretch) => overlaps(stretch, first));
    if (!clearsFirst) continue;
    fixes.push({ ...candidate, clearsFirst, clearsAll: after.length === 0 });
  }

  /* One suggestion per line: the cheapest version of each idea. */
  const best = new Map<string, Fix>();
  for (const fix of fixes.sort((a, b) => a.disruption - b.disruption)) {
    const key = `${fix.change.type}:${fix.change.lineId}`;
    if (!best.has(key)) best.set(key, fix);
  }

  return [...best.values()]
    .sort((a, b) => Number(b.clearsAll) - Number(a.clearsAll) || a.disruption - b.disruption)
    .slice(0, MAX_SUGGESTIONS)
    .sort((a, b) => a.disruption - b.disruption);
}

function overlaps(a: Stretch, b: Stretch): boolean {
  return compareDates(a.from, b.to) <= 0 && compareDates(b.from, a.to) <= 0;
}

/** One-offs that fall due before the stretch ends, and could wait. */
function spendingBefore(scenario: Scenario, stretch: Stretch): Line[] {
  return scenario.lines.filter(
    (line) =>
      !line.muted &&
      line.amount < 0 &&
      isPlanned(line) &&
      compareDates(line.date, stretch.to) <= 0 &&
      compareDates(line.date, scenario.asOf) >= 0
  );
}

function moveCandidates(scenario: Scenario, stretch: Stretch): Omit<Fix, 'clearsFirst' | 'clearsAll'>[] {
  return spendingBefore(scenario, stretch).flatMap((line) =>
    MOVE_WEEKS.map((weeks) => {
      const date = addDays((line as Extract<Line, { kind: 'planned' }>).date, weeks * 7);
      return {
        change: { type: 'move-line' as const, lineId: line.id, date },
        description: `Put off ${line.label} by ${weekCount(weeks)}, to ${longDate(date)}`,
        disruption: weeks * 2
      };
    })
  );
}

/**
 * Lines a household can choose to spend less on. A transfer to savings can be
 * paused outright — that is what it is for — while a living cost is only ever
 * trimmed, because "stop buying food" is not advice.
 */
function trimCandidates(scenario: Scenario): Omit<Fix, 'clearsFirst' | 'clearsAll'>[] {
  return scenario.lines
    .filter((line) => !line.muted && line.amount < 0 && isRecurring(line))
    .flatMap((line) => {
      const shares =
        line.category === 'saving' ? SAVING_SHARES : line.category === 'living' ? LIVING_SHARES : [];
      return shares.map((share) => {
        const amount = Math.round(line.amount * share);
        const saved = line.amount - amount;
        return {
          change: { type: 'set-amount' as const, lineId: line.id, amount },
          description:
            share === 0
              ? `Pause ${line.label} for now, keeping ${formatEUR(-line.amount, { cents: false })} a time`
              : `Spend ${formatEUR(-saved, { cents: false })} a time less on ${line.label}`,
          disruption: (line.category === 'saving' ? 8 : 30) + Math.round((1 - share) * 30)
        };
      });
    });
}

function splitCandidates(scenario: Scenario, stretch: Stretch): Omit<Fix, 'clearsFirst' | 'clearsAll'>[] {
  return spendingBefore(scenario, stretch)
    .filter((line) => Math.abs(line.amount) > 20_000)
    .flatMap((line) =>
      [4, 8, 12].map((weeks) => {
        const date = addDays((line as Extract<Line, { kind: 'planned' }>).date, weeks * 7);
        return {
          change: { type: 'split-line' as const, lineId: line.id, date },
          description: `Pay half of ${line.label} now and half ${weekCount(weeks)} later`,
          disruption: 25 + weeks
        };
      })
    );
}
