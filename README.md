# Prahar

A FODMAP planning tool for Indian food, built on one idea:

> Your gut is limited by rate, not by total. Symptoms don't come from eating too
> much in a day. They come from too much fermenting inside one window. So the
> answer is never *no*. It's *later*.

A *prahar* is one of the eight three-hour watches of the traditional Indian day.
It's the grid the whole app is drawn on.

Most of this category is built for a six-week elimination diet. But people have
IBS for decades, and the moments that matter most (*is this even IBS?*, *what do
I do right now, it hurts*) have no product at all. Prahar opens on those.

## What it covers

### Right Now

Works on first open, with no setup and nothing logged.

*What are you about to eat?* gives you a plain-language answer. No units, no
channel names, no chart. "Save it for late. The load here is mostly the beans and
lentils group. Eat it after 18:00 and that peak lands while you're asleep."

*It hurts right now* gives you five things that help, fastest first, with a
breathing pacer that runs 4 in / 6 out.

*Is this even IBS?* asks about red flags first, then the pattern, then your
subtype.

### The Kitchen

371 entries behind the *Add food* drawer, searchable by word and grouped: 99
dishes and street food, 66 protein sources, 38 spices and masalas, 36 packaged
products, 35 vegetables, 26 fruits, 20 grains and flours, 12 dals, 12 dairy, 12
nuts and seeds, 8 sweeteners, 7 drinks.

88 of them carry a `harm` and a `swap`: what actually causes the trouble, and the
nearest thing that doesn't. The point is to blame the ingredient rather than the
dish. Aloo tikki isn't the problem. The date chutney, the garlic in the green
chutney and the raw onion are. Masala chips are a problem and plain salted chips
from the same brand aren't. Malt-based health drink powder is barley malt
extract, which is a fructan, whatever the tin claims about digestion.

Thirty-six are marked **use freely**, which covers most of the masala dabba.
People give up their spices on this diet and almost none of them need to. The two
that genuinely bite are onion powder and garlic powder, and those hide in packet
masalas, namkeen and instant noodles.

Twenty entries are marked **est** because nobody has formally tested them.
Drumstick, ragi, bajra, parwal, jackfruit and a few others have no published
figures, so those numbers come from related foods and the app says so on screen.

### Read a packet

Paste an ingredients list and it tells you what's hiding in it. This needs no lab
data at all, because everything that matters on an Indian label is recognisable
by name: inulin, chicory root fibre, FOS, onion powder, garlic powder, milk
solids, whey concentrate, HFCS, date paste, and the sweeteners ending in `-ol`
(including their INS numbers, so INS 420 is caught).

Half of its job is reassurance. Maltodextrin, dextrose, erythritol, xanthan and
guar gum, soy lecithin and sucralose all sound alarming and are all fine, so the
reader says so under a heading of its own.

### Fuel

A bulking planner for people who lift and can't eat enough.

If you train, the hard part isn't the calories. A large meal sets the gut off
whatever is in it, and the cheap Indian protein is dal and rajma, which are the
worst of the GOS. So the number this section ranks by is calories per unit of
fermentable load.

Fat and white rice win outright, because their denominator is zero. Nine calories
a gram with nothing fermentable is the cheapest way to add size without adding
volume. Whey isolate beats concentrate for the same reason: isolate is filtered
until almost no lactose is left, while concentrate keeps 4 to 8 percent of it.
Most mass gainers are spiked with inulin or chicory root for the fibre claim,
which is close to pure fructan.

Set your bodyweight and goal, and it gives you a target, two bars, and a ranked
list of what to add.

*All protein sources* opens a panel of 66 options, sorted by grams of protein per
100 kcal and grouped into meat/fish/eggs, dairy, plant and powders, with a
vegetarian-only toggle that leaves 45. Vegetarian here means the Indian sense of
the word, so eggs are excluded. Prawns come out top, ahead of every powder on the
shelf.

The non-obvious ones are worth knowing:

* Pea protein isolate is low FODMAP even though peas are high, because the
  processing strips the carbohydrate out. Same story for soy protein isolate
  against soya chunks.
