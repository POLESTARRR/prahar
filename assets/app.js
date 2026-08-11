/* PRAHAR: engine + interface */

const T0 = 6, T1 = 26;      // the planning window: 06:00 → 02:00
const THRESHOLD = 2.6;      // serve-units at which a watch is judged "over"
const STORE = "prahar.v2";
const MIN_DAYS = 3;         // exposures needed before a food gets a verdict

/* ---------------------------------------------------------------- state --- */

const isoOf = d => d.getFullYear() + "-" +
  String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const todayKey = () => isoOf(new Date());
const shiftKey = (key, days) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + days);
  return isoOf(dt);
};
const prettyKey = key => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (key === todayKey()) return "Today";
  if (key === shiftKey(todayKey(), -1)) return "Yesterday";
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

const blankDay = () => ({ meals: [], events: [], symptoms: [], score: null, note: "" });

const blank = () => ({
  days: { [todayKey()]: Object.assign(blankDay(), { events: [{ id: 1, name: "Team meeting", t: 15 }] }) },
  date: todayKey(),
  profile: { flags: {}, rome: {}, bristol: { hard: null, loose: null } },
  body: { kg: 70, goal: "gain" },
  month: todayKey().slice(0, 7),
  tol: KEYS.reduce((o, k) => (o[k] = 1, o), {}),
  tested: KEYS.reduce((o, k) => (o[k] = false, o), {}),
  filter: "all",
  uid: 2
});

/* The current day's records are reached through state.meals / .events / .symptoms
   so the rest of the app never has to think about dates. Non-enumerable, so
   JSON.stringify serialises `days` as the single source of truth. */
function bindDay(s) {
  ["meals", "events", "symptoms"].forEach(k => {
    Object.defineProperty(s, k, {
      get() { return dayRec()[k]; },
      set(v) { dayRec()[k] = v; },
      enumerable: false, configurable: true
    });
  });
  return s;
}
function dayRec() {
  if (!state.days[state.date]) state.days[state.date] = blankDay();
  return state.days[state.date];
}

let state = bindDay(load());

function load() {
  try {
    const raw = localStorage.getItem(STORE) || localStorage.getItem("prahar.v1");
    if (!raw) return blank();
    const p = JSON.parse(raw);
    if (!p.days) {                                   // migrate a single-day v1 save
      const base = blank();
      base.days[todayKey()] = Object.assign(blankDay(), {
        meals: p.meals || [], events: p.events || [], symptoms: p.symptoms || []
      });
      return Object.assign(base, { tol: p.tol || base.tol, tested: p.tested || base.tested, uid: p.uid || 2 });
    }
    const merged = Object.assign(blank(), p);
    merged.profile = Object.assign(blank().profile, p.profile || {});
    merged.body = Object.assign(blank().body, p.body || {});
    return merged;
  } catch { return blank(); }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
}

/* --------------------------------------------------------------- engine --- */

/* Gamma-shaped release curve, normalised so its own peak equals 1.
   Nothing is released before you eat, it climbs, it decays. */
function kernel(dt, peak, a) {
  if (dt <= 0) return 0;
  const theta = peak / (a - 1);
  return (Math.pow(dt, a - 1) * Math.exp(-dt / theta)) /
         (Math.pow(peak, a - 1) * Math.exp(-(a - 1)));
}

