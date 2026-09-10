/* Sample household, marked as an example everywhere it is shown.
   A two-income Flemish household with a mortgage, one car and two kids.
   Dates are the day the money actually lands or leaves. */
var SCENARIO = {
  label: 'Example household — Ghent, two incomes',
  asOf: '2026-09-10',
  horizonMonths: 30,
  buffer: 2500,
  accounts: [
    { name: 'Current account', balance: 2410.40 },
    { name: 'Joint account', balance: 1180.15 },
    { name: 'Savings', balance: 9250.00, inForecast: false }
  ],
  recurring: [
    { id: 'sal-1', label: 'Net salary — Hilde', amount: 2940.00, cadence: 'monthly', on: '2026-09-27', category: 'salary' },
    { id: 'sal-2', label: 'Freelance invoices — Bram', amount: 1120.00, cadence: 'monthly', on: '2026-09-15', category: 'salary', estimate: true },
    { id: 'grw', label: 'Groeipakket (child benefit)', amount: 356.80, cadence: 'monthly', on: '2026-09-08', category: 'benefit' },
    { id: 'hol', label: 'Holiday pay', amount: 1890.00, cadence: 'yearly', on: '2027-05-22', category: 'salary' },
    { id: 'thi', label: 'Year-end bonus', amount: 2640.00, cadence: 'yearly', on: '2026-12-18', category: 'salary' },

    { id: 'mor', label: 'Mortgage — KBC', amount: -1142.00, cadence: 'monthly', on: '2026-10-01', category: 'housing' },
    { id: 'ene', label: 'Energy advance — Luminus', amount: -214.00, cadence: 'monthly', on: '2026-09-15', category: 'housing' },
    { id: 'wat', label: 'Water — Farys', amount: -128.00, cadence: 'quarterly', on: '2026-10-05', category: 'housing' },
    { id: 'tel', label: 'Internet + mobile — Telenet', amount: -78.50, cadence: 'monthly', on: '2026-09-20', category: 'housing' },
    { id: 'gro', label: 'Groceries', amount: -195.00, cadence: 'weekly', on: '2026-09-12', category: 'living', estimate: true },
    { id: 'car', label: 'Fuel + car upkeep', amount: -180.00, cadence: 'monthly', on: '2026-09-25', category: 'transport', estimate: true },
    { id: 'ins', label: 'Car insurance — AG', amount: -612.00, cadence: 'yearly', on: '2027-03-04', category: 'insurance' },
    { id: 'hom', label: 'Home + liability insurance', amount: -486.00, cadence: 'yearly', on: '2026-11-08', category: 'insurance' },
    { id: 'hos', label: 'Hospital cover — CM', amount: -62.30, cadence: 'monthly', on: '2026-09-11', category: 'insurance' },
    { id: 'pri', label: 'Property tax (onroerende voorheffing)', amount: -1284.00, cadence: 'yearly', on: '2026-10-28', category: 'tax' },
    { id: 'sch', label: 'School + childcare', amount: -340.00, cadence: 'quarterly', on: '2026-09-30', category: 'living' },
    { id: 'sub', label: 'Subscriptions + gym', amount: -66.98, cadence: 'monthly', on: '2026-09-18', category: 'living' },
    { id: 'kit', label: 'Kitchen renovation loan', amount: -276.40, cadence: 'monthly', on: '2026-09-14', category: 'housing', to: '2028-04-14' },
    { id: 'clu', label: 'Music school + sports clubs', amount: -145.00, cadence: 'monthly', on: '2026-09-16', category: 'living' },
    { id: 'hsh', label: 'Household + clothing', amount: -220.00, cadence: 'monthly', on: '2026-09-22', category: 'living', estimate: true },
    { id: 'lei', label: 'Eating out + leisure', amount: -260.00, cadence: 'monthly', on: '2026-09-24', category: 'living', estimate: true },
    { id: 'pen', label: 'Pension saving (pensioensparen)', amount: -1050.00, cadence: 'yearly', on: '2026-11-24', category: 'saving' },
    { id: 'sav', label: 'Standing transfer to savings', amount: -400.00, cadence: 'monthly', on: '2026-09-28', category: 'saving' }
  ],
  planned: [
    { id: 'p-wash', label: 'Replace washing machine', amount: -680.00, date: '2026-10-20', category: 'living' },
    { id: 'p-holdep', label: 'Andalusia trip — deposit', amount: -750.00, date: '2026-11-15', category: 'travel' },
    { id: 'p-refund', label: 'Tax refund', amount: 842.00, date: '2026-12-05', category: 'tax' },
    { id: 'p-dent', label: 'Dental implant (own share)', amount: -1450.00, date: '2027-01-12', category: 'living' },
    { id: 'p-carsale', label: 'Sell the old Polo', amount: 3400.00, date: '2027-02-06', category: 'transport' },
    { id: 'p-holbal', label: 'Andalusia trip — balance', amount: -1950.00, date: '2027-03-02', category: 'travel' },
    { id: 'p-solar', label: 'Solar panels — own contribution', amount: -4200.00, date: '2027-06-15', category: 'housing' }
  ],
  categories: {
    salary:    { label: 'Income',      slot: 1 },
    benefit:   { label: 'Benefits',    slot: 3 },
    housing:   { label: 'House',       slot: 2 },
    living:    { label: 'Living',      slot: 4 },
    transport: { label: 'Transport',   slot: 5 },
    insurance: { label: 'Insurance',   slot: 7 },
    tax:       { label: 'Tax',         slot: 8 },
    travel:    { label: 'Travel',      slot: 6 },
    saving:    { label: 'Saving',      slot: 6 }
  }
};