* Seitan is low FODMAP, since gluten is a protein rather than a fermentable sugar
  and the starch washes out. Obviously not if you have coeliac disease.
* Tempeh is fermented, so it's far gentler than the soybeans it came from.
* Skimmed milk powder looks like a cheap protein hack and is close to pure
  lactose.
* A typical protein bar is often the worst thing in the bag, carrying chicory
  root fibre, date paste and maltitol at once.

### The rest

**The Day** is the timing engine, drawn on the eight watches. **Journal** keeps
per-food verdicts across days. **Your Numbers** holds tolerance per channel and
the challenge ladder.

## Run it

No build, no dependencies, no network.

```
open index.html
```

Or serve it, if you'd rather not use `file://`:

```
python3 -m http.server 8000
```

Everything is stored in `localStorage` on the device. Nothing leaves it.

## Why this is different

Every other tool in this category is a lookup table: food in, traffic light out.
Three things here aren't.

**1. It answers in hours, not grams.** Each channel has its own lag. Polyols and
excess fructose act osmotically and hit in 1 to 3 h. Lactose ferments early, 2 to
4 h. Fructans and GOS are pure colonic fermentation and arrive late, 4 to 8 h. So
the same plate eaten at a different hour is a genuinely different day. Eat rajma
in Pradosh and its peak lands in Nishith, while you're asleep.

**2. One dish is not one number.** Indian food can't be tabulated, because a dish
is a composition. Restaurant gravies carry cashew paste and cream; the Jain
version drops onion and garlic entirely. Every curry carries all three variants
and you pick the one you're actually eating. Preparation is modelled too, since
GOS is water-soluble and soaking and rinsing pulses genuinely moves the number.

**3. It never says no.** When something clashes, *Make It Fit* searches the
modification space (move it, soak it, order it Jain, halve it, swap it), keeps
only what actually helps, and ranks by how little it costs you. Moving a meal
costs nothing. Swapping it costs most.

## The model

Load is measured in serve-units: grams divided by the published per-serving
cutoff. One unit is one "low" serving, so 0.30 g of fructan is exactly 1.00 unit.

Each intake releases along a gamma-shaped curve normalised to peak at 1:

```
k(t) = (t^(a-1) · e^(-t/θ)) / (peak^(a-1) · e^(-(a-1)))     θ = peak/(a-1)
```

Total load at any instant is the sum over every meal and every channel. A watch
is "over" when that sum crosses your threshold during something that matters.

| Channel | Cutoff / serve | Peaks | Rest day when testing |
|---|---|---|---|
| Fructan | 0.30 g | 6.0 h | yes |
| GOS | 0.30 g | 5.5 h | yes |
| Lactose | 1.00 g | 3.5 h | no |
| Excess fructose | 0.15 g | 2.0 h | no |
| Sorbitol | 0.20 g | 2.0 h | no |
| Mannitol | 0.20 g | 2.5 h | no |

## The journal, or "is it the rajma?"

Planning one day is only half of it. The journal keeps every day, and then
answers the question people actually have.

It opens on a month calendar. Every day is a cell tinted by how you rated it:
green for 0 to 3, amber for 4 to 6, rust for 7 to 10, blank for unrated. Dots
underneath show how many things you ate. The header gives you the month at a
glance, as in *11 days logged, 11 rated, average 4.8*.

Click any day to open it. You then get, for that day: what you ate with the
option to remove any of it, an *Add food* button that opens the kitchen and files
everything against that date, a free-text note, and the 0 to 10 rating.

If any food you ate that day is currently flagged Suspect by your own findings,
the entry says so outright: *"Your journal currently suspects Rajma from this
day."*

The note is for the confounders that move symptoms as much as food does, meaning
stress, sleep, travel and cycle phase, and which nobody remembers a month later.

Each day gets a score out of ten and that note. Once days accumulate, each food is
judged by comparing your average day-score on the days you ate it against the days
you didn't. Simple, explainable, and it matches how people really keep a journal:
one score for the day, not a lab protocol.