const dishOf = id => DISHES.find(d => d.id === id);
const watchOf = t => PRAHARS[Math.max(0, Math.min(7, Math.floor((t - 6) / 3)))];
/* Sentences use the English name; the Sanskrit stays as the label on the chart. */
const watchWord = t => watchOf(t).g.toLowerCase();
const fmt = t => {
  const h = Math.floor(t) % 24, m = Math.round((t % 1) * 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
};

/* Grams after variant, preparation and portion are applied. */
function gramsOf(meal) {
  const d = dishOf(meal.dish);
  const vm = VARIANTS[meal.variant].mult, pm = PREPS[meal.prep].mult, out = {};
  KEYS.forEach(k => out[k] = d.v[k] * (vm[k] ?? 1) * (pm[k] ?? 1) * meal.portion);
  return out;
}

/* Serve-units: grams ÷ your personal cutoff. One unit = one "low" serving. */
const unitsOf = meal => {
  const g = gramsOf(meal);
  return KEYS.reduce((s, k) => s + g[k] / (CHANNELS[k].cut * state.tol[k]), 0);
};
const baseUnits = d =>
  KEYS.reduce((s, k) => s + d.v[k] / (CHANNELS[k].cut * state.tol[k]), 0);

/* Which channel dominates a dish, and therefore when it lands. */
function dominant(d) {
  let best = null, bv = 0;
  KEYS.forEach(k => { const u = d.v[k] / CHANNELS[k].cut; if (u > bv) { bv = u; best = k; } });
  return best;
}

/* Total load at an instant, and its breakdown by channel. */
function intensity(t, meals) {
  let tot = 0; const by = {};
  KEYS.forEach(k => by[k] = 0);
  meals.forEach(m => {
    const g = gramsOf(m);
    KEYS.forEach(k => {
      if (!g[k]) return;
      const v = (g[k] / (CHANNELS[k].cut * state.tol[k])) *
                kernel(t - m.t, CHANNELS[k].peak, CHANNELS[k].a);
      by[k] += v; tot += v;
    });
  });
  return { tot, by };
}

const peakDuring = (e, meals) => {
  let mx = 0;
  for (let t = e.t; t <= e.t + 1; t += 0.1) mx = Math.max(mx, intensity(t, meals).tot);
  return mx;
};
const worstPeak = meals => state.events.reduce((mx, e) => Math.max(mx, peakDuring(e, meals)), 0);

/* ------------------------------------------------------------ make it fit --- */
/* Search the modification space, keep only what actually helps, rank by how
   little it costs you. Moving a meal costs nothing. Swapping it costs most. */
function fixesFor(idx) {
  const m = state.meals[idx], d = dishOf(m.dish), now = worstPeak(state.meals), out = [];
  const trial = patch => state.meals.map((x, i) => i === idx ? Object.assign({}, x, patch) : x);

  let best = null;
  for (let t = T0; t <= 23; t += 0.5) {
    const s = worstPeak(trial({ t }));
    if (!best || s < best.s - 1e-6) best = { t, s };
  }
  if (best && best.s < now - 1e-6) {
    const dom = dominant(d);
    const lands = dom ? watchOf(best.t + CHANNELS[dom].peak) : null;
    out.push({ label: "Move to " + fmt(best.t), cost: 0, patch: { t: best.t },
      sub: "eat in the " + watchWord(best.t) + (lands ? " · peaks in the " + lands.g.toLowerCase() : "") });
  }
  if (d.pulse && m.prep !== "soaked")
    out.push({ label: "Soak and rinse", cost: 1, patch: { prep: "soaked" },
      sub: "GOS dissolves in water, so it leaches out" });
  if (d.vr && m.variant !== "jain")
    out.push({ label: "Order it Jain", cost: 2, patch: { variant: "jain" },
      sub: "no onion, no garlic, ask anywhere" });
  if (m.portion > 0.5)
    out.push({ label: "Half portion", cost: 3, patch: { portion: 0.5 },
      sub: d.serve + " → half" });
  const alt = DISHES
    .filter(x => x.region === d.region && x.id !== d.id && baseUnits(x) < baseUnits(d) * 0.45)
    .sort((a, b) => baseUnits(b) - baseUnits(a))[0];
  if (alt)
    out.push({ label: "Swap for " + alt.name, cost: 5, patch: { dish: alt.id },
      sub: baseUnits(alt).toFixed(1) + " units instead of " + baseUnits(d).toFixed(1) });

  return out
    .map(f => Object.assign(f, { after: worstPeak(trial(f.patch)) }))
    .filter(f => f.after < now - 1e-6)
    .sort((a, b) => (a.after > THRESHOLD) - (b.after > THRESHOLD) || a.cost - b.cost)
    .slice(0, 4);
}

/* ---------------------------------------------------------------- triage --- */
/* Does your discomfort actually track your food? For a large share of people
   with IBS it doesn't. The gut produces normal gas and the nervous system
   amplifies the signal. Restricting food further is the wrong treatment for
   that, so this refuses to guess until there's enough evidence. */
function triage() {
  const pts = state.symptoms.map(s => ({ x: intensity(s.t, state.meals).tot, y: s.score }));
  if (pts.length < 8) return { state: "thin", n: pts.length, need: 8 - pts.length };
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  if (sxx === 0 || syy === 0) return { state: "flat", n };
  const r = sxy / Math.sqrt(sxx * syy);
  return { state: r >= 0.5 ? "tracks" : r >= 0.2 ? "partial" : "loose", r, n };
}

/* -------------------------------------------------------------- findings --- */
/* Does a particular food cause you trouble? Compare how you rated the days you
   ate it against the days you didn't. Simple, explainable, and it matches how
   people actually keep a journal: one score for the day, not a lab protocol.
   It will not return a verdict without days on both sides of the comparison. */

const scoredDays = () => Object.entries(state.days)
  .filter(([, d]) => typeof d.score === "number")
  .map(([key, d]) => ({ key, score: d.score, dishes: new Set(d.meals.map(m => m.dish)) }));

function findings() {
  const days = scoredDays();
  const seen = new Map();
  days.forEach(d => d.dishes.forEach(id => seen.set(id, (seen.get(id) || 0) + 1)));

  const out = [];
  seen.forEach((count, id) => {
    const d = dishOf(id); if (!d) return;
    const withD = days.filter(x => x.dishes.has(id));
    const withoutD = days.filter(x => !x.dishes.has(id));
    const mean = a => a.reduce((s, x) => s + x.score, 0) / (a.length || 1);
    const row = {
      id, name: d.name, days: withD.length, off: withoutD.length,
      withMean: mean(withD), withoutMean: mean(withoutD),
      effect: mean(withD) - mean(withoutD)
    };

    /* A food that only ever appears alongside another can't be told apart
       from it. Say so rather than blaming the wrong one. */
    row.tangled = null;
    if (withD.length >= MIN_DAYS) {
      seen.forEach((_, other) => {
        if (other === id || row.tangled) return;
        const always = withD.every(x => x.dishes.has(other));
        const never = withoutD.every(x => !x.dishes.has(other));
        if (always && never && dishOf(other)) row.tangled = dishOf(other).name;
      });
    }

    row.verdict =
      withD.length < MIN_DAYS ? "watching" :
      row.tangled              ? "tangled"  :
      withoutD.length < MIN_DAYS ? "nogap"  :
      row.effect >= 1.5        ? "suspect"  :
      row.effect <= 0.5        ? "cleared"  : "unclear";
    out.push(row);
  });

  const rank = { suspect: 0, unclear: 1, tangled: 2, nogap: 3, watching: 4, cleared: 5 };
  return out.sort((a, b) => rank[a.verdict] - rank[b.verdict] || b.effect - a.effect);
}

const VERDICT = {
  suspect:  { label: "Suspect",  tone: "bad"  },
  unclear:  { label: "Unclear",  tone: ""     },
  tangled:  { label: "Tangled",  tone: ""     },
  nogap:    { label: "No gap",   tone: ""     },
  watching: { label: "Watching", tone: ""     },
  cleared:  { label: "Cleared",  tone: "good" }
};

/* ------------------------------------------------------------------- fuel --- */
/* For anyone trying to put weight on, the binding constraint is not calories.
   It is how much can ferment inside one watch. So the useful number is not
   calories, it is calories per unit of fermentable load. */

const GOALS = {
  maintain: { label: "Hold steady", kcal: 33, pro: 1.4 },
  gain:     { label: "Put on size", kcal: 40, pro: 1.8 },
  hard:     { label: "Hard bulk",   kcal: 45, pro: 2.0 }
};
const targets = () => {
  const g = GOALS[state.body.goal] || GOALS.gain, kg = +state.body.kg || 70;
  return { kcal: Math.round(kg * g.kcal), pro: Math.round(kg * g.pro) };
};
const fuelOf = m => {
  const d = dishOf(m.dish);
  return { k: (d.k || 0) * m.portion, p: (d.p || 0) * m.portion };
};
const dayFuel = () => state.meals.reduce((a, m) => {
  const f = fuelOf(m); a.k += f.k; a.p += f.p; return a;
}, { k: 0, p: 0 });

/* calories bought per unit of fermentable load. Ghee and rice are unbeatable
   because the denominator is zero. */
function efficiency(d) {
  const u = baseUnits(d);
  return u < 0.05 ? Infinity : (d.k || 0) / u;
}
function fuelSuggestions(limit) {
  const have = new Set(state.meals.map(m => m.dish));
  return DISHES
    .filter(d => !have.has(d.id)
      && (d.k || 0) >= 60
      && baseUnits(d) < 1.2
      && !(d.region === "grain" && d.serve === "100 g"))  // raw flour is a reference, not a meal
    /* among the zero-load foods, value protein at roughly what a bulker does,
       so the list is not just a wall of rice */
    .sort((a, b) => (efficiency(b) - efficiency(a)) ||
                    ((b.k + b.p * 8) - (a.k + a.p * 8)))
    .slice(0, limit || 10);
}

/* ------------------------------------------------------------ label reader --- */
/* Every ingredient that matters on an Indian packet is recognisable by name.
   Half the value is telling people the frightening words are harmless. */
function readLabel(text) {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return null;
  const seen = new Set(), hits = [];
  LABEL_RULES.forEach(r => {
    const m = t.match(r.re);
    if (!m) return;
    const key = r.why;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ lvl: r.lvl, ch: r.ch, why: r.why, match: m[0].trim() });
  });
  const high = hits.filter(h => h.lvl === "high");
  const watch = hits.filter(h => h.lvl === "watch");
  const fine = hits.filter(h => h.lvl === "fine");
  const verdict = high.length ? { word: "Leave this one", tone: "bad" }
    : watch.length ? { word: "Probably fine, watch the amount", tone: "" }
    : hits.length ? { word: "Nothing here to worry about", tone: "good" }
    : { word: "Nothing recognised", tone: "" };
  return { verdict, high, watch, fine, any: hits.length };
}

/* ------------------------------------------------------------- assessment --- */
/* Runs before anything else in the app. Its first job is to find the people who
   should be seeing a doctor rather than reading a food list. */

function assess() {
  const p = state.profile;
  const flagged = RED_FLAGS.filter(f => p.flags[f.id]);
  if (flagged.length) return { kind: "flag", flagged };

  const answered = ROME.filter(r => p.rome[r.id] !== undefined).length;
  if (answered < ROME.length) return { kind: "incomplete", answered, total: ROME.length };

  const core = p.rome.pain && p.rome.months;
  const links = ["poo", "freq", "form"].filter(k => p.rome[k]).length;
  return { kind: core && links >= 2 ? "matches" : "unclear", links, subtype: subtypeOf() };
}

function subtypeOf() {
  const { hard, loose } = state.profile.bristol;
  if (hard === null || loose === null) return null;
  if (hard > 0 && loose > 0) return "IBS-M";
  if (hard > 0) return "IBS-C";
  if (loose > 0) return "IBS-D";
  return "IBS-U";
}

/* ------------------------------------------------------- plain food answer --- */
/* The same engine, said in words a person can use standing in a kitchen.
   No units, no channel names, no chart. */

function plainAnswer(d) {
  const u = baseUnits(d), dom = dominant(d);
  const verdict = d.free
    ? { word: "Use freely", tone: "good" }
    : u < 1   ? { word: "Usually fine",    tone: "good" } :
      u < 2.5 ? { word: "Mind the size",   tone: ""     } :
      u < 5   ? { word: "Plan this one",   tone: ""     } :
                { word: "Save it for late",tone: "bad"  };

  const because = d.free
    ? "At the amount a kitchen actually uses, there is nothing here to worry about."
    : dom
      ? "Most of the load here is " + PLAIN[dom] + "."
      : "There is very little in this that ferments.";

  let when = null;
  if (dom && u >= 1 && !d.free) {
    const lag = CHANNELS[dom].peak;
    const after = Math.max(6, Math.round(23 - lag));
    when = lag >= 4
      ? "It peaks about " + lag + " hours later, so if you eat it after " + fmt(after) +
        " that peak lands while you are asleep."
      : "It hits fast, about " + lag + " hours later. Leave " + lag +
        " clear hours before anything that matters.";
  }

  const fixes = [];
  if (d.vr)    fixes.push("Ask for it Jain, which means no onion and no garlic.");
  if (d.pulse) fixes.push("Soaked and rinsed, it drops by about a third.");
  if (u >= 2.5) fixes.push("Half a serving halves the load.");

  const sub = state.profile.bristol.loose > 0 && (dom === "sorbitol" || dom === "mannitol" || dom === "fructose")
    ? "These are the ones that tend to hit hardest if you run loose."
    : null;

  return { verdict, because, when, fixes, sub, units: u, note: d.note || null, est: !!d.est,
           harm: d.harm || null, swap: d.swap || null };
}

