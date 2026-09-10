/* Moraview forecast engine.
   One scenario in, a day-by-day balance projection out. No dependencies.
   Amounts are signed: income positive, expense negative. Currency is EUR. */
var MV = (function () {
  var DAY = 86400000;

  function parseDate(s) {
    var p = String(s).split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function daysBetween(a, b) { return Math.round((b - a) / DAY); }
  function lastDom(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  function addMonths(d, n) {
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + n, dom = d.getUTCDate();
    var ny = y + Math.floor(m / 12), nm = ((m % 12) + 12) % 12;
    return new Date(Date.UTC(ny, nm, Math.min(dom, lastDom(ny, nm))));
  }

  var CADENCE = {
    weekly:    { days: 7 },
    biweekly:  { days: 14 },
    monthly:   { months: 1 },
    quarterly: { months: 3 },
    yearly:    { months: 12 }
  };

  /* Every date a recurring line falls due inside [from, to]. */
  function occurrences(line, from, to) {
    var step = CADENCE[line.cadence];
    if (!step) return [];
    var cursor = parseDate(line.on);
    var start = line.from ? parseDate(line.from) : null;
    var end = line.to ? parseDate(line.to) : null;
    var out = [], guard = 0;

    while (cursor < from && guard++ < 6000) {
      cursor = step.days ? addDays(cursor, step.days) : addMonths(cursor, step.months);
    }
    while (cursor <= to && guard++ < 6000) {
      if ((!start || cursor >= start) && (!end || cursor <= end)) out.push(cursor);
      cursor = step.days ? addDays(cursor, step.days) : addMonths(cursor, step.months);
    }
    return out;
  }

  function amountOf(line) {
    var factor = typeof line.factor === 'number' ? line.factor : 1;
    return line.amount * factor;
  }

  /* Day-by-day projection. Returns one entry per day from asOf to the horizon,
     each carrying the closing balance and the movements booked that day. */
  function project(scenario, months) {
    var horizonMonths = months || scenario.horizonMonths || 36;
    var from = parseDate(scenario.asOf);
    var to = addMonths(from, horizonMonths);
    var span = daysBetween(from, to);

    var byDay = {};
    function book(date, line, amount) {
      var key = iso(date);
      (byDay[key] || (byDay[key] = [])).push({
        id: line.id, label: line.label, category: line.category,
        amount: amount, planned: !!line.date, estimate: !!line.estimate
      });
    }

    (scenario.recurring || []).forEach(function (line) {
      if (line.off) return;
      occurrences(line, from, to).forEach(function (d) { book(d, line, amountOf(line)); });
    });
    (scenario.planned || []).forEach(function (line) {
      if (line.off) return;
      var d = parseDate(line.date);
      if (d >= from && d <= to) book(d, line, amountOf(line));
    });

    var balance = (scenario.accounts || []).reduce(function (s, a) {
      return s + (a.inForecast === false ? 0 : a.balance);
    }, 0);

    var days = [], low = null;
    for (var i = 0; i <= span; i++) {
      var date = addDays(from, i), key = iso(date);
      var events = byDay[key] || [];
      var moved = events.reduce(function (s, e) { return s + e.amount; }, 0);
      balance += moved;
      var entry = { date: key, day: date, balance: balance, moved: moved, events: events };
      days.push(entry);
      if (!low || balance < low.balance) low = entry;
    }

    var buffer = scenario.buffer || 0;
    var breach = days.find(function (d) { return d.balance < buffer; }) || null;
    var negative = days.find(function (d) { return d.balance < 0; }) || null;

    return {
      asOf: scenario.asOf, from: from, to: to, days: days,
      opening: days.length ? days[0].balance - days[0].moved : 0,
      index: days.reduce(function (m, d) { m[d.date] = d; return m; }, {}),
      low: low, buffer: buffer, breach: breach, negative: negative
    };
  }

  /* Averaged monthly rhythm of the recurring lines only. */
  function monthlyNet(scenario) {
    var per = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
    var inflow = 0, outflow = 0;
    (scenario.recurring || []).forEach(function (line) {
      if (line.off) return;
      var m = amountOf(line) * (per[line.cadence] || 0);
      if (m >= 0) inflow += m; else outflow += m;
    });
    return { inflow: inflow, outflow: outflow, net: inflow + outflow };
  }

  /* Everything that moves between two dates, grouped for a breakdown panel. */
  function movements(forecast, fromIso, toIso) {
    var groups = {}, total = 0;
    forecast.days.forEach(function (d) {
      if (d.date <= fromIso || d.date > toIso) return;
      d.events.forEach(function (e) {
        var g = groups[e.label] || (groups[e.label] = {
          label: e.label, category: e.category, count: 0, amount: 0, planned: e.planned
        });
        g.count++; g.amount += e.amount; total += e.amount;
      });
    });
    var list = Object.keys(groups).map(function (k) { return groups[k]; });
    list.sort(function (a, b) { return Math.abs(b.amount) - Math.abs(a.amount); });
    return {
      lines: list, total: total,
      inflow: list.reduce(function (s, g) { return s + Math.max(g.amount, 0); }, 0),
      outflow: list.reduce(function (s, g) { return s + Math.min(g.amount, 0); }, 0)
    };
  }

  /* Calendar-month rollup: what came in, what went out, where it ended. */
  function byMonth(forecast) {
    var out = [], current = null;
    forecast.days.forEach(function (d) {
      var key = d.date.slice(0, 7);
      if (!current || current.month !== key) {
        current = { month: key, inflow: 0, outflow: 0, end: d.balance, low: d.balance, events: [] };
        out.push(current);
      }
      d.events.forEach(function (e) {
        if (e.amount >= 0) current.inflow += e.amount; else current.outflow += e.amount;
        current.events.push(Object.assign({ date: d.date }, e));
      });
      current.end = d.balance;
      if (d.balance < current.low) current.low = d.balance;
    });
    out.forEach(function (m) { m.net = m.inflow + m.outflow; });
    return out;
  }

  function money(v, opts) {
    var o = opts || {};
    /* Belgian format, minus the space after the symbol: in a monospaced face a
       space takes a full character width and splits the figure in two. */
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: o.cents === false ? 0 : 2,
      maximumFractionDigits: o.cents === false ? 0 : 2
    }).format(v).replace(/\u00a0/g, '');
  }
  function signed(v, opts) { return (v > 0 ? '+' : '') + money(v, opts); }
  function longDate(d) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(typeof d === 'string' ? parseDate(d) : d);
  }
  function shortDate(d) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(typeof d === 'string' ? parseDate(d) : d);
  }
  function monthLabel(key) {
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
      .format(parseDate(key + '-01'));
  }
  function distance(fromIso, toIso) {
    var n = daysBetween(parseDate(fromIso), parseDate(toIso));
    if (n === 0) return 'today';
    var past = n < 0; n = Math.abs(n);
    var months = Math.floor(n / 30.44), rest = Math.round(n - months * 30.44);
    var parts = [];
    if (months) parts.push(months + (months === 1 ? ' month' : ' months'));
    if (rest || !months) parts.push(rest + (rest === 1 ? ' day' : ' days'));
    return (past ? '' : 'in ') + parts.join(', ') + (past ? ' ago' : '');
  }

  return {
    parseDate: parseDate, iso: iso, addDays: addDays, addMonths: addMonths,
    daysBetween: daysBetween, occurrences: occurrences, project: project,
    monthlyNet: monthlyNet, movements: movements, byMonth: byMonth,
    money: money, signed: signed, longDate: longDate, shortDate: shortDate,
    monthLabel: monthLabel,
    distance: distance
  };
})();
