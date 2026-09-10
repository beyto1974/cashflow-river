import { compareDates, type PlainDate } from './dates';
import { formatEUR, type Cents } from './money';
import type { BandedForecast } from './forecast';
import { stretchesBelow, tightStretches, type Stretch } from './stretches';

export type Tone = 'clear' | 'tight' | 'red';

export interface Summary {
  /** What the likely reading says, in one sentence. */
  sentence: string;
  /** What the guesses could do to that, when they make it worse. */
  risk: string | undefined;
  tone: Tone;
  /** The stretches to warn about: the low edge of the band. */
  stretches: Stretch[];
  /** The stretches on the likely reading alone. */
  likelyStretches: Stretch[];
  /** What the read-out date itself looks like, when one was given. */
  onTarget: string | undefined;
}

const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});

function longDate(date: PlainDate): string {
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`));
}

function days(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

/**
 * The answer in one sentence, because that is what most people came for. It
 * reads the low edge of the band: a warning that only fires on the average case
 * warns nobody.
 */
export function summarise(banded: BandedForecast, buffer: Cents, target?: PlainDate): Summary {
  const stretches = tightStretches(banded, buffer);
  const likelyStretches = stretchesBelow(
    banded.likely.days.map((day) => ({ date: day.date, balance: day.balance })),
    buffer
  );
  const onTarget = target ? describeTarget(banded, buffer, target) : undefined;
  const horizon = banded.band[banded.band.length - 1]?.date;
  const start = banded.band[0]?.date;
  const floor = formatEUR(buffer, { cents: false });

  const sentence =
    likelyStretches.length === 0
      ? `Your buffer of ${floor} holds all the way to ${horizon ? longDate(horizon) : 'the horizon'}.`
      : describeStretches(likelyStretches, buffer, start);

  const risk = describeRisk(likelyStretches, stretches, buffer);
  const overdrawn =
    likelyStretches.some((stretch) => stretch.overdrawn) || stretches.some((stretch) => stretch.overdrawn);

  return {
    sentence,
    risk,
    tone: overdrawn ? 'red' : stretches.length > 0 ? 'tight' : 'clear',
    stretches,
    likelyStretches,
    onTarget
  };
}

function describeStretches(stretches: Stretch[], buffer: Cents, start: PlainDate | undefined): string {
  const first = stretches[0] as Stretch;
  const overdrawn = stretches.find((stretch) => stretch.overdrawn);
  const total = stretches.reduce((sum, stretch) => sum + stretch.days, 0);
  const floor = formatEUR(buffer, { cents: false });

  const opening =
    start && compareDates(first.from, start) <= 0
      ? `You are already under your ${floor} buffer`
      : `You are fine until ${longDate(first.from)}, then under your ${floor} buffer`;

  const spell =
    stretches.length > 1
      ? ` — ${days(total)} of it across ${stretches.length} stretches`
      : ` for ${days(first.days)}`;

  const ending = overdrawn
    ? `, and overdrawn from ${longDate(overdrawn.from)}, by as much as ${formatEUR(
        Math.abs(overdrawn.deepest.balance)
      )} on ${longDate(overdrawn.deepest.date)}.`
    : `, at worst ${formatEUR(first.shortfall)} short of it on ${longDate(first.deepest.date)}.`;

  return `${opening}${spell}${ending}`;
}

/** Only worth saying when the guesses make things worse than the likely reading. */
function describeRisk(likelyStretches: Stretch[], riskStretches: Stretch[], buffer: Cents): string | undefined {
  if (riskStretches.length === 0) return undefined;
  const risk = riskStretches[0] as Stretch;
  const floor = formatEUR(buffer, { cents: false });

  if (likelyStretches.length === 0) {
    return `If the guessed lines go against you it dips under ${floor} from ${longDate(risk.from)}, at worst ${formatEUR(
      risk.shortfall
    )} short of it${risk.overdrawn ? ' — and into an overdraft' : ''}.`;
  }

  const likely = likelyStretches[0] as Stretch;
  const earlier = compareDates(risk.from, likely.from) < 0;
  const deeper = risk.shortfall > likely.shortfall;
  if (!earlier && !deeper) return undefined;

  const parts: string[] = [];
  if (earlier) parts.push(`it could start as early as ${longDate(risk.from)}`);
  if (deeper) parts.push(`and go ${formatEUR(risk.shortfall)} short`);
  return `If the guessed lines go against you, ${parts.join(' ')}.`;
}

function describeTarget(banded: BandedForecast, buffer: Cents, target: PlainDate): string | undefined {
  const day = banded.likely.dayAt(target);
  if (!day) return undefined;
  const edge = banded.band.find((candidate) => candidate.date === target);
  const range = edge && edge.low !== edge.high
    ? ` (somewhere between ${formatEUR(edge.low, { cents: false })} and ${formatEUR(edge.high, { cents: false })})`
    : '';
  const verdict =
    (edge?.low ?? day.balance) < 0
      ? ' — that could be an overdraft'
      : (edge?.low ?? day.balance) < buffer
        ? ' — that could be under your buffer'
        : '';
  return `On ${longDate(target)} you have ${formatEUR(day.balance)}${range}${verdict}.`;
}