/* ------------------------------------------------------------------- draw --- */

function fitCanvas(cv) {
  const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  if (!r.width) return null;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: r.width, H: r.height };
}

const DEMO = [
  { t: 8.5, dish: "idli",  variant: "home", prep: "none", portion: 1 },
  { t: 13,  dish: "dal",   variant: "home", prep: "none", portion: 1 },
  { t: 21,  dish: "rajma", variant: "home", prep: "none", portion: 1 }
];

function drawHero() {
  const c = fitCanvas(document.getElementById("heroCv")); if (!c) return;
  const { ctx, W, H } = c, N = 300, X = t => ((t - T0) / (T1 - T0)) * W;
  ctx.clearRect(0, 0, W, H);
  let mx = 0; const vs = [];
  for (let i = 0; i <= N; i++) { const v = intensity(T0 + (T1 - T0) * i / N, DEMO).tot; vs.push(v); mx = Math.max(mx, v); }
  const Y = v => H - (v / (mx * 1.3)) * H;
  /* no watch bands here. This canvas is full-bleed but the rail above it is
     centred to the text column, and mismatched bands read as a rendering fault */
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let i = 0; i <= N; i++) ctx.lineTo(X(T0 + (T1 - T0) * i / N), Y(vs[i]));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = "#01472e14"; ctx.fill();
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const x = X(T0 + (T1 - T0) * i / N); i ? ctx.lineTo(x, Y(vs[i])) : ctx.moveTo(x, Y(vs[0])); }
  ctx.strokeStyle = "#01472e33"; ctx.lineWidth = 2; ctx.stroke();
}

/* Stack labels onto as many rows as it takes so none of them touch.
   Returns each label with the row it belongs on. */
function stackLabels(items, ctx, align, pad) {
  const ends = [];
  return items
    .slice().sort((a, b) => a.x - b.x)
    .map(it => {
      const w = ctx.measureText(it.text).width;
      const left = align === "center" ? it.x - w / 2 : it.x;
      let row = 0;
      while (ends[row] !== undefined && left < ends[row] + pad) row++;
      ends[row] = left + w;
      return Object.assign({ w, row }, it);
    });
}
const rowsIn = labels => labels.reduce((m, l) => Math.max(m, l.row + 1), 0);

function drawDay() {
  const c = fitCanvas(document.getElementById("dayCv")); if (!c) return;
  const { ctx, W, H } = c;
  const N = 380, LH = 10, X = t => ((t - T0) / (T1 - T0)) * W;

  ctx.clearRect(0, 0, W, H);

  /* Lay the labels out first, because how many rows they need decides how much room
     the plot gets. A crowded day pushes the chart up rather than overlapping. */
  ctx.font = "700 8px ui-sans-serif, system-ui";
  const mealLab = stackLabels(state.meals.map(m => {
    const n = dishOf(m.dish).name.toUpperCase();
    return { x: X(m.t), text: n.length > 18 ? n.slice(0, 17) + "…" : n };
  }), ctx, "center", 8);

  ctx.font = "700 9px ui-sans-serif, system-ui";
  const evLab = stackLabels(state.events.map(e => ({
    x: X(e.t) + 5, text: e.name.toUpperCase().slice(0, 20), t: e.t
  })), ctx, "left", 10);

  /* Meal labels sit below the axis, so they buy their space from the plot.
     Event chips overlay the top of the plot on their own backgrounds, so they
     don't need reserved room. */
  const PB = 24 + rowsIn(mealLab) * LH;
  const PT = 34;

  const vals = []; let mx = THRESHOLD * 1.5;
  for (let i = 0; i <= N; i++) {
    const v = intensity(T0 + (T1 - T0) * i / N, state.meals);
    vals.push(v); mx = Math.max(mx, v.tot);
  }
  mx *= 1.18;
  const Y = v => H - PB - (v / mx) * (H - PB - PT);

  /* the eight watches are the grid this is drawn on */
  PRAHARS.forEach((p, i) => {
    if (p.s >= T1) return;
    const x0 = X(p.s), x1 = X(Math.min(p.s + 3, T1));
    if (i % 2) { ctx.fillStyle = "#01472e08"; ctx.fillRect(x0, PT, x1 - x0, H - PB - PT); }
    if (p.s >= 24) { ctx.fillStyle = "#01472e12"; ctx.fillRect(x0, PT, x1 - x0, H - PB - PT); }
    ctx.strokeStyle = "#01472e26"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, PT); ctx.lineTo(x0, H - PB); ctx.stroke();
    /* English first. The Sanskrit name is the brand, but nobody can plan a day
       around a word they don't know. Skip it if the band is too narrow to hold it. */
    ctx.textAlign = "left";
    ctx.font = "700 9px ui-sans-serif, system-ui";
    const head = p.g.toUpperCase(), room = x1 - x0 - 10;
    if (ctx.measureText(head).width <= room) {
      ctx.fillStyle = "#01472e";
      ctx.fillText(head, x0 + 6, PT - 18);
      ctx.fillStyle = "#01472e73"; ctx.font = "400 9px ui-sans-serif, system-ui";
      const asleep = p.s >= 24 ? " · asleep" : "";
      const subs = [p.n + " · " + fmt(p.s) + asleep, p.n + " · " + fmt(p.s), fmt(p.s) + asleep, fmt(p.s)];
      const sub = subs.find(s => ctx.measureText(s).width <= room);
      if (sub) ctx.fillText(sub, x0 + 6, PT - 6);
    }
  });

  /* Event bands and their labels. Labels sit at the top of the plot on their own
     chips, so they stay readable however high the curve climbs. */
  state.events.forEach(e => {
    ctx.fillStyle = "#01472e14"; ctx.fillRect(X(e.t), PT, X(e.t + 1) - X(e.t), H - PB - PT);
    ctx.strokeStyle = "#01472e73"; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(X(e.t), PT); ctx.lineTo(X(e.t), H - PB); ctx.stroke();
    ctx.setLineDash([]);
  });

  const stack = new Array(N + 1).fill(0);
  KEYS.slice().reverse().forEach(k => {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = X(T0 + (T1 - T0) * i / N);
      i ? ctx.lineTo(x, Y(stack[i] + vals[i].by[k])) : ctx.moveTo(x, Y(stack[0] + vals[0].by[k]));
    }
    for (let i = N; i >= 0; i--) ctx.lineTo(X(T0 + (T1 - T0) * i / N), Y(stack[i]));
    ctx.closePath(); ctx.fillStyle = CHANNELS[k].col + "e6"; ctx.fill();
    for (let i = 0; i <= N; i++) stack[i] += vals[i].by[k];
  });

  /* threshold sits on top of the fill, with its label on a chip so it stays
     readable when the load has climbed over it */
  const ty = Y(THRESHOLD);
  ctx.setLineDash([5, 5]); ctx.strokeStyle = "#b5502f"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = "700 9px ui-sans-serif, system-ui";
  const label = "YOUR THRESHOLD", lw = ctx.measureText(label).width;
  ctx.fillStyle = "#e9edc9";
  ctx.beginPath(); ctx.roundRect(W - lw - 18, ty - 15, lw + 12, 13, 6); ctx.fill();
  ctx.fillStyle = "#b5502f"; ctx.textAlign = "right";
  ctx.fillText(label, W - 12, ty - 5);

  /* event chips, on their stacked rows */
  ctx.font = "700 9px ui-sans-serif, system-ui"; ctx.textAlign = "left";
  evLab.forEach(l => {
    const y = PT + 6 + l.row * 12;
    ctx.fillStyle = "#fefae0";
    ctx.beginPath(); ctx.roundRect(l.x - 4, y - 8, l.w + 8, 12, 6); ctx.fill();
    ctx.fillStyle = "#01472e";
    ctx.fillText(l.text, l.x, y + 1);
  });

  /* meal ticks, and their labels on stacked rows below the axis */
  state.meals.forEach(m => {
    const x = X(m.t);
    ctx.strokeStyle = "#01472e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, H - PB); ctx.lineTo(x, H - PB - 10); ctx.stroke();
  });
  ctx.font = "700 8px ui-sans-serif, system-ui"; ctx.textAlign = "center";
  ctx.fillStyle = "#01472e";
  mealLab.forEach(l => ctx.fillText(l.text, l.x, H - PB + 24 + l.row * LH));

  state.symptoms.forEach(s => {
    const x = X(s.t), y = Y(0) - (s.score / 10) * (H - PB - PT) * 0.9;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#b5502f"; ctx.fill();
    ctx.strokeStyle = "#fefae0"; ctx.lineWidth = 1.5; ctx.stroke();
  });
}

