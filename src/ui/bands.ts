import type { Category } from '../domain/types';

export interface Band {
  key: string;
  label: string;
  categories: Category[];
  /** A CSS custom property, so the band re-themes with the page. */
  color: string;
}

/**
 * Seven bands, in the order they stack outwards from the month axis.
 *
 * The order is not cosmetic: it is one of the orders that clears the palette
 * validator's adjacent-pair gates in both light and dark mode, so two bands that
 * touch stay distinguishable for colour-blind vision as well. Reordering these
 * means re-running that validation.
 */
export const BANDS: Band[] = [
  { key: 'salary', label: 'Pay and invoices', categories: ['salary'], color: 'var(--s-salary)' },
  { key: 'benefit', label: 'Benefits', categories: ['benefit'], color: 'var(--s-benefit)' },
  { key: 'bills', label: 'House and bills', categories: ['housing'], color: 'var(--s-bills)' },
  { key: 'cover', label: 'Cover and tax', categories: ['insurance', 'tax'], color: 'var(--s-cover)' },
  { key: 'daily', label: 'Day to day', categories: ['living'], color: 'var(--s-daily)' },
  { key: 'moving', label: 'Getting around', categories: ['transport'], color: 'var(--s-moving)' },
  { key: 'plans', label: 'Saving and plans', categories: ['saving', 'travel'], color: 'var(--s-plans)' }
];

const BY_CATEGORY = new Map<Category, Band>(
  BANDS.flatMap((band) => band.categories.map((category) => [category, band] as const))
);

export function bandFor(category: Category): Band {
  const band = BY_CATEGORY.get(category);
  if (!band) throw new Error(`No band covers category ${category}`);
  return band;
}

/** How the household would name each category in a picker. */
export const CATEGORY_LABELS: Record<Category, string> = {
  salary: 'Pay or invoices',
  benefit: 'Benefit',
  housing: 'House and bills',
  insurance: 'Insurance',
  tax: 'Tax',
  living: 'Day to day',
  transport: 'Getting around',
  travel: 'Travel',
  saving: 'Saving'
};