| Verdict | Meaning |
|---|---|
| **Suspect** | +1.5 or worse on your day score |
| **Cleared** | +0.5 or better, so it isn't this one |
| **Unclear** | a real but small difference |
| **Watching** | fewer than three days with it, so no verdict yet |
| **No gap** | you eat it nearly every day and there's nothing to compare against |
| **Tangled** | it only ever appears alongside another food, so they can't be separated |

**Tangled** is the honest one no other app does. If dal and roti always turn up
together, no volume of data can tell them apart, so both are flagged, and eating
one without the other is what breaks the tie.

Nothing gets a verdict without at least three days on each side.

## Is food even your problem?

For a large share of people with IBS the gut produces an ordinary amount of gas
and the nervous system amplifies the signal. Diet does very little for that, and
restricting further does harm.

So *Your Numbers* correlates your logged discomfort against predicted load. Below
eight entries it refuses to answer. Above that it reports whether your symptoms
track your food, partly track it, or don't, and says so plainly when they don't.

## Safety

This is the part that matters most, so it runs first and it interrupts.

* Eight red flags are asked before anything else: blood or black stools,
  unintended weight loss, onset after 50, night-waking symptoms, anaemia, family
  history of IBD/coeliac/bowel cancer, fever, a palpable mass. Tick any one and
  the pattern check stops and tells you to see a doctor. Bowel cancer,
  inflammatory bowel disease and coeliac all hide behind symptoms that look
  exactly like IBS.
* Coeliac must be excluded before cutting gluten. The test only works while
  you're still eating it, and going gluten-free first can make coeliac
  undetectable for months. This warning appears on every completed assessment.
* The flare kit carries its own stop condition: sudden or severe pain, a rigid
  abdomen, persistent vomiting, blood or fever means medical help, not breathing
  exercises.
* The pattern check is described as a pattern check every single time it's shown.
  It never uses the word diagnosis about itself.
* No streaks, no restriction scores, no "perfect day" badges. This diet has a
  documented overlap with disordered eating, and gamifying restriction is the one
  design decision that could make it harmful.

## Files

```
index.html          structure
assets/style.css    design system, forest and sage, hairlines over boxes
assets/data.js      channels, prahars, variants, preps, 371 foods, label rules
assets/app.js       engine (kernel, load, fixes, findings, triage) + rendering
```

The page is three sections (The Day, Journal, Your Numbers) plus a short
explainer. The kitchen is a searchable drawer behind *Add food* rather than a
section of its own: 47 dishes rendered as tiles cost more page than they were
worth, and "what did I eat" wants a list you can search, not a wall to scroll.

## Data honesty

Dish values are modelled from recipe decomposition against published
per-ingredient figures. They aren't lab measurements of the finished dish, and
they aren't Monash's proprietary data. Per-serve cutoffs are from Varney et al.
2017 (*J Gastroenterol Hepatol*). Treat the numbers as a planning aid with real
uncertainty, not as analysis.

## Pillars not built yet

Deliberately deferred, in rough order of value:

* **Languages.** Hindi, Tamil, Telugu, Bengali, Marathi. An English-only tool
  excludes most of the country, so this is the largest remaining gap between
  "useful" and "useful to everyone".
* **The gut-brain half.** Gut-directed hypnotherapy has trial evidence roughly
  comparable to the low-FODMAP diet and is essentially unavailable in India. The
  breathing pacer is the only piece of this that exists so far.
* **Cycle phase.** Symptoms reliably worsen in the luteal and menstrual phases
  for a large share of sufferers, and nothing here models it.
* **Living it.** Eating out scripts, travel, weddings, cook mode for whoever
  actually makes your food.
* **Trajectory.** Tolerance over months, and re-baselining after antibiotics or
  an infection.
* **The commons.** Pooled anonymous verdicts, which would make this the only
  Indian FODMAP dataset in existence. Needs a backend.

## Smaller things not done yet

* Uncertainty ranges on dish cards rather than point values
* Findings use day-level scores only. The timed symptom entries aren't yet folded
  into per-food attribution
* A guided challenge scheduler that actually runs the ladder over weeks
* Barcode and packaged-food ingredient rules for hidden inulin and polyols
* More dishes, especially East Indian and regional breakfast items