/* ------------------------------------------------------------------ views --- */

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

function viewFixes() {
  const box = $("fixes"); box.innerHTML = "";
  if (!state.meals.length) {
    box.appendChild(el("p", "note", "Nothing planned yet. Add a dish from the kitchen and your day builds up here."));
    return;
  }
  /* One block per offending dish, not per event. A single dish overshadowing
     two appointments is one problem with one fix, not two. */
  const blame = new Map();
  state.events.forEach(e => {
    const p = peakDuring(e, state.meals);
    if (p <= THRESHOLD) return;
    let wi = 0, wv = -1;
    state.meals.forEach((m, i) => {
      const drop = p - peakDuring(e, state.meals.filter((_, j) => j !== i));
      if (drop > wv) { wv = drop; wi = i; }
    });
    (blame.get(wi) || blame.set(wi, []).get(wi)).push(e);
  });

  if (!blame.size) {
    box.appendChild(el("p", "note ok", "Nothing peaks during anything that matters. This day works."));
    return;
  }

  blame.forEach((events, wi) => {
    const d = dishOf(state.meals[wi].dish), fixes = fixesFor(wi);
    const names = events.map(e => "<b>" + e.name + "</b>");
    const joined = names.length > 1
      ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1]
      : names[0];
    const row = el("div", "clash");
    row.appendChild(el("p", "clash-t",
      "<b>" + d.name + "</b> peaks during " + joined +
      (events.length > 1 ? "." : ", in the " + watchWord(events[0].t) + ".")));
    const list = el("div", "fixrow");
    if (!fixes.length) {
      list.appendChild(el("span", "note", "Nothing shifts this one. It may simply be too much for a single day."));
    } else fixes.forEach((f, i) => {
      const b = el("button", "fix" + (i ? " ghost" : ""), f.label + "<small>" + f.sub + "</small>");
      b.onclick = () => { Object.assign(state.meals[wi], f.patch); render(); };
      list.appendChild(b);
    });
    row.appendChild(list);
    box.appendChild(row);
  });
}

function viewMeals() {
  const box = $("meals"); box.innerHTML = "";
  if (!state.meals.length) { box.appendChild(el("p", "note", "Nothing planned.")); return; }
  state.meals.map((m, i) => ({ m, i })).sort((a, b) => a.m.t - b.m.t).forEach(({ m, i }) => {
    const d = dishOf(m.dish);
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b>" + d.name + "</b><span>" + watchOf(m.t).g + " · " + d.serve +
      (m.portion < 1 ? " · half" : "") + " · " + unitsOf(m).toFixed(1) + " units</span>"));

    const ctl = el("div", "line-ctl");
    const time = el("input"); time.type = "time"; time.value = fmt(m.t);
    time.setAttribute("aria-label", "Time for " + d.name);
    time.onchange = () => {
      const [h, mm] = time.value.split(":").map(Number);
      let t = h + mm / 60; if (t < T0) t += 24;
      m.t = t; render();
    };
    ctl.appendChild(time);

    [["vr", VARIANTS, "variant"], ["pulse", PREPS, "prep"]].forEach(([flag, MAP, key]) => {
      if (!d[flag]) return;
      const sel = el("select");
      sel.setAttribute("aria-label", key + " for " + d.name);
      Object.keys(MAP).forEach(k => {
        const o = el("option"); o.value = k; o.textContent = MAP[k].label;
        if (k === m[key]) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => { m[key] = sel.value; render(); };
      ctl.appendChild(sel);
    });

    const rm = el("button", "x", "&times;");
    rm.setAttribute("aria-label", "Remove " + d.name);
    rm.onclick = () => { state.meals.splice(i, 1); render(); };
    ctl.appendChild(rm);
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

function viewEvents() {
  const box = $("events"); box.innerHTML = "";
  if (!state.events.length) { box.appendChild(el("p", "note", "No fixed points today.")); return; }
  state.events.slice().sort((a, b) => a.t - b.t).forEach(e => {
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b>" + e.name + "</b><span>" + watchOf(e.t).g + " · " + fmt(e.t) + " → " + fmt(e.t + 1) + "</span>"));
    const rm = el("button", "x", "&times;");
    rm.setAttribute("aria-label", "Remove " + e.name);
    rm.onclick = () => { state.events = state.events.filter(x => x !== e); render(); };
    row.appendChild(rm);
    box.appendChild(row);
  });
}

function viewSymptoms() {
  const box = $("symptoms"); box.innerHTML = "";
  if (!state.symptoms.length) { box.appendChild(el("p", "note", "Nothing logged yet.")); return; }
  state.symptoms.slice().sort((a, b) => a.t - b.t).forEach(s => {
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b>" + s.score + " / 10</b><span>" + watchOf(s.t).g + " · " + fmt(s.t) + "</span>"));
    const rm = el("button", "x", "&times;");
    rm.setAttribute("aria-label", "Remove entry");
    rm.onclick = () => { state.symptoms = state.symptoms.filter(x => x !== s); render(); };
    row.appendChild(rm);
    box.appendChild(row);
  });
}

function viewTriage() {
  const t = triage(), box = $("triage"); box.innerHTML = "";
  const copy = {
    thin: ["Not enough to say yet",
      "You have logged " + t.n + ". Give it " + t.need + " more and this will tell you whether food is driving your symptoms, or whether something else is."],
    flat: ["Not enough variation",
      "Your entries are too similar to compare. Log on a heavier day and on a lighter one."],
    tracks: ["Your symptoms track your food",
      "Your discomfort rises and falls with the predicted load (r = " + (t.r || 0).toFixed(2) + "). Timing and portions are the right levers for you."],
    partial: ["Food explains part of it",
      "There is a real but loose link (r = " + (t.r || 0).toFixed(2) + "). Food matters, and so does something else. Sleep, stress and cycle phase are the usual companions."],
    loose: ["Food may not be your main driver",
      "Your discomfort does not follow your intake (r = " + (t.r || 0).toFixed(2) + "). For many people with IBS the gut makes a normal amount of gas and the nervous system amplifies it. Restricting further will not help with that. Worth raising with a clinician."]
  }[t.state];
  box.appendChild(el("h3", null, copy[0]));
  box.appendChild(el("p", "note", copy[1]));
}

function viewChannels() {
  const box = $("channels"); box.innerHTML = "";
  KEYS.forEach(k => {
    const c = CHANNELS[k];
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b><i class='dot' style='background:" + c.col + "'></i>" + c.label + "</b>" +
      "<span>" + c.why + " · peaks " + c.peak + " h later · " +
      (c.cut * state.tol[k]).toFixed(2) + " g per serve</span>"));
    const ctl = el("div", "line-ctl");
    const sl = el("input"); sl.type = "range"; sl.min = 0.5; sl.max = 5; sl.step = 0.5;
    sl.value = state.tol[k];
    sl.setAttribute("aria-label", c.label + " tolerance");
    sl.oninput = () => { state.tol[k] = +sl.value; state.tested[k] = +sl.value !== 1; render(); };
    ctl.appendChild(sl);
    ctl.appendChild(el("span", "tag" + (state.tested[k] ? " on" : ""), state.tested[k] ? "Tested" : "Untested"));
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

function viewLadder() {
  const box = $("ladder"); box.innerHTML = "";
  KEYS.forEach(k => {
    const c = CHANNELS[k];
    const row = el("div", "line");
    row.appendChild(el("div", "line-main", "<b>" + c.label + "</b><span>" + c.test + "</span>"));
    row.appendChild(el("span", "tag", c.rest ? "Rest day between" : "Consecutive OK"));
    box.appendChild(row);
  });
}

function addMeal(d, variant) {
  const slots = [8, 13, 20], used = state.meals.map(m => m.t);
  state.meals.push({
    id: state.uid++, dish: d.id, variant, prep: "none", portion: 1,
    t: slots.find(s => !used.includes(s)) ?? 13
  });
  render();
}

function viewKitchen() {
  const box = $("dishlist"); if (!box) return;
  box.innerHTML = "";
  const q = (state.search || "").trim().toLowerCase();
  const list = DISHES.filter(d => catMatch(d, state.filter) && nameMatch(d, q));

  $("drawerCount").textContent = list.length + " of " + DISHES.length + " dishes";
  if (!list.length) { box.appendChild(el("p", "note", "Nothing matches that.")); return; }

  list.forEach(d => {
    const u = baseUnits(d), dom = dominant(d);
    const tone = d.free ? 0 : u < 1 ? 0 : u < 2.5 ? 1 : u < 5 ? 2 : 3;
    const meta = d.free
      ? d.serve + " · use freely"
      : d.serve + " · " + u.toFixed(1) + " units" +
        (dom ? " · peaks " + CHANNELS[dom].peak + " h later" : "");
    const row = el("div", "dish" + (d.swap ? " tall" : ""));
    row.innerHTML =
      "<i class='load t" + tone + "' aria-hidden='true'></i>" +
      "<div class='dish-main'><b>" + d.name + (d.est ? " <em class='est'>est</em>" : "") +
      "</b><span>" + meta + "</span>" +
      (d.swap ? "<p class='swap'>" + d.swap + "</p>" : "") + "</div>";
    const ctl = el("div", "dish-ctl");
    const add = el("button", "pill-btn", "Add");
    add.setAttribute("aria-label", "Add " + d.name + " to the day");
    add.onclick = () => addMeal(d, "home");
    ctl.appendChild(add);
    if (d.vr) {
      const jain = el("button", "pill-btn ghost", "Jain");
      jain.setAttribute("aria-label", "Add " + d.name + " as Jain");
      jain.onclick = () => addMeal(d, "jain");
      ctl.appendChild(jain);
    }
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

const openKitchen = open => openPanel("drawer", open);

/* The day score appears in two places: while planning, and while journalling.
   One record, two doors onto it. */
function renderScores(boxId, hintId) {
  const rec = dayRec(), box = $(boxId);
  box.innerHTML = "";
  for (let i = 0; i <= 10; i++) {
    const b = el("button", "score" + (rec.score === i ? " on" : ""), String(i));
    b.setAttribute("aria-label", "Rate this day " + i + " out of ten");
    b.onclick = () => { rec.score = rec.score === i ? null : i; render(); };
    box.appendChild(b);
  }
  $(hintId).textContent = rec.score === null
    ? "Rate the day to include it in your findings"
    : rec.score <= 3 ? "A good day" : rec.score <= 6 ? "Middling" : "A bad day";
}

function viewDayBar() {
  $("dateLabel").textContent = prettyKey(state.date);
  $("dateSub").textContent = state.date;
  $("nextDay").disabled = state.date >= todayKey();
  renderScores("dayScore", "scoreHint");
}

/* ---------------------------------------------------------------- month --- */

const monthName = ym => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};
const bandOf = sc => sc === null || sc === undefined ? "none" : sc <= 3 ? "good" : sc <= 6 ? "mid" : "bad";

function viewCalendar() {
  const ym = state.month, [y, m] = ym.split("-").map(Number);
  $("monthLabel").textContent = monthName(ym);
  $("monthNext").disabled = ym >= todayKey().slice(0, 7);
  $("caldow").innerHTML = ["M", "T", "W", "T", "F", "S", "S"]
    .map(d => "<span>" + d + "</span>").join("");

  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;                 // weeks start Monday
  const total = new Date(y, m, 0).getDate();
  const grid = $("calgrid"); grid.innerHTML = "";
  for (let i = 0; i < lead; i++) grid.appendChild(el("div", "cell blank"));

  let rated = 0, sum = 0, logged = 0;
  for (let d = 1; d <= total; d++) {
    const key = ym + "-" + String(d).padStart(2, "0");
    const rec = state.days[key];
    const sc = rec && typeof rec.score === "number" ? rec.score : null;
    const meals = rec ? rec.meals.length : 0;
    if (sc !== null) { rated++; sum += sc; }
    if (meals) logged++;

    const cell = el("button", "cell s-" + bandOf(sc) +
      (key === state.date ? " on" : "") + (key === todayKey() ? " today" : "") +
      (key > todayKey() ? " future" : ""));
    cell.innerHTML = "<b>" + d + "</b>" +
      (sc !== null ? "<span class='sc'>" + sc + "</span>" : "") +
      (meals ? "<span class='pips'>" + "•".repeat(Math.min(meals, 4)) + "</span>" : "");
    cell.setAttribute("aria-label", key + (sc !== null ? ", rated " + sc : ", not rated"));
    cell.onclick = () => { state.date = key; render(); $("journal").scrollIntoView({ behavior: "smooth" }); };
    grid.appendChild(cell);
  }
  $("monthStats").textContent = rated
    ? logged + " days logged · " + rated + " rated · average " + (sum / rated).toFixed(1)
    : logged ? logged + " days logged, none rated yet" : "nothing recorded this month";
}

function viewEntry() {
  const rec = dayRec();
  $("entryDate").textContent = prettyKey(state.date) + " · " + state.date;
  $("entryNext").disabled = state.date >= todayKey();
  if ($("journalNote").value !== (rec.note || "")) $("journalNote").value = rec.note || "";
  renderScores("journalScore", "journalHint");

  const box = $("entryMeals"); box.innerHTML = "";
  if (!rec.meals.length) {
    box.appendChild(el("p", "note", "Nothing recorded for this day."));
  } else {
    rec.meals.slice().sort((a, b) => a.t - b.t).forEach(m => {
      const d = dishOf(m.dish); if (!d) return;
      const row = el("div", "line");
      row.appendChild(el("div", "line-main",
        "<b>" + d.name + "</b><span>" + fmt(m.t) + " · " + d.serve +
        (m.portion < 1 ? " · half" : "") + " · " + unitsOf(m).toFixed(1) + " units</span>"));
      const rm = el("button", "x", "&times;");
      rm.setAttribute("aria-label", "Remove " + d.name);
      rm.onclick = () => { rec.meals.splice(rec.meals.indexOf(m), 1); render(); };
      row.appendChild(rm);
      box.appendChild(row);
    });
  }

  /* which of this day's foods your own journal currently suspects */
  const suspects = findings().filter(f => f.verdict === "suspect")
    .filter(f => rec.meals.some(m => m.dish === f.id)).map(f => f.name);
  $("entryFlags").textContent = suspects.length
    ? "Your journal currently suspects " + suspects.join(" and ") + " from this day."
    : "";
}

function viewHistory() {
  const box = $("history"); box.innerHTML = "";
  const keys = Object.keys(state.days)
    .filter(k => state.days[k].meals.length || state.days[k].score !== null || state.days[k].note)
    .sort().reverse().slice(0, 14);
  if (!keys.length) { box.appendChild(el("p", "note", "No days recorded yet.")); return; }

  keys.forEach(k => {
    const d = state.days[k];
    const names = d.meals.map(m => (dishOf(m.dish) || {}).name).filter(Boolean);
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b>" + prettyKey(k) + (k === state.date ? " · open" : "") + "</b><span>" +
      (names.length ? names.slice(0, 3).join(", ") + (names.length > 3 ? " +" + (names.length - 3) : "")
                    : "nothing logged") + "</span>"));
    const ctl = el("div", "line-ctl");
    ctl.appendChild(el("span", "tag" + (d.score === null ? "" : d.score >= 7 ? " bad" : d.score <= 3 ? " good" : ""),
      d.score === null ? "unrated" : d.score + " / 10"));
    const go = el("button", "pill-btn ghost", "Open");
    go.onclick = () => { state.date = k; render(); $("day").scrollIntoView({ behavior: "smooth" }); };
    ctl.appendChild(go);
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

function viewFindings() {
  const box = $("findings"); box.innerHTML = "";
  const rows = findings(), rated = scoredDays().length;

  $("findingsLede").textContent = rated < MIN_DAYS * 2
    ? "Rate at least " + (MIN_DAYS * 2) + " days and this fills in. " + rated + " so far."
    : "Comparing the days you ate each food against the days you didn't, across " + rated + " rated days.";

  if (!rows.length) { box.appendChild(el("p", "note", "Nothing to compare yet.")); return; }

  rows.forEach(r => {
    const v = VERDICT[r.verdict];
    const detail =
      r.verdict === "watching" ? "eaten on " + r.days + " rated " + (r.days === 1 ? "day" : "days") +
                                 " · " + (MIN_DAYS - r.days) + " more before it can be judged" :
      r.verdict === "nogap"    ? "you have eaten it on nearly every rated day, so take a few days off it" :
      r.verdict === "tangled"  ? "always eaten with " + r.tangled + ", so they cannot be told apart yet" :
      (r.effect >= 0 ? "+" : "") + r.effect.toFixed(1) + " on your day score · " +
      r.withMean.toFixed(1) + " with vs " + r.withoutMean.toFixed(1) + " without";

    const row = el("div", "line");
    row.appendChild(el("div", "line-main", "<b>" + r.name + "</b><span>" + detail + "</span>"));
    row.appendChild(el("span", "tag " + v.tone, v.label));
    box.appendChild(row);
  });
}

/* ---------------------------------------------------------- right now UI --- */

/* Match on every word rather than one exact run of characters, so "sugar free
   gum" finds "Sugar-free chewing gum" and "masala chips" finds it either way. */
function nameMatch(d, q) {
  if (!q) return true;
  const hay = d.name.toLowerCase();
  return q.split(/[\s,\-\/]+/).filter(Boolean).every(w => hay.includes(w));
}

function viewQuickCheck() {
  const q = ($("quickSearch").value || "").trim().toLowerCase();
  const out = $("quickAnswer");
  out.innerHTML = "";
  if (!q) { out.hidden = true; return; }

  const hits = DISHES.filter(d => nameMatch(d, q));
  out.hidden = false;
  if (!hits.length) {
    out.appendChild(el("p", "note", "Nothing by that name yet. Try a shorter word like “dal”, “dosa” or “paneer”."));
    return;
  }
  if (hits.length > 1 && !hits.some(d => d.name.toLowerCase() === q)) {
    const row = el("div", "quick-alts");
    hits.slice(0, 6).forEach(d => {
      const b = el("button", "pill-btn ghost", d.name);
      b.onclick = () => { $("quickSearch").value = d.name; viewQuickCheck(); };
      row.appendChild(b);
    });
    out.appendChild(el("p", "note", "Which one?"));
    out.appendChild(row);
    return;
  }

  const d = hits.find(x => x.name.toLowerCase() === q) || hits[0];
  const a = plainAnswer(d);
  const card = el("div", "answer");
  card.innerHTML =
    "<span class='eyebrow dim'>" + d.name + " · " + d.serve + "</span>" +
    "<h3 class='" + a.verdict.tone + "'>" + a.verdict.word + "</h3>" +
    "<p>" + a.because + "</p>" +
    (a.when ? "<p class='when'>" + a.when + "</p>" : "") +
    (a.harm ? "<p class='harm'><b>What does the damage:</b> " + a.harm + "</p>" : "") +
    (a.swap ? "<p class='swap'><b>Better:</b> " + a.swap + "</p>" : "") +
    (a.note ? "<p class='note'>" + a.note + "</p>" : "") +
    (a.est ? "<p class='note'>This one has never been formally tested. The number is an estimate from similar foods, so treat it as a starting point.</p>" : "") +
    (a.sub ? "<p class='note'>" + a.sub + "</p>" : "") +
    (a.fixes.length ? "<ul>" + a.fixes.map(f => "<li>" + f + "</li>").join("") + "</ul>" : "");
  const add = el("button", "pill-btn", "Add to today");
  add.onclick = () => { addMeal(d, "home"); $("day").scrollIntoView({ behavior: "smooth" }); };
  card.appendChild(add);
  out.appendChild(card);
}

function viewNowLine() {
  const line = $("nowLine");
  const meals = state.meals;
  if (!meals.length || state.date !== todayKey()) {
    line.textContent = "Nothing logged for today yet.";
    return;
  }
  const now = new Date();
  let t = now.getHours() + now.getMinutes() / 60;
  if (t < T0) t += 24;
  const load = intensity(t, meals).tot;

  let peakT = t, peakV = load;
  for (let x = t; x <= T1; x += 0.1) {
    const v = intensity(x, meals).tot;
    if (v > peakV) { peakV = v; peakT = x; }
  }
  let easeT = null;
  for (let x = Math.max(t, peakT); x <= T1; x += 0.1)
    if (intensity(x, meals).tot < THRESHOLD * 0.6) { easeT = x; break; }

  line.textContent =
    load < THRESHOLD * 0.6
      ? "You are running light right now" + (peakV > THRESHOLD ? ", though the busiest stretch is still ahead, around " + fmt(peakT) + "." : ".")
      : peakT > t + 0.2
        ? "You are climbing. The peak is around " + fmt(peakT) + (easeT ? ", easing off by about " + fmt(easeT) + "." : ".")
        : "You are past the peak" + (easeT ? ", so this should settle by about " + fmt(easeT) + "." : ".");
}

function viewAssess() {
  const box = $("assessBody"); box.innerHTML = "";
  const p = state.profile;

  const group = (title, sub) => {
    const g = el("div", "qgroup");
    g.appendChild(el("span", "eyebrow", title));
    if (sub) g.appendChild(el("p", "note", sub));
    box.appendChild(g); return g;
  };

  const g1 = group("First, the things that aren't IBS",
    "Tick anything that is true. None of these mean something is wrong. They mean a doctor should be the one looking, not an app.");
  RED_FLAGS.forEach(f => {
    const row = el("label", "check" + (p.flags[f.id] ? " on" : ""));
    const cb = el("input"); cb.type = "checkbox"; cb.checked = !!p.flags[f.id];
    cb.onchange = () => { p.flags[f.id] = cb.checked; render(); };
    row.appendChild(cb); row.appendChild(el("span", null, f.q));
    g1.appendChild(row);
  });

  const flagged = RED_FLAGS.filter(f => p.flags[f.id]);
  if (!flagged.length) {
    const g2 = group("Does the pattern fit?", "Answer honestly. There is no score to win here.");
    ROME.forEach(r => {
      const row = el("div", "qrow");
      row.appendChild(el("p", "q", r.q));
      const yn = el("div", "yn");
      [["Yes", true], ["No", false]].forEach(([lab, val]) => {
        const b = el("button", "pill-btn" + (p.rome[r.id] === val ? "" : " ghost"), lab);
        b.onclick = () => { p.rome[r.id] = val; render(); };
        yn.appendChild(b);
      });
      row.appendChild(yn); g2.appendChild(row);
    });

    const g3 = group("On the days your bowels are off…", null);
    [["hard", "How often are stools hard or lumpy?"], ["loose", "How often are they loose or watery?"]].forEach(([key, q]) => {
      const row = el("div", "qrow");
      row.appendChild(el("p", "q", q));
      const yn = el("div", "yn");
      [["Rarely", 0], ["Sometimes", 1], ["Often", 2]].forEach(([lab, val]) => {
        const b = el("button", "pill-btn" + (p.bristol[key] === val ? "" : " ghost"), lab);
        b.onclick = () => { p.bristol[key] = val; render(); };
        yn.appendChild(b);
      });
      row.appendChild(yn); g3.appendChild(row);
    });
  }

  /* the verdict */
  const a = assess(), res = el("div", "verdictbox");
  if (a.kind === "flag") {
    res.className = "verdictbox warnbox";
    res.innerHTML = "<h3>Please see a doctor before going further</h3>" +
      "<p>You ticked: <b>" + a.flagged.map(f => f.q.toLowerCase()).join("; ") + "</b>.</p>" +
      "<p>These can be caused by conditions that need ruling out first, such as inflammatory bowel disease, coeliac disease, and in some cases bowel cancer. Usually it turns out to be nothing. But a food app is the wrong tool until someone has checked.</p>" +
      "<p class='note'>You can still use the rest of Prahar. Just do not let it stand in for that appointment.</p>";
  } else if (a.kind === "incomplete") {
    res.innerHTML = "<h3>Keep going</h3><p class='note'>" + a.answered + " of " + a.total +
      " answered. The reading appears once they are all done.</p>";
  } else {
    const st = a.subtype ? SUBTYPES[a.subtype] : null;
    res.innerHTML =
      "<h3>" + (a.kind === "matches" ? "This fits the usual IBS pattern" : "This doesn't fit the usual pattern") + "</h3>" +
      "<p>" + (a.kind === "matches"
        ? "Recurring pain tied to your bowel habit, going back six months or more. That is the shape doctors look for. It is still only a pattern though, not a diagnosis, and only a doctor can give you one."
        : "That does not rule anything in or out. Plenty of real gut trouble sits outside this pattern. Take it to a doctor rather than managing it yourself.") + "</p>" +
      (st ? "<p><b>" + a.subtype + " · " + st.label + "</b><br>" + st.note + "</p>" : "") +
      "<p class='note'><b>Before you cut gluten:</b> get tested for coeliac disease first. The test only works while you are still eating gluten, and going gluten-free beforehand can hide coeliac disease for months.</p>";
  }
  box.appendChild(res);
}

/* ------------------------------------------------------------ the flare kit --- */

let pacer = null;
function viewRelief() {
  const box = $("reliefBody"); box.innerHTML = "";
  RELIEF.forEach((s, i) => {
    const step = el("div", "step");
    step.innerHTML =
      "<div class='step-n'>" + (i + 1) + "</div>" +
      "<div class='step-b'><b>" + s.title + (s.mins ? " · " + s.mins + " min" : "") + "</b>" +
      "<p>" + s.body + "</p><p class='note'>" + s.why + "</p></div>";
    if (s.id === "breathe") {
      const p = el("div", "pacer");
      p.innerHTML = "<div class='ball' id='pacerBall'></div><div class='pacer-t'><b id='pacerWord'>Ready</b><span id='pacerCount'></span></div>";
      const go = el("button", "pill-btn", "Start breathing");
      go.onclick = () => togglePacer(go);
      step.querySelector(".step-b").append(p, go);
    }
    box.appendChild(step);
  });

  const avoid = el("div", "step");
  avoid.innerHTML = "<div class='step-n'>·</div><div class='step-b'><b>And for the next few hours, skip</b><ul>" +
    RELIEF_AVOID.map(a => "<li>" + a + "</li>").join("") + "</ul></div>";
  box.appendChild(avoid);

  const warn = el("div", "warnbox");
  warn.innerHTML = "<h3>When it is not a flare</h3><p>Severe or sudden pain, a hard rigid belly, persistent vomiting, blood, or fever all mean you should stop and get medical help. This kit is for familiar IBS discomfort, not for pain that feels new or different.</p>";
  box.appendChild(warn);
}

function togglePacer(btn) {
  const ball = $("pacerBall"), word = $("pacerWord"), count = $("pacerCount");
  if (pacer) {
    clearInterval(pacer); pacer = null;
    ball.className = "ball"; word.textContent = "Ready"; count.textContent = "";
    btn.textContent = "Start breathing";
    return;
  }
  let tick = 0, cycles = 0;
  btn.textContent = "Stop";
  const step = () => {
    const inBreath = tick % 10 < 4;          // 4 s in, 6 s out
    ball.className = "ball " + (inBreath ? "in" : "out");
    word.textContent = inBreath ? "Breathe in" : "Breathe out, slowly";
    if (tick % 10 === 0 && tick) cycles++;
    count.textContent = cycles ? cycles + " of 30 breaths" : "30 breaths is about five minutes";
    tick++;
    if (cycles >= 30) { togglePacer(btn); word.textContent = "Done"; }
  };
  step(); pacer = setInterval(step, 1000);
}

const PANELS = ["drawer", "assessPanel", "reliefPanel", "labelPanel", "proteinPanel"];
function openPanel(id, open) {
  $(id).hidden = !open;
  const any = PANELS.some(x => !$(x).hidden);
  $("scrim").hidden = !any;
  document.body.classList.toggle("locked", any);
  if (open && id === "drawer") $("dishSearch").focus();
  if (!open && pacer) { clearInterval(pacer); pacer = null; }
}
function closeAllPanels() { PANELS.forEach(id => openPanel(id, false)); }

function viewFuel() {
  const t = targets(), f = dayFuel();
  [...$("goalPick").children].forEach(b => b.classList.toggle("on", b.dataset.g === state.body.goal));
  $("kgIn").value = state.body.kg;
  $("fuelTargets").textContent = t.kcal + " kcal and " + t.pro + " g protein a day";

  const bar = (id, got, want) => {
    const pct = Math.min(100, Math.round(got / want * 100));
    $(id).innerHTML =
      "<div class='fbar'><i style='width:" + pct + "%'></i></div>" +
      "<span class='micro'>" + Math.round(got) + " of " + want + " · " + pct + "%</span>";
  };
  bar("kcalBar", f.k, t.kcal);
  bar("proBar", f.p, t.pro);

  const gap = Math.max(0, t.kcal - f.k), pgap = Math.max(0, t.pro - f.p);
  $("fuelGap").textContent = f.k === 0
    ? "Nothing logged today. Add food and this fills in."
    : gap === 0 && pgap === 0
      ? "You are there for today."
      : "Still short " + Math.round(gap) + " kcal and " + Math.round(pgap) + " g protein.";

  const box = $("fuelPicks"); box.innerHTML = "";
  fuelSuggestions(10).forEach(d => {
    const u = baseUnits(d), eff = efficiency(d);
    const row = el("div", "line");
    row.appendChild(el("div", "line-main",
      "<b>" + d.name + "</b><span>" + d.serve + " · " + d.k + " kcal · " + d.p + " g protein · " +
      (u < 0.05 ? "no load at all" : u.toFixed(1) + " units") + "</span>"));
    const ctl = el("div", "line-ctl");
    ctl.appendChild(el("span", "tag" + (eff === Infinity ? " good" : ""),
      eff === Infinity ? "free calories" : Math.round(eff) + " kcal / unit"));
    const add = el("button", "pill-btn", "Add");
    add.setAttribute("aria-label", "Add " + d.name);
    add.onclick = () => addMeal(d, "home");
    ctl.appendChild(add);
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

function viewProteins() {
  const box = $("proteinList"); if (!box) return;
  box.innerHTML = "";
  const g = state.pgroup || "all";
  [...$("pgroups").children].forEach(b => b.classList.toggle("on", b.dataset.g === g));

  const vegOnly = !!state.vegOnly;
  $("vegOnly").classList.toggle("on", vegOnly);
  const list = DISHES.filter(d => d.pg && (g === "all" || d.pg === g) && (!vegOnly || d.veg))
    .sort((a, b) => (b.p / Math.max(b.k, 1)) - (a.p / Math.max(a.k, 1)));

  $("proteinCount").textContent = list.length + " sources, densest protein first";

  list.forEach(d => {
    const u = baseUnits(d);
    const per100 = d.k ? Math.round(d.p / d.k * 100) : 0;
    const row = el("div", "dish prot");
    row.innerHTML =
      "<i class='load t" + (u < .05 ? 0 : u < 1 ? 1 : u < 2.5 ? 2 : 3) + "' aria-hidden='true'></i>" +
      "<div class='dish-main'><b>" + d.name +
      (d.veg ? " <em class='vegdot' title='Vegetarian'>veg</em>" : "") +
      "</b><span>" + d.serve + " · " + d.k + " kcal · " +
      "<em>" + d.p + " g protein</em>" + (u < .05 ? " · no load" : " · " + u.toFixed(1) + " units") +
      "</span>" + (d.note ? "<p class='note'>" + d.note + "</p>" : "") + "</div>";
    const ctl = el("div", "dish-ctl");
    ctl.appendChild(el("span", "tag" + (u < .05 ? " good" : ""), per100 + " g / 100 kcal"));
    const add = el("button", "pill-btn", "Add");
    add.setAttribute("aria-label", "Add " + d.name);
    add.onclick = () => addMeal(d, "home");
    ctl.appendChild(add);
    row.appendChild(ctl);
    box.appendChild(row);
  });
}

function viewLabel() {
  const out = $("labelOut"), r = readLabel($("labelIn").value);
  out.innerHTML = "";
  if (!r) { out.appendChild(el("p", "note", "Paste or type the ingredients list from the packet.")); return; }

  out.appendChild(el("h3", r.verdict.tone, r.verdict.word));
  if (!r.any) {
    out.appendChild(el("p", "note", "Nothing in that text matched anything known. Either it is genuinely plain, or the words are spelled differently. Try pasting more of the list."));
    return;
  }
  const group = (title, arr, cls) => {
    if (!arr.length) return;
    const g = el("div", "lgroup " + cls);
    g.appendChild(el("span", "eyebrow", title));
    arr.forEach(h => {
      const row = el("div", "lrow");
      row.innerHTML = "<b>" + h.match + "</b>" +
        (h.ch ? "<span class='tag'>" + CHANNELS[h.ch].label + "</span>" : "") +
        "<p class='note'>" + h.why + "</p>";
      g.appendChild(row);
    });
    out.appendChild(g);
  };
  group("Leave it", r.high, "bad");
  group("Depends on how much", r.watch, "");
  group("These are fine, despite the names", r.fine, "good");
}

function viewStatus() {
  const over = state.events.some(e => peakDuring(e, state.meals) > THRESHOLD);
  const btn = $("statusBtn");
  btn.classList.toggle("over", over);
  $("statusTxt").textContent = !state.meals.length ? "Today" : over ? "Clashes" : "Clear";
  $("badge").textContent = state.meals.length;
}

function render() {
  viewDayBar(); viewCalendar(); viewEntry(); viewMeals(); viewEvents(); viewSymptoms(); viewFixes();
  viewHistory(); viewFindings(); viewNowLine(); viewAssess(); viewFuel();
  viewTriage(); viewChannels(); viewKitchen(); viewStatus();
  drawDay(); save();
}

/* ------------------------------------------------------------------ boot --- */

function addEvent() {
  const name = $("evName").value.trim() || "Event";
  const [h, m] = $("evStart").value.split(":").map(Number);
  let t = h + m / 60; if (t < T0) t += 24;
  state.events.push({ id: state.uid++, name, t });
  $("evName").value = "";
  render();
}
function addSymptom() {
  const [h, m] = $("syTime").value.split(":").map(Number);
  let t = h + m / 60; if (t < T0) t += 24;
  state.symptoms.push({ id: state.uid++, t, score: +$("syScore").value });
  render();
}
function clearDay() { state.meals = []; render(); }
function resetAll() { state = bindDay(blank()); render(); }

document.addEventListener("DOMContentLoaded", () => {
  "PRAHAR".split("").forEach((ch, i) => {
    const s = el("span", null, ch);
    s.style.animationDelay = (i * 0.05) + "s";
    $("heroType").appendChild(s);
  });

  /* the day as a strip that darkens towards night. English name leads, the
     Sanskrit sits underneath */
  $("watchrail").innerHTML = PRAHARS.map((p, i) =>
    "<div class='seg'><i style='opacity:" + (0.14 + i * 0.11).toFixed(2) + "'></i>" +
    "<b>" + p.g + "</b><span>" + p.n + " · " + fmt(p.s) + "</span></div>").join("");
  $("legend").innerHTML = KEYS.map(k =>
    "<span class='key'><i class='dot' style='background:" + CHANNELS[k].col + "'></i>" + CHANNELS[k].label + "</span>").join("");
  $("flags").innerHTML = RED_FLAGS.map(f => "<li>" + f.q + "</li>").join("");
  $("fchannels").innerHTML = KEYS.map(k =>
    "<li>" + CHANNELS[k].label + "<small>peaks " + CHANNELS[k].peak + " h later</small></li>").join("");
  $("fwatches").innerHTML = PRAHARS.map(p =>
    "<li>" + p.n + "<small>" + fmt(p.s) + " · " + p.g + "</small></li>").join("");

  $("goalPick").innerHTML = Object.entries(GOALS).map(([k, g]) =>
    "<button data-g='" + k + "'" + (k === state.body.goal ? " class='on'" : "") + ">" + g.label + "</button>").join("");
  $("filters").innerHTML = CATS.map(([k, label]) =>
    "<button data-f='" + k + "'" + (k === state.filter ? " class='on'" : "") + ">" + label + "</button>").join("");
  $("filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    state.filter = b.dataset.f;
    [...$("filters").children].forEach(x => x.classList.toggle("on", x === b));
    viewKitchen(); save();
  };

  $("addEvent").onclick = addEvent;
  $("addSymptom").onclick = addSymptom;
  $("clearDay").onclick = clearDay;
  $("resetAll").onclick = resetAll;
  $("syScore").oninput = e => $("syVal").textContent = e.target.value;

  $("openKitchen").onclick = () => openKitchen(true);
  $("closeKitchen").onclick = () => openKitchen(false);
  $("scrim").onclick = closeAllPanels;
  $("dishSearch").oninput = e => { state.search = e.target.value; viewKitchen(); };
  addEventListener("keydown", e => { if (e.key === "Escape") closeAllPanels(); });

  $("openAssess").onclick = () => openPanel("assessPanel", true);
  $("closeAssess").onclick = () => openPanel("assessPanel", false);
  $("openRelief").onclick = () => { viewRelief(); openPanel("reliefPanel", true); };
  $("openLabel").onclick = () => { viewLabel(); openPanel("labelPanel", true); };
  $("openProtein").onclick = () => { viewProteins(); openPanel("proteinPanel", true); };
  $("closeProtein").onclick = () => openPanel("proteinPanel", false);
  $("pgroups").innerHTML = PGROUPS.map(([k, label]) =>
    "<button data-g='" + k + "'" + (k === "all" ? " class='on'" : "") + ">" + label + "</button>").join("");
  $("pgroups").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    state.pgroup = b.dataset.g; viewProteins();
  };
  $("vegOnly").onclick = () => { state.vegOnly = !state.vegOnly; viewProteins(); };
  $("closeLabel").onclick = () => openPanel("labelPanel", false);
  $("labelIn").oninput = viewLabel;
  $("kgIn").onchange = e => { state.body.kg = Math.max(25, Math.min(200, +e.target.value || 70)); render(); };
  $("goalPick").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    state.body.goal = b.dataset.g; render();
  };
  $("closeRelief").onclick = () => openPanel("reliefPanel", false);
  $("quickSearch").oninput = viewQuickCheck;
  setInterval(viewNowLine, 60000);

  $("prevDay").onclick = () => { state.date = shiftKey(state.date, -1); render(); };
  $("nextDay").onclick = () => { state.date = shiftKey(state.date, 1); render(); };
  $("todayBtn").onclick = () => { state.date = todayKey(); render(); };
  $("journalNote").oninput = e => { dayRec().note = e.target.value; save(); };
  $("entryAddFood").onclick = () => openKitchen(true);
  $("monthPrev").onclick = () => { state.month = shiftMonth(state.month, -1); viewCalendar(); save(); };
  $("monthNext").onclick = () => { state.month = shiftMonth(state.month, 1); viewCalendar(); save(); };
  $("entryPrev").onclick = () => { state.date = shiftKey(state.date, -1); render(); };
  $("entryNext").onclick = () => { state.date = shiftKey(state.date, 1); render(); };
  ["prevDay", "nextDay", "todayBtn", "entryPrev", "entryNext"].forEach(id => {
    const prev = $(id).onclick;
    $(id).onclick = () => { prev(); state.month = state.date.slice(0, 7); viewCalendar(); save(); };
  });

  /* Opt into the reveal animation only now that the script is definitely alive.
     Anything still unrevealed after four seconds gets shown regardless, so a
     failed observer can never hide the page. */
  const reveals = document.querySelectorAll(".reveal");
  document.documentElement.classList.add("anim");
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.1 });
  reveals.forEach(n => io.observe(n));
  setTimeout(() => reveals.forEach(n => n.classList.add("in")), 4000);

  addEventListener("scroll", () => {
    const y = scrollY;
    document.querySelectorAll(".drift").forEach((b, i) => b.style.transform = "translateY(" + (y * 0.05 * (i + 1)) + "px)");
  }, { passive: true });
  addEventListener("resize", () => { drawDay(); drawHero(); });

  viewLadder(); render(); drawHero();
});
