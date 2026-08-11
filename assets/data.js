/* PRAHAR reference data.
 * Every gram value here is MODELLED from recipe decomposition against published
 * per-ingredient figures. None of it is lab-measured for the finished dish.
 * Cutoffs come from Varney et al. 2017 (J Gastroenterol Hepatol), i.e. the
 * Monash thresholds.
 */

/* The six channels.
 * cut  = grams per serve below which a serving counts as "low"
 * peak = hours after eating that this channel's effect peaks
 * a    = shape parameter of the release curve (higher = tighter peak)
 */
const CHANNELS = {
  fructan:  { label: "Fructan",  cut: 0.30, peak: 6.0, a: 4.0, col: "#01472e",
              why: "Wheat, onion, garlic, inulin",
              test: "Bread: 1, then 2, then 3 slices", rest: true },
  gos:      { label: "GOS",      cut: 0.30, peak: 5.5, a: 4.0, col: "#3d6b4a",
              why: "Rajma, chana, cashew, most dals",
              test: "Cashews: a small handful, then a larger one", rest: true },
  lactose:  { label: "Lactose",  cut: 1.00, peak: 3.5, a: 3.0, col: "#6b8560",
              why: "Milk, dahi, khoya sweets",
              test: "Milk: 125, then 250, then 500 ml", rest: false },
  fructose: { label: "Fructose", cut: 0.15, peak: 2.0, a: 2.5, col: "#8a9a72",
              why: "Honey, mango, dates, tamarind",
              test: "Honey: 1, then 2, then 3 tsp", rest: false },
  sorbitol: { label: "Sorbitol", cut: 0.20, peak: 2.0, a: 2.5, col: "#a3b18a",
              why: "Stone fruit, sugar-free gum",
              test: "Stone fruit: half, then 1, then 2", rest: false },
  mannitol: { label: "Mannitol", cut: 0.20, peak: 2.5, a: 2.5, col: "#c0c9a2",
              why: "Gobi, mushroom, sweet potato",
              test: "Mushroom: 3, then 6, then 12 pieces", rest: false }
};
const KEYS = Object.keys(CHANNELS);

/* The eight watches of the day. A prahar is three hours. */
const PRAHARS = [
  { s: 6,  n: "Pratah",    g: "Dawn" },
  { s: 9,  n: "Purvahna",  g: "Forenoon" },
  { s: 12, n: "Madhyahna", g: "Midday" },
  { s: 15, n: "Aparahna",  g: "Afternoon" },
  { s: 18, n: "Sayahna",   g: "Evening" },
  { s: 21, n: "Pradosh",   g: "Early night" },
  { s: 24, n: "Nishith",   g: "Deep night" },
  { s: 27, n: "Usha",      g: "Before dawn" }
];

/* Dish algebra. One dish name is not one food.
 * Restaurant gravies carry cashew paste and cream; Jain drops onion and garlic.
 */
const VARIANTS = {
  home:       { label: "Home",       mult: {} },
  restaurant: { label: "Restaurant", mult: { fructan: 1.3, gos: 1.8, lactose: 1.6 },
                note: "Cashew paste and cream in the gravy" },
  jain:       { label: "Jain",       mult: { fructan: 0.08 },
                note: "No onion, no garlic. Understood at any Indian restaurant" }
};

/* Preparation changes the chemistry. GOS is water-soluble, so it leaches out. */
const PREPS = {
  none:   { label: "As cooked",       mult: {} },
  soaked: { label: "Soaked + rinsed", mult: { gos: 0.65 },
            note: "Soak 12 h, discard the water, rinse. α-GOS falls by 10 to 40 percent" }
};

/* Values are grams per standard serve, at the serve size named. */
const D = (id, name, region, serve, v, flags) => Object.assign(
  { id, name, region, serve,
    v: Object.assign({ fructan:0, gos:0, lactose:0, fructose:0, sorbitol:0, mannitol:0 }, v) },
  flags || {});

const DISHES = [
  /* --- NORTH --- */
  D("moong",    "Moong Dal",            "north",  "1 katori", { fructan:.05, gos:.18 }, { vr:1, pulse:1 }),
  D("dal",      "Dal Tadka",            "north",  "1 katori", { fructan:.55, gos:.45 }, { vr:1, pulse:1 }),
  D("rajma",    "Rajma",                "north",  "1 katori", { fructan:.10, gos:1.60 }, { vr:1, pulse:1 }),
  D("chole",    "Chole",                "north",  "1 katori", { fructan:.15, gos:1.40 }, { vr:1, pulse:1 }),
  D("roti",     "Roti",                 "north",  "1 piece",  { fructan:.28 }),
  D("rice",     "Plain Rice",           "north",  "1 plate",  {}),
  D("jeera",    "Jeera Rice",           "north",  "1 plate",  { fructan:.05 }),
  D("pbm",      "Paneer Butter Masala", "north",  "1 katori", { fructan:.75, gos:.21, lactose:.31 }, { vr:1 }),
  D("gobi",     "Aloo Gobi",            "north",  "1 katori", { fructan:.35, mannitol:.55 }, { vr:1 }),
  D("bhindi",   "Bhindi Masala",        "north",  "1 katori", { fructan:.30 }, { vr:1 }),
  D("matar",    "Matar Paneer",         "north",  "1 katori", { fructan:.40, gos:.35, lactose:.25 }, { vr:1 }),
  D("baingan",  "Baingan Bharta",       "north",  "1 katori", { fructan:.45 }, { vr:1 }),
  D("dahi",     "Dahi",                 "north",  "½ katori", { lactose:3.00 }),
  D("paratha",  "Aloo Paratha",         "north",  "1 piece",  { fructan:.45 }),
  D("biryani",  "Veg Biryani",          "north",  "1 plate",  { fructan:.90, gos:.25, mannitol:.20 }, { vr:1 }),
  D("kadhi",    "Kadhi",                "north",  "1 katori", { gos:.40, lactose:.80 }, { vr:1 }),

  /* --- SOUTH --- */
  D("idli",     "Idli + Chutney",       "south",  "2 pieces", { fructan:.08, gos:.22 }),
  D("dosa",     "Plain Dosa",           "south",  "1 piece",  { fructan:.06, gos:.18 }),
  D("masdosa",  "Masala Dosa",          "south",  "1 piece",  { fructan:.35, gos:.20, mannitol:.05 }),
  D("uttapam",  "Onion Uttapam",        "south",  "1 piece",  { fructan:.65, gos:.20 }),
  D("sambar",   "Sambar",               "south",  "1 katori", { fructan:.45, gos:.60 }, { vr:1, pulse:1 }),
  D("rasam",    "Rasam",                "south",  "1 katori", { fructan:.20, gos:.10, fructose:.20 }, { vr:1 }),
  D("curdrice", "Curd Rice",            "south",  "1 katori", { lactose:2.20 }),
  D("upma",     "Upma",                 "south",  "1 katori", { fructan:.50 }, { vr:1 }),
  D("pongal",   "Pongal",               "south",  "1 katori", { fructan:.10, gos:.30 }, { pulse:1 }),
  D("avial",    "Avial",                "south",  "1 katori", { fructan:.25, sorbitol:.30 }),
  D("vada",     "Medu Vada",            "south",  "2 pieces", { gos:.70, fructan:.15 }, { pulse:1 }),

  /* --- STREET --- */
  D("poha",     "Poha",                 "street", "1 plate",  { fructan:.08 }, { vr:1 }),
  D("pavbhaji", "Pav Bhaji",            "street", "1 plate",  { fructan:1.20, gos:.30, lactose:.20, mannitol:.60 }, { vr:1 }),
  D("vadapav",  "Vada Pav",             "street", "1 piece",  { fructan:.85, gos:.25 }),
  D("samosa",   "Samosa",               "street", "1 piece",  { fructan:.55, mannitol:.10 }),
  D("panipuri", "Pani Puri",            "street", "6 pieces", { fructan:.70, fructose:.45 }),
  D("bhel",     "Bhel Puri",            "street", "1 plate",  { fructan:.80, gos:.15, fructose:.40 }),
  D("dhokla",   "Dhokla",               "street", "1 plate",  { fructan:.10, gos:.55 }, { pulse:1 }),
  D("cholebh",  "Chole Bhature",        "street", "1 plate",  { fructan:1.90, gos:1.40 }, { pulse:1 }),
  D("noodles",  "Hakka Noodles",        "street", "1 plate",  { fructan:1.40, gos:.10 }, { vr:1 }),
  D("manchur",  "Gobi Manchurian",      "street", "1 plate",  { fructan:1.30, mannitol:.70 }, { vr:1 }),
  D("misal",    "Misal Pav",            "street", "1 plate",  { fructan:1.10, gos:1.20 }, { pulse:1 }),
  D("thepla",   "Thepla",               "street", "2 pieces", { fructan:.50 }),

  /* --- SWEET --- */
  D("gulab",    "Gulab Jamun",          "sweet",  "2 pieces", { fructan:.35, lactose:2.40 }),
  D("kaju",     "Kaju Katli",           "sweet",  "2 pieces", { gos:1.10 }),
  D("jalebi",   "Jalebi",               "sweet",  "2 pieces", { fructan:.60 }),
  D("rasgulla", "Rasgulla",             "sweet",  "2 pieces", { lactose:3.20 }),
  D("laddoo",   "Besan Laddoo",         "sweet",  "1 piece",  { gos:.85 }),
  D("barfi",    "Coconut Barfi",        "sweet",  "1 piece",  { lactose:.40, sorbitol:.15 }),
  D("halwa",    "Sooji Halwa",          "sweet",  "1 katori", { fructan:.70, lactose:.50 }),
  D("kheer",    "Rice Kheer",           "sweet",  "1 katori", { lactose:2.60 })
];

/* Plain words for the six channels. Nobody should have to learn the word
   "galacto-oligosaccharide" just to be told that half a plate is enough. */
const PLAIN = {
  fructan:  "the wheat, onion and garlic group",
  gos:      "the beans and lentils group",
  lactose:  "milk sugar",
  fructose: "fruit sugar",
  sorbitol: "sugar alcohols",
  mannitol: "sugar alcohols"
};

/* What to do when it already hurts. Ordered by how fast it tends to work.
   Everything here is something a clinician would recognise; nothing here
   is a substitute for one. */
const RELIEF = [
  { id: "breathe", mins: 5, title: "Slow your breathing",
    body: "Sit or lie down. Put a hand on your belly and breathe so that hand rises, keeping your chest still. In for four counts, out for six. The long exhale is the part that does the work.",
    why: "Slow belly breathing turns down gut pain signals and lets the abdominal wall relax. For a lot of people the visible swelling is the diaphragm pushing down rather than extra gas." },

  { id: "position", mins: 3, title: "Get into a position that moves gas",
    body: "Lie on your back and hug both knees to your chest, then rock gently side to side. Or fold into child's pose. Two or three minutes, breathing slowly throughout.",
    why: "Trapped wind moves with pressure and posture. Pawanmuktasana translates as the wind-relieving pose. For most people it is the quickest thing available." },

  { id: "heat", mins: 15, title: "Put warmth on your belly",
    body: "A hot water bottle or a warm compress, low over the abdomen. Fifteen minutes.",
    why: "Heat relaxes the gut muscle and raises your pain threshold. It is cheap, it is safe, and it works on cramping." },

  { id: "walk", mins: 15, title: "Walk it out",
    body: "A gentle ten to fifteen minute walk. Not exercise, just moving.",
    why: "Walking speeds things through and helps gas along. Lying flat and still is the one thing that reliably makes a flare last longer." },

  { id: "peppermint", mins: 0, title: "Consider enteric-coated peppermint oil",
    body: "Taken as directed on the packet, before food rather than during a flare.",
    why: "One of the few over-the-counter options with real trial evidence behind it for IBS pain. Skip it if you get reflux, because it can loosen the valve at the top of the stomach. Ask a pharmacist first if you take other medicines." }
];

/* Things that quietly prolong a flare. */
const RELIEF_AVOID = [
  "More FODMAPs for the next few hours. You are already at the ceiling",
  "Fizzy drinks, which add gas directly",
  "Chewing gum and drinking through straws, which both swallow air",
  "Lying flat straight after eating",
  "Tight waistbands"
];

/* ==========================================================================
   THE KITCHEN CATALOGUE
   Spices, vegetables, fruit, grains, dals, dairy, nuts, sweeteners, drinks.
   `free: 1` means the amount an Indian kitchen actually uses is too small to
   matter. Say so plainly rather than making people afraid of their masala dabba.
   ========================================================================== */

const MORE = [
  /* --- SPICES AND MASALAS ------------------------------------------------
     Nearly all of these are low FODMAP at culinary amounts. The two that are
     not are the two that hide in every packet: onion powder and garlic powder. */
  D("jeeraspice","Jeera / Cumin",           "spice", "1 tsp", {}, { free:1 }),
  D("dhania",    "Dhania / Coriander",      "spice", "1 tsp", {}, { free:1 }),
  D("haldi",     "Haldi / Turmeric",        "spice", "1 tsp", {}, { free:1 }),
  D("elaichi",   "Elaichi / Cardamom",      "spice", "3 pods", {}, { free:1 }),
  D("badielaichi","Badi Elaichi / Black cardamom","spice","2 pods", {}, { free:1 }),
  D("saunf",     "Saunf / Fennel seeds",    "spice", "1 tsp", {}, { free:1,
      note: "Fine as a mukhwas after food. Fennel bulb is a different matter and is high in fructans." }),
  D("ajwain",    "Ajwain / Carom",          "spice", "1 tsp", {}, { free:1 }),
  D("kalonji",   "Kalonji / Nigella",       "spice", "1 tsp", {}, { free:1 }),
  D("rai",       "Rai / Mustard seeds",     "spice", "1 tsp", {}, { free:1 }),
  D("methidana", "Methi dana / Fenugreek seeds","spice","1 tsp", { gos:.04 }, {
      note: "The seed is very high in GOS by weight, but a teaspoon in a tadka is nothing. Do not eat spoonfuls of soaked methi." }),
  D("dalchini",  "Dalchini / Cinnamon",     "spice", "1 stick", {}, { free:1 }),
  D("laung",     "Laung / Cloves",          "spice", "4 cloves", {}, { free:1 }),
  D("tejpatta",  "Tej patta / Bay leaf",    "spice", "2 leaves", {}, { free:1 }),
  D("kalimirch", "Kali mirch / Black pepper","spice", "1 tsp", {}, { free:1 }),
  D("javitri",   "Javitri / Mace",          "spice", "1 blade", {}, { free:1 }),
  D("jaiphal",   "Jaiphal / Nutmeg",        "spice", "a grating", {}, { free:1 }),
  D("staranise", "Chakra phool / Star anise","spice", "1 pod", {}, { free:1 }),
  D("hing",      "Hing / Asafoetida",       "spice", "a pinch", {}, { free:1,
      note: "The classic stand-in for onion and garlic, and low FODMAP in itself. Most Indian brands cut the resin with wheat flour, so buy a gluten-free one if you also avoid gluten." }),
  D("amchur",    "Amchur / Dry mango powder","spice", "1 tsp", {}, { free:1 }),
  D("anardana",  "Anardana / Pomegranate seed powder","spice","1 tsp", {}, { free:1 }),
  D("kasurimethi","Kasuri methi / Dried fenugreek leaves","spice","1 tsp", {}, { free:1 }),
  D("khuskhus",  "Khus khus / Poppy seeds", "spice", "1 tbsp", {}, { free:1 }),
  D("tilseeds",  "Til / Sesame seeds",      "spice", "1 tbsp", {}, { free:1 }),
  D("lalmirch",  "Lal mirch / Red chilli powder","spice","1 tsp", {}, { free:1 }),
  D("harimirch", "Hari mirch / Green chilli","spice", "2 chillies", {}, { free:1 }),
  D("adrak",     "Adrak / Ginger",          "spice", "1 inch", {}, { free:1 }),
  D("kadipatta", "Kadi patta / Curry leaves","spice", "10 leaves", {}, { free:1 }),
  D("haradhania","Hara dhania / Coriander leaves","spice","a handful", {}, { free:1 }),
  D("pudina",    "Pudina / Mint",           "spice", "a handful", {}, { free:1 }),
  D("kalanamak", "Kala namak / Black salt", "spice", "1 tsp", {}, { free:1 }),
  D("imli",      "Imli / Tamarind pulp",    "spice", "1 tbsp", { fructose:.12 }, {
      note: "Fine in a rasam or a curry. It builds up quickly in chutneys." }),
  D("garammasala","Garam masala",           "spice", "1 tsp", {}, { free:1,
      note: "The blend itself is fine. Read the packet: many brands add onion or garlic powder." }),
  D("sambarpdr", "Sambar powder",           "spice", "1 tbsp", { gos:.08 }, {
      note: "Contains roasted dal, so it carries a little GOS. Not enough to matter in one bowl." }),
  D("rasampdr",  "Rasam powder",            "spice", "1 tbsp", { gos:.05 }),
  D("chaatmasala","Chaat masala",           "spice", "1 tsp", {}, { free:1 }),
  D("pavbhajipdr","Pav bhaji masala",       "spice", "1 tbsp", { fructan:.10 }, {
      note: "Most brands include onion and garlic powder. Check before you trust it." }),
  D("onionpdr",  "Onion powder",            "spice", "1 tsp", { fructan:.28 }, {
      note: "Hides in packet masalas, namkeen, instant noodles and most restaurant gravies. This is the single most common ambush." }),
  D("garlicpdr", "Garlic powder",           "spice", "1 tsp", { fructan:.85 }, {
      note: "Same story as onion powder. Garlic-infused oil gives you the flavour without the fructans, because they do not dissolve into oil." }),

  /* --- VEGETABLES --------------------------------------------------------- */
  D("lauki",     "Lauki / Bottle gourd",    "veg", "1 katori", {}),
  D("turai",     "Turai / Ridge gourd",     "veg", "1 katori", {}),
  D("tinda",     "Tinda / Apple gourd",     "veg", "1 katori", {}),
  D("parwal",    "Parwal / Pointed gourd",  "veg", "1 katori", {}, { est:1 }),
  D("tendli",    "Tendli / Ivy gourd",      "veg", "1 katori", {}),
  D("karela",    "Karela / Bitter gourd",   "veg", "1 katori", {}),
  D("bainganveg","Baingan / Brinjal",       "veg", "1 katori", {}),
  D("bhindiveg", "Bhindi / Okra",           "veg", "6 pods", { fructan:.10 }, {
      note: "Fine at about six pods. A big plateful pushes the fructans up." }),
  D("tamatar",   "Tamatar / Tomato",        "veg", "1 medium", {}),
  D("aloo",      "Aloo / Potato",           "veg", "1 medium", {}),
  D("gajar",     "Gajar / Carrot",          "veg", "1 medium", {}),
  D("kheera",    "Kheera / Cucumber",       "veg", "1 katori", {}),
  D("palak",     "Palak / Spinach",         "veg", "1 katori", {}),
  D("methileaf", "Methi / Fenugreek leaves","veg", "1 katori", {}),
  D("sarson",    "Sarson / Mustard greens", "veg", "1 katori", {}, { est:1 }),
  D("capsred",   "Shimla mirch, red",       "veg", "half",     {}),
  D("capsgreen", "Shimla mirch, green",     "veg", "half",     { fructan:.08 }),
  D("beans",     "French beans",            "veg", "15 beans", {}),
  D("lauki2",    "Petha / Ash gourd",       "veg", "1 katori", {}, { est:1 }),
  D("kaddu",     "Kaddu / Pumpkin",         "veg", "1 katori", { mannitol:.12 }),
  D("muli",      "Muli / Radish",           "veg", "half",     { fructan:.10 }),
  D("shalgam",   "Shalgam / Turnip",        "veg", "half",     {}),
  D("arbi",      "Arbi / Colocasia",        "veg", "1 katori", {}, { est:1 }),
  D("suran",     "Suran / Yam",             "veg", "1 katori", {}, { est:1 }),
  D("drumstick", "Sahjan / Drumstick",      "veg", "2 sticks", {}, { est:1,
      note: "Never formally tested. Treated as low here on the basis of related vegetables, so watch how it sits with you." }),
  D("hariapyaz", "Spring onion, green tops","veg", "a handful",{}, {
      note: "The green tops are free. The white bulb is one of the worst offenders there is." }),
  D("shakarkandi","Shakarkandi / Sweet potato","veg","half",   { mannitol:.18 }),
  D("chukandar", "Chukandar / Beetroot",    "veg", "2 slices", { fructan:.22 }),
  D("pattagobi", "Patta gobi / Cabbage",    "veg", "1 katori", { sorbitol:.10 }),
  D("gobiveg",   "Gobi / Cauliflower",      "veg", "1 katori", { mannitol:.55 }),
  D("mushroom",  "Mushroom",                "veg", "1 katori", { mannitol:.65 }),
  D("matarveg",  "Matar / Green peas",      "veg", "1 katori", { fructan:.30, gos:.35 }),
  D("bhutta",    "Bhutta / Sweet corn",     "veg", "half cob", { fructan:.18, sorbitol:.12 }),
  D("pyaz",      "Pyaz / Onion",            "veg", "half",     { fructan:.85 }, {
      note: "The base of nearly every Indian gravy, and the most common single trigger. Hing and garlic-infused oil are how you cook around it." }),
  D("lehsun",    "Lehsun / Garlic",         "veg", "2 cloves", { fructan:.55 }, {
      note: "Ask for Jain when you eat out. It is understood everywhere and it removes both onion and garlic." }),

  /* --- FRUIT --------------------------------------------------------------- */
  D("kelafirm",  "Kela, firm / Banana",     "fruit", "1 medium", {}, {
      note: "Firm is fine. As it ripens and sweetens the fructans climb, so a very ripe one is a third of a banana." }),
  D("kelaripe",  "Kela, very ripe",         "fruit", "1 medium", { fructan:.32 }),
  D("papita",    "Papita / Papaya",         "fruit", "1 katori", {}),
  D("amrud",     "Amrud, ripe / Guava",     "fruit", "1 medium", {}, {
      note: "Ripe guava is free. Unripe guava is high in fructose." }),
  D("santra",    "Santra / Orange",         "fruit", "1 medium", {}),
  D("mosambi",   "Mosambi / Sweet lime",    "fruit", "1 medium", {}),
  D("angoor",    "Angoor / Grapes",         "fruit", "1 katori", {}),
  D("ananas",    "Ananas / Pineapple",      "fruit", "1 katori", {}),
  D("nimbu",     "Nimbu / Lemon",           "fruit", "1 whole",  {}),
  D("nariyal",   "Nariyal / Fresh coconut", "fruit", "small piece",{ sorbitol:.12 }),
  D("anar",      "Anar / Pomegranate",      "fruit", "half",     {}),
  D("kharbooja", "Kharbooja / Muskmelon",   "fruit", "1 katori", {}),
  D("strawberry","Strawberry",              "fruit", "10 berries",{}),
  D("kiwi",      "Kiwi",                    "fruit", "2 whole",  {}),
  D("aam",       "Aam / Mango",             "fruit", "1 medium", { fructose:.70 }, {
      note: "High in fructose beyond its glucose. About 40 g is the amount that stays low, which is a couple of slices rather than a bowl." }),
  D("seb",       "Seb / Apple",             "fruit", "1 medium", { fructose:.55, sorbitol:.35 }),
  D("nashpati",  "Nashpati / Pear",         "fruit", "1 medium", { fructose:.60, sorbitol:.50 }),
  D("tarbooj",   "Tarbooj / Watermelon",    "fruit", "1 katori", { fructose:.40, fructan:.25, mannitol:.20 }),
  D("litchi",    "Litchi",                  "fruit", "5 whole",  { fructose:.30 }, { est:1 }),
  D("chikoo",    "Chikoo / Sapota",         "fruit", "1 medium", { fructose:.35 }, { est:1 }),
  D("sitaphal",  "Sitaphal / Custard apple","fruit", "half",     { fructose:.30 }, { est:1 }),
  D("kathal",    "Kathal / Jackfruit",      "fruit", "1 katori", { fructan:.30 }, { est:1 }),
  D("khajur",    "Khajur / Dates",          "fruit", "2 dates",  { fructan:.35, fructose:.30 }, {
      note: "Dates are the hidden thing in meethi chutney. That is why chaat catches people out." }),
  D("anjeer",    "Anjeer / Figs",           "fruit", "2 figs",   { fructose:.45, fructan:.25 }),
  D("kishmish",  "Kishmish / Raisins",      "fruit", "1 tbsp",   { fructan:.20 }),
  D("aloobukhara","Aloo bukhara / Plum",    "fruit", "2 whole",  { sorbitol:.45 }),

  /* --- GRAINS AND FLOURS --------------------------------------------------- */
  D("chawal",    "Chawal / Rice, any kind", "grain", "1 plate",  {}),
  D("chawalatta","Rice flour",              "grain", "100 g",    {}),
  D("pohagrain", "Poha / Flattened rice",   "grain", "1 katori", {}),
  D("murmura",   "Murmura / Puffed rice",   "grain", "1 katori", {}),
  D("jowar",     "Jowar / Sorghum flour",   "grain", "100 g",    {}),
  D("bajra",     "Bajra / Pearl millet",    "grain", "100 g",    {}, { est:1,
      note: "Not formally tested. Millets look low overall, so this is an estimate rather than a measurement." }),
  D("ragi",      "Ragi / Finger millet",    "grain", "100 g",    {}, { est:1,
      note: "Not formally tested either. Treat it as probably fine and watch how it sits with you." }),
  D("samak",     "Samak / Barnyard millet", "grain", "1 katori", {}, { est:1 }),
  D("makkiatta", "Makki atta / Corn flour", "grain", "100 g",    {}),
  D("kuttu",     "Kuttu / Buckwheat flour", "grain", "100 g",    {}),
  D("rajgira",   "Rajgira / Amaranth flour","grain", "100 g",    { fructan:.45, gos:.30 }, {
      note: "Often assumed safe because it is gluten-free. It is not. Amaranth tests high." }),
  D("quinoa",    "Quinoa",                  "grain", "1 katori", {}),
  D("sabudana",  "Sabudana / Tapioca",      "grain", "1 katori", {}),
  D("oats",      "Oats",                    "grain", "half katori",{ fructan:.12 }),
  D("atta",      "Gehun atta / Wheat flour","grain", "2 rotis",  { fructan:.56 }),
  D("maida",     "Maida / Refined flour",   "grain", "1 portion",{ fructan:.50 }),
  D("suji",      "Suji / Rava / Semolina",  "grain", "1 katori", { fructan:.50 }),
  D("dalia",     "Dalia / Broken wheat",    "grain", "1 katori", { fructan:.55 }),
  D("jau",       "Jau / Barley",            "grain", "1 katori", { fructan:.60 }),
  D("besan",     "Besan / Gram flour",      "grain", "half katori",{ gos:.65 }, {
      note: "Gluten-free but high in GOS. Chilla, pakora and besan laddoo all carry it." }),

  /* --- DALS AND PULSES ----------------------------------------------------
     A quarter cup of cooked pulse, about 46 g, is the amount that generally
     stays low. A full katori is roughly twice that. */
  D("moongdhuli","Moong dal, dhuli",        "dal", "1 katori", { fructan:.05, gos:.18 }, { pulse:1,
      note: "The gentlest dal there is. If you are cutting back on pulses, keep this one." }),
  D("moongsabut","Moong, sabut / Whole green gram","dal","1 katori",{ gos:.55 }, { pulse:1 }),
  D("masoor",    "Masoor dal",              "dal", "1 katori", { gos:.45 }, { pulse:1 }),
  D("toor",      "Toor / Arhar dal",        "dal", "1 katori", { gos:.60, fructan:.10 }, { pulse:1 }),
  D("chanadal",  "Chana dal",               "dal", "1 katori", { gos:.95 }, { pulse:1 }),
  D("uraddal",   "Urad dal",                "dal", "1 katori", { gos:.85 }, { pulse:1 }),
  D("rajmadal",  "Rajma / Kidney beans",    "dal", "1 katori", { gos:1.60, fructan:.10 }, { pulse:1 }),
  D("kabuli",    "Kabuli chana / Chickpeas","dal", "1 katori", { gos:1.40, fructan:.15 }, { pulse:1,
      note: "Tinned and rinsed, a quarter cup comes out low. Dried and boiled at home, soak them and throw the water away." }),
  D("lobia",     "Lobia / Black-eyed peas", "dal", "1 katori", { gos:1.10 }, { pulse:1 }),
  D("matki",     "Matki / Moth beans",      "dal", "1 katori", { gos:1.00 }, { pulse:1, est:1 }),
  D("kulith",    "Kulith / Horse gram",     "dal", "1 katori", { gos:.95 }, { pulse:1, est:1 }),
  D("soya",      "Soya chunks",             "dal", "half katori",{ gos:.70 }, { est:1 }),

  /* --- DAIRY --------------------------------------------------------------- */
  D("doodh",     "Doodh / Milk",            "dairy", "1 glass",  { lactose:12.0 }),
  D("dahiplain", "Dahi / Curd",             "dairy", "1 katori", { lactose:6.0 }),
  D("chaas",     "Chaas / Buttermilk",      "dairy", "1 glass",  { lactose:2.0 }, {
      note: "Thinned with water, so it carries far less lactose than the curd it came from." }),
  D("lassi",     "Lassi",                   "dairy", "1 glass",  { lactose:7.0 }),
  D("paneerraw", "Paneer",                  "dairy", "1 katori", { lactose:.30 }, {
      note: "The whey is drained off, and most of the lactose goes with it. Paneer is rarely the problem in paneer dishes." }),
  D("ghee",      "Ghee",                    "dairy", "1 tbsp",   {}, { free:1,
      note: "Pure fat, no milk sugar left. Free." }),
  D("makhan",    "Makhan / Butter",         "dairy", "1 tbsp",   {}, { free:1 }),
  D("malai",     "Malai / Cream",           "dairy", "2 tbsp",   { lactose:.60 }),
  D("khoya",     "Khoya / Mawa",            "dairy", "50 g",     { lactose:4.0 }, {
      note: "Milk boiled down, so the lactose is concentrated. This is why milk sweets hit hard." }),
  D("cheddar",   "Hard cheese",             "dairy", "40 g",     { lactose:.10 }),
  D("condensed", "Condensed milk",          "dairy", "2 tbsp",   { lactose:5.0 }),
  D("lactofree", "Lactose-free milk",       "dairy", "1 glass",  {}, { free:1 }),

  /* --- NUTS AND SEEDS ------------------------------------------------------ */
  D("badam",     "Badam / Almonds",         "nut", "10 nuts",   {}, {
      note: "Ten is the number. Beyond about twenty the GOS starts to count." }),
  D("akhrot",    "Akhrot / Walnuts",        "nut", "10 halves", {}),
  D("moongphali","Moongphali / Peanuts",    "nut", "32 nuts",   {}),
  D("kajunut",   "Kaju / Cashew",           "nut", "10 nuts",   { gos:.55 }, {
      note: "High even in small amounts, and it is the thickener in restaurant makhani and korma gravies. The hidden GOS in eating out." }),
  D("pista",     "Pista / Pistachio",       "nut", "10 nuts",   { gos:.50, fructan:.20 }),
  D("magaz",     "Magaz / Melon seeds",     "nut", "1 tbsp",    {}, { est:1,
      note: "A workable stand-in for cashew paste when you want a thick gravy." }),
  D("chironji",  "Chironji",                "nut", "1 tbsp",    {}, { est:1 }),
  D("kaddubeej", "Pumpkin seeds",           "nut", "2 tbsp",    {}),
  D("sunflower", "Sunflower seeds",         "nut", "2 tbsp",    {}),
  D("alsi",      "Alsi / Flax seeds",       "nut", "1 tbsp",    {}),
  D("chia",      "Chia seeds",              "nut", "2 tbsp",    {}),
  D("sukhanariyal","Sukha nariyal / Desiccated coconut","nut","2 tbsp",{ sorbitol:.10 }),

  /* --- SWEETENERS ---------------------------------------------------------- */
  D("cheeni",    "Cheeni / White sugar",    "sweetener", "2 tsp", {}, { free:1,
      note: "Plain sucrose splits evenly into glucose and fructose, so it carries no excess fructose. Sugar is not the FODMAP problem." }),
  D("gur",       "Gur / Jaggery, 1 tsp",    "sweetener", "1 tsp", {}, {
      note: "A teaspoon is low. A tablespoon is high. It creeps up fast in chikki, gur ki roti and payasam." }),
  D("gurbig",    "Gur / Jaggery, 1 tbsp",   "sweetener", "1 tbsp",{ fructose:.35 }),
  D("shahad",    "Shahad / Honey",          "sweetener", "1 tbsp",{ fructose:.55, fructan:.15 }, {
      note: "More fructose than glucose, which is exactly what excess fructose means. Half a teaspoon is the low serve." }),
  D("maple",     "Maple syrup",             "sweetener", "2 tbsp",{}),
  D("stevia",    "Stevia",                  "sweetener", "1 sachet",{}, { free:1 }),
  D("polyolsweet","Sugar-free sweeteners ending in -ol","sweetener","1 sachet",{ sorbitol:.55 }, {
      note: "Sorbitol, xylitol, maltitol and mannitol. In sugar-free gum, mints and diabetic sweets. They are laxatives at modest doses." }),
  D("nariyalcheeni","Coconut sugar",        "sweetener", "1 tbsp",{ fructose:.18 }, { est:1 }),

  /* --- DRINKS -------------------------------------------------------------- */
  D("chai",      "Chai, with milk",         "drink", "1 cup",   { lactose:3.0 }),
  D("blacktea",  "Black tea, no milk",      "drink", "1 cup",   {}, {
      note: "Fine unless it is brewed very strong for a long time, which brings the fructans up." }),
  D("coffee",    "Coffee, black",           "drink", "1 cup",   {}),
  D("nimbupani", "Nimbu pani",              "drink", "1 glass", {}),
  D("nariyalpani","Nariyal pani / Coconut water","drink","1 glass",{ sorbitol:.20 }),
  D("gannarasa", "Ganne ka ras / Sugarcane juice","drink","1 glass",{ fructose:.25 }, { est:1 }),
  D("colddrink", "Aerated cold drink",      "drink", "1 glass", { fructose:.40 }, {
      note: "Depends entirely on the sweetener. High-fructose corn syrup is the one to look for, and the bubbles add gas whatever the sugar." })
];

DISHES.push(...MORE);

/* Filter groups for the kitchen drawer. */
const CATS = [
  ["all",       "All",             null],
  ["dish",      "Dishes",          ["north", "south", "street", "sweet"]],
  ["spice",     "Masala",          ["spice"]],
  ["veg",       "Vegetables",      ["veg"]],
  ["fruit",     "Fruit",           ["fruit"]],
  ["grain",     "Grains & flours", ["grain"]],
  ["dal",       "Dals",            ["dal"]],
  ["dairy",     "Dairy",           ["dairy"]],
  ["nut",       "Nuts & seeds",    ["nut"]],
  ["sweetener", "Sweeteners",      ["sweetener"]],
  ["drink",     "Drinks",          ["drink"]]
];
const catMatch = (d, key) => {
  if (key === "all") return true;
  const row = CATS.find(c => c[0] === key);
  return row && row[2] ? row[2].includes(d.region) : false;
};

/* Red flags. These mean see a doctor, not an app. Bowel cancer, inflammatory
   bowel disease and coeliac all hide behind symptoms that look like IBS, so
   this list runs before anything else in the app. */
const RED_FLAGS = [
  { id: "blood",  q: "Blood in your stool, or black stools" },
  { id: "weight", q: "Losing weight without trying to" },
  { id: "age",    q: "Symptoms that first began after you turned 50" },
  { id: "night",  q: "Symptoms that wake you from sleep" },
  { id: "anaemia",q: "Anaemia, or a blood test showing low iron" },
  { id: "family", q: "A parent or sibling with Crohn's, colitis, coeliac or bowel cancer" },
  { id: "fever",  q: "Fever alongside the gut symptoms" },
  { id: "mass",   q: "A lump or mass you or a doctor can feel in your abdomen" }
];

/* A plain-language reading of the Rome IV pattern. This is a pattern check to
   take to a doctor, never a diagnosis, and the app says so every time. */
const ROME = [
  { id: "pain",   q: "Have you had recurring belly pain or discomfort on at least one day a week, for the last three months?" },
  { id: "months", q: "Did all this start at least six months ago?" },
  { id: "poo",    q: "Is the pain often tied to going to the toilet, either better or worse afterwards?" },
  { id: "freq",   q: "Did the trouble start around the time your bowel habit changed frequency?" },
  { id: "form",   q: "Did it start around the time your stools changed appearance, becoming harder, looser or just different?" }
];

/* Bristol-based subtype. It changes what actually helps, so it's worth asking. */
const SUBTYPES = {
  "IBS-C": { label: "Constipation-predominant",
    note: "Hard, difficult stools dominate. Soluble fibre, fluid and movement usually matter more than cutting FODMAPs. Some high-FODMAP foods are the very ones keeping you going, so cut carefully." },
  "IBS-D": { label: "Diarrhoea-predominant",
    note: "Loose, urgent stools dominate. Portion size, fat load, caffeine and the osmotic FODMAPs (sugar alcohols and fruit sugar) tend to matter most. They hit fast, within one to three hours." },
  "IBS-M": { label: "Mixed",
    note: "You swing between both. Timing and a regular meal rhythm usually help more than any single restriction. Keep a record as well, because your triggers may differ in each direction." },
  "IBS-U": { label: "Unsubtyped",
    note: "Your pattern does not sit cleanly in one group. That is common and it is not a problem. Treat the symptoms in front of you." }
};

/* ==========================================================================
   FUEL
   Calories and protein per stated serve. Rough but honest: these are typical
   home-cooked values, not lab figures, and portions in real kitchens vary a lot.
   ========================================================================== */

const NUTRI = {
  /* dishes */
  moong:[150,9], dal:[180,9], rajma:[210,11], chole:[220,11], roti:[110,3],
  rice:[260,5], jeera:[300,5], pbm:[320,12], gobi:[150,4], bhindi:[120,3],
  matar:[280,12], baingan:[140,3], dahi:[60,3], paratha:[260,6], biryani:[400,9],
  kadhi:[160,6], idli:[160,5], dosa:[170,4], masdosa:[300,6], uttapam:[220,6],
  sambar:[120,6], rasam:[60,2], curdrice:[200,7], upma:[230,6], pongal:[250,8],
  avial:[150,3], vada:[260,7], poha:[250,5], pavbhaji:[400,9], vadapav:[300,7],
  samosa:[260,4], panipuri:[200,4], bhel:[220,5], dhokla:[180,7], cholebh:[650,16],
  noodles:[400,9], manchur:[350,7], misal:[450,14], thepla:[220,6], gulab:[300,4],
  kaju:[160,3], jalebi:[250,2], rasgulla:[190,4], laddoo:[180,4], barfi:[130,2],
  halwa:[320,5], kheer:[250,6],
  /* spices: negligible unless you are eating spoonfuls */
  tilseeds:[52,1.6], khuskhus:[46,1.6], imli:[20,0],
  /* vegetables */
  lauki:[15,.6], turai:[20,1], tinda:[20,1], parwal:[20,1], tendli:[18,1],
  karela:[20,1], bainganveg:[25,1], bhindiveg:[25,1.5], tamatar:[20,1], aloo:[130,3],
  gajar:[25,.6], kheera:[15,.6], palak:[25,3], methileaf:[30,3], sarson:[30,3],
  capsred:[20,.8], capsgreen:[18,.8], beans:[30,1.8], lauki2:[15,.5], kaddu:[30,1],
  muli:[12,.6], shalgam:[20,.8], arbi:[110,2], suran:[100,1.5], drumstick:[25,2],
  hariapyaz:[10,.5], shakarkandi:[90,2], chukandar:[20,.8], pattagobi:[25,1.3],
  gobiveg:[25,2], mushroom:[22,3], matarveg:[80,5], bhutta:[70,2.5], pyaz:[25,.7], lehsun:[9,.4],
  /* fruit */
  kelafirm:[105,1.3], kelaripe:[105,1.3], papita:[55,.6], amrud:[60,2], santra:[60,1.2],
  mosambi:[55,1], angoor:[100,1], ananas:[80,.9], nimbu:[20,.6], nariyal:[100,1],
  anar:[70,1.5], kharbooja:[55,1.4], strawberry:[40,.8], kiwi:[90,1.7], aam:[200,2.8],
  seb:[95,.5], nashpati:[100,.6], tarbooj:[45,.9], litchi:[30,.4], chikoo:[140,.7],
  sitaphal:[120,2], kathal:[155,2.4], khajur:[130,1.1], anjeer:[75,.8], kishmish:[85,.9],
  aloobukhara:[60,.9],
  /* grains */
  chawal:[260,5], chawalatta:[366,6], pohagrain:[250,5], murmura:[100,2], jowar:[349,10],
  bajra:[361,11], ragi:[328,7], samak:[200,4], makkiatta:[361,7], kuttu:[343,13],
  rajgira:[371,14], quinoa:[220,8], sabudana:[250,.3], oats:[150,5], atta:[220,7],
  maida:[250,7], suji:[300,10], dalia:[220,7], jau:[190,7], besan:[200,11],
  /* dals */
  moongdhuli:[150,9], moongsabut:[160,10], masoor:[150,9], toor:[160,9], chanadal:[180,9],
  uraddal:[170,10], rajmadal:[210,11], kabuli:[220,11], lobia:[180,10], matki:[170,10],
  kulith:[170,11], soya:[160,25],
  /* dairy */
  doodh:[150,8], dahiplain:[120,7], chaas:[40,2], lassi:[220,8], paneerraw:[300,20],
  ghee:[120,0], makhan:[100,.1], malai:[100,.6], khoya:[200,7], cheddar:[160,10],
  condensed:[130,3], lactofree:[150,8],
  /* nuts */
  badam:[70,2.5], akhrot:[130,3], moongphali:[170,7], kajunut:[90,3], pista:[60,2],
  magaz:[60,3], chironji:[60,2], kaddubeej:[100,5], sunflower:[110,4], alsi:[55,2],
  chia:[140,5], sukhanariyal:[90,1],
  /* sweeteners */
  cheeni:[32,0], gur:[20,0], gurbig:[60,0], shahad:[64,0], maple:[100,0],
  stevia:[0,0], polyolsweet:[10,0], nariyalcheeni:[45,0],
  /* drinks */
  chai:[90,3], blacktea:[2,0], coffee:[2,0], nimbupani:[60,0], nariyalpani:[45,1],
  gannarasa:[180,0], colddrink:[140,0]
};

/* The things you actually reach for when you are trying to put weight on and
   your gut will not let you. All zero or near-zero fermentable load. */
const FUEL_FOODS = [
  D("anda",      "Anda / Egg",              "protein", "1 egg",    {}, { free:1, k:78,  p:6 }),
  D("andasafed", "Egg whites",              "protein", "3 whites", {}, { free:1, k:51,  p:11 }),
  D("chicken",   "Chicken breast",          "protein", "100 g",    {}, { free:1, k:165, p:31 }),
  D("machli",    "Fish",                    "protein", "100 g",    {}, { free:1, k:200, p:22 }),
  D("mutton",    "Mutton",                  "protein", "100 g",    {}, { free:1, k:250, p:25 }),
  D("wheyiso",   "Whey isolate",            "protein", "1 scoop",  {}, { free:1, k:110, p:25,
      note: "Isolate is filtered until almost no lactose is left. This is the one to buy." }),
  D("wheyconc",  "Whey concentrate",        "protein", "1 scoop",  { lactose:1.40 }, { k:120, p:24,
      note: "Cheaper, and it keeps 4 to 8 percent lactose. If your shake wrecks you, this is usually why. Switch to isolate." }),
  D("gainer",    "Mass gainer, typical",    "protein", "1 scoop",  { fructan:.70, lactose:1.80 }, { k:380, p:20,
      note: "Read the label. Most gainers add inulin, chicory root fibre or FOS for the fibre claim, and that is nearly pure fructan. Milk solids bring the lactose." }),
  D("tofu",      "Tofu, firm",              "protein", "100 g",    {}, { k:145, p:17,
      note: "Firm tofu is pressed and drained, so the GOS goes with the water. Silken tofu is not the same and is high." }),
  D("peanutbtr", "Peanut butter",           "protein", "2 tbsp",   {}, { k:190, p:7,
      note: "Check for added high-fructose corn syrup. Plain ground peanuts are ideal." }),
  D("tel",       "Cooking oil, any",        "protein", "1 tbsp",   {}, { free:1, k:120, p:0,
      note: "Nine calories a gram and nothing fermentable. The cheapest way to add calories without adding volume." }),
  D("aloobread", "Boiled potato",           "protein", "200 g",    {}, { free:1, k:160, p:4 }),
  D("darkchoc",  "Dark chocolate",          "protein", "30 g",     { lactose:.20 }, { k:170, p:2 })
];

/* Every protein source an Indian kitchen or a supplement shop actually offers,
   grouped by where it comes from. Meat, fish, eggs and shellfish contain no
   FODMAPs at all: they are protein, fat and water. */
const PROTEINS = [
  /* --- animal --- */
  D("andaboiled","Boiled eggs",              "protein", "3 eggs",  {}, { free:1, k:234, p:18, pg:"animal" }),
  D("chickenthigh","Chicken thigh",          "protein", "100 g",   {}, { free:1, k:209, p:26, pg:"animal" }),
  D("chickencurry","Chicken, curry cut",     "protein", "100 g",   {}, { free:1, k:190, p:27, pg:"animal",
      note: "The meat is clean. Whatever it is cooked in usually is not, so order the gravy Jain." }),
  D("tandoori",  "Tandoori chicken",         "protein", "100 g",   { fructan:.20 }, { k:200, p:29, pg:"animal",
      note: "The marinade is the problem, not the bird. Ginger, curd and spice are fine; onion and garlic paste are not." }),
  D("keema",     "Keema / Mutton mince",     "protein", "100 g",   {}, { free:1, k:260, p:25, pg:"animal" }),
  D("kaleji",    "Kaleji / Liver",           "protein", "100 g",   {}, { free:1, k:165, p:26, pg:"animal",
      note: "Cheap, and among the most nutrient-dense things you can eat." }),
  D("rohu",      "Rohu",                     "protein", "100 g",   {}, { free:1, k:97,  p:17, pg:"animal" }),
  D("surmai",    "Surmai / Kingfish",        "protein", "100 g",   {}, { free:1, k:105, p:22, pg:"animal" }),
  D("pomfret",   "Pomfret",                  "protein", "100 g",   {}, { free:1, k:96,  p:19, pg:"animal" }),
  D("bangda",    "Bangda / Mackerel",        "protein", "100 g",   {}, { free:1, k:205, p:19, pg:"animal" }),
  D("sardine",   "Sardines, tinned",         "protein", "100 g",   {}, { free:1, k:208, p:25, pg:"animal",
      note: "Tinned fish is the cheapest zero-load protein there is. Keep some in the house for bad days." }),
  D("tuna",      "Tuna, tinned in water",    "protein", "100 g",   {}, { free:1, k:116, p:26, pg:"animal" }),
  D("salmon",    "Salmon",                   "protein", "100 g",   {}, { free:1, k:208, p:20, pg:"animal" }),
  D("jhinga",    "Jhinga / Prawns",          "protein", "100 g",   {}, { free:1, k:99,  p:24, pg:"animal" }),
  D("squid",     "Squid",                    "protein", "100 g",   {}, { free:1, k:92,  p:16, pg:"animal" }),
  D("crab",      "Crab",                     "protein", "100 g",   {}, { free:1, k:87,  p:18, pg:"animal" }),

  /* --- dairy --- */
  D("paneer100", "Paneer, 100 g",            "protein", "100 g",   { lactose:.20 }, { k:265, p:18, pg:"dairy",
      note: "The whey drains off and takes the lactose with it. The best dairy protein for a sensitive gut." }),
  D("hungcurd",  "Hung curd / Greek yoghurt","protein", "150 g",   { lactose:2.20 }, { k:130, p:15, pg:"dairy",
      note: "Straining removes whey, so it carries roughly a third the lactose of the curd it came from." }),
  D("mozzarella","Mozzarella",               "protein", "40 g",    { lactose:.10 }, { k:120, p:9,  pg:"dairy" }),
  D("cheeseslice","Processed cheese slice",  "protein", "1 slice", { lactose:.30 }, { k:60,  p:3.5,pg:"dairy" }),
  D("milkpowder","Skimmed milk powder",      "protein", "30 g",    { lactose:15.0 }, { k:110, p:11, pg:"dairy",
      note: "Looks like a cheap protein hack and is almost pure lactose. Avoid this one." }),

  /* --- plant --- */
  D("tempeh",    "Tempeh",                   "protein", "100 g",   {}, { k:195, p:19, pg:"plant",
      note: "Fermented, which breaks the GOS down. Far gentler than the soybeans it is made from." }),
  D("soychunks", "Soya chunks / Nutrela",    "protein", "50 g dry",{ gos:.90 }, { k:180, p:26, pg:"plant",
      note: "Excellent protein per rupee and high in GOS. Soak, boil, squeeze and rinse hard, and it drops a long way." }),
  D("seitan",    "Seitan / Wheat gluten",    "protein", "100 g",   {}, { k:370, p:75, pg:"plant",
      note: "Gluten is a protein, not a FODMAP, and the fructans wash out with the starch. Low FODMAP, but obviously not if you have coeliac disease." }),
  D("hemp",      "Hemp seeds",               "protein", "3 tbsp",  {}, { free:1, k:170, p:10, pg:"plant" }),
  D("sattu",     "Sattu / Roasted gram flour","protein","30 g",    { gos:.50 }, { k:110, p:6,  pg:"plant",
      note: "Made from chana, so it carries GOS. A small glass is usually manageable; a big one is not." }),
  D("nutyeast",  "Nutritional yeast",        "protein", "2 tbsp",  {}, { free:1, k:45,  p:8,  pg:"plant" }),
  D("spirulina", "Spirulina",                "protein", "1 tbsp",  {}, { free:1, k:20,  p:4,  pg:"plant" }),

  /* --- powders and supplements --- */
  D("wheyhydro", "Whey hydrolysate",         "protein", "1 scoop", {}, { free:1, k:110, p:25, pg:"powder",
      note: "Pre-digested and lactose-free. The gentlest whey, and the most expensive." }),
  D("casein",    "Micellar casein",          "protein", "1 scoop", { lactose:.80 }, { k:120, p:24, pg:"powder",
      note: "Slow-digesting, so it sits longer. Fine for most people, but it holds a little more lactose than isolate." }),
  D("soyiso",    "Soy protein isolate",      "protein", "1 scoop", {}, { free:1, k:110, p:25, pg:"powder",
      note: "Isolated protein, so the GOS of the whole bean is gone. Nothing like eating soy chunks." }),
  D("peaprotein","Pea protein isolate",      "protein", "1 scoop", {}, { free:1, k:110, p:24, pg:"powder",
      note: "Peas are high in GOS. Pea protein isolate is not, because the processing strips the carbohydrate out. One of the best options if you avoid dairy." }),
  D("riceprotein","Rice protein",            "protein", "1 scoop", {}, { free:1, k:110, p:22, pg:"powder" }),
  D("eaa",       "EAA or BCAA powder",       "protein", "1 scoop", {}, { free:1, k:20,  p:0,  pg:"powder",
      note: "No fermentable content. Usually sweetened with sucralose, which is fine." }),
  D("creatine",  "Creatine monohydrate",     "protein", "5 g",     {}, { free:1, k:0,   p:0,  pg:"powder",
      note: "No FODMAPs, no calories, and the best-evidenced supplement in the gym. Nothing to do with your gut." }),
  D("proteinbar","Protein bar, typical",     "protein", "1 bar",   { fructan:.55, fructose:.25, sorbitol:.30 }, { k:220, p:20, pg:"powder",
      note: "Often the worst thing in the bag. Chicory root fibre, date paste and maltitol all at once. Read it with the label reader before you trust it." })
];
DISHES.push(...PROTEINS);


const PGROUPS = [
  ["all",    "Everything"],
  ["animal", "Meat, fish & eggs"],
  ["dairy",  "Dairy"],
  ["plant",  "Plant"],
  ["powder", "Powders"]
];
DISHES.push(...FUEL_FOODS);
CATS.push(["protein", "Fuel & protein", ["protein"]]);

/* attach calories and protein to everything */
DISHES.forEach(d => {
  if (NUTRI[d.id]) { d.k = NUTRI[d.id][0]; d.p = NUTRI[d.id][1]; }
  if (d.k === undefined) { d.k = 0; d.p = 0; }
});

/* group the fuel foods defined above alongside the protein list. This has to
   run after every push, or the items pushed later never get tagged. */
const PG = { anda:"animal", andasafed:"animal", chicken:"animal", machli:"animal", mutton:"animal",
  wheyiso:"powder", wheyconc:"powder", gainer:"powder", tofu:"plant", peanutbtr:"plant",
  tel:"plant", aloobread:"plant", darkchoc:"plant" };
DISHES.forEach(d => { if (PG[d.id]) d.pg = PG[d.id]; });

/* ==========================================================================
   THE LABEL READER
   No lab data needed. Everything that matters on an Indian packet is
   recognisable by name, and half the job is telling people that the
   frightening-sounding ingredients are fine.
   ========================================================================== */

const LABEL_RULES = [
  /* --- fructans --- */
  { re: /\binulin\b/i,                              ch: "fructan", lvl: "high", why: "Pure fructan, added for the fibre claim." },
  { re: /chicory\s*(root)?/i,                       ch: "fructan", lvl: "high", why: "Chicory root is where inulin comes from." },
  { re: /\b(fos|fructo-?oligosaccharide)/i,         ch: "fructan", lvl: "high", why: "Fructo-oligosaccharide. Fructan by another name." },
  { re: /oligofructose/i,                           ch: "fructan", lvl: "high", why: "Another name for the same thing." },
  { re: /onion\s*(powder|extract|solids)?/i,        ch: "fructan", lvl: "high", why: "The most common hidden trigger in Indian packaged food." },
  { re: /\b(garlic)\s*(powder|extract)?/i,          ch: "fructan", lvl: "high", why: "Same story as onion." },
  { re: /\b(wheat|atta|maida|semolina|suji|rava|refined flour)\b/i, ch: "fructan", lvl: "high", why: "Wheat in any form carries fructans." },
  { re: /\b(rye|barley|jau|malt extract)\b/i,       ch: "fructan", lvl: "high", why: "Both are fructan sources." },
  { re: /\bshallot|leek\b/i,                        ch: "fructan", lvl: "high", why: "Same family as onion, same problem." },
  /* --- GOS --- */
  { re: /\b(besan|gram flour|chickpea flour|bengal gram)\b/i, ch: "gos", lvl: "high", why: "Gluten-free but high in GOS." },
  { re: /\b(soy|soya)\s*(flour|grits|bean|chunks|granules|protein concentrate)\b/i, ch: "gos", lvl: "watch", why: "Soy flour and soy chunks are high. Soy protein isolate and lecithin are not." },
  { re: /\b(cashew|kaju)\b/i,                       ch: "gos", lvl: "high", why: "High in GOS, and the usual thickener in creamy gravies." },
  { re: /\bpistachio|pista\b/i,                     ch: "gos", lvl: "high", why: "High in GOS." },
  { re: /\b(lentil|dal|dhal|urad|chana|rajma|bean)\b/i, ch: "gos", lvl: "watch", why: "Pulses carry GOS. How much depends on the amount." },
  /* --- lactose --- */
  { re: /milk\s*(solids|powder|permeate)/i,         ch: "lactose", lvl: "high", why: "Concentrated milk sugar." },
  { re: /\b(khoya|mawa|condensed milk|evaporated milk)\b/i, ch: "lactose", lvl: "high", why: "Milk boiled down, so lactose is concentrated." },
  { re: /whey\s*(powder|concentrate|solids)/i,      ch: "lactose", lvl: "high", why: "Whey concentrate keeps its lactose. Isolate does not." },
  { re: /\b(lactose)\b/i,                           ch: "lactose", lvl: "high", why: "Named outright." },
  { re: /\b(cream|butter\s*milk\s*solids|paneer|cheese)\b/i, ch: "lactose", lvl: "watch", why: "Small amounts are usually fine. Hard cheese is essentially lactose-free." },
  /* --- excess fructose --- */
  { re: /high\s*fructose|hfcs|fructose\s*syrup/i,   ch: "fructose", lvl: "high", why: "More fructose than glucose, which is exactly the problem." },
  { re: /\b(honey|shahad|agave)\b/i,                ch: "fructose", lvl: "high", why: "Excess fructose." },
  { re: /\b(apple|pear)\s*juice\s*(concentrate)?/i, ch: "fructose", lvl: "high", why: "Used as a 'natural' sweetener. Both are high." },
  { re: /\b(date|khajur|fig|anjeer)s?\s*(paste|syrup|powder)?\b/i, ch: "fructose", lvl: "high", why: "Dates hide in chutneys, bars and 'no added sugar' sweets." },
  { re: /fruit\s*juice\s*concentrate/i,             ch: "fructose", lvl: "watch", why: "Depends on the fruit, and the label rarely says." },
  /* --- polyols --- */
  { re: /\b(sorbitol|e\s*-?420|ins\s*420)\b/i,      ch: "sorbitol", lvl: "high", why: "A polyol, and a laxative at modest doses." },
  { re: /\b(mannitol|e\s*-?421|ins\s*421)\b/i,      ch: "mannitol", lvl: "high", why: "A polyol." },
  { re: /\b(maltitol|e\s*-?965|ins\s*965)\b/i,      ch: "sorbitol", lvl: "high", why: "The usual sweetener in sugar-free chocolate." },
  { re: /\b(xylitol|e\s*-?967|ins\s*967)\b/i,       ch: "sorbitol", lvl: "high", why: "Common in sugar-free gum and mints." },
  { re: /\b(isomalt|e\s*-?953|lactitol|e\s*-?966)\b/i, ch: "sorbitol", lvl: "high", why: "Polyol." },
  { re: /\bpolydextrose\b/i,                        ch: "fructan", lvl: "watch", why: "Tolerated better than inulin, but it is still a bulk fibre." },
  /* --- the reassurance list, which is half the point --- */
  { re: /\bmaltodextrin\b/i,                        ch: null, lvl: "fine", why: "Sounds alarming, is a glucose chain. Absorbed normally." },
  { re: /\b(dextrose|glucose\s*syrup|corn syrup solids)\b/i, ch: null, lvl: "fine", why: "Glucose. No fermentable load." },
  { re: /\b(erythritol|e\s*-?968)\b/i,              ch: null, lvl: "fine", why: "The one polyol that is mostly absorbed before it can ferment. Usually well tolerated." },
  { re: /\b(sucralose|aspartame|saccharin|stevia|acesulfame)\b/i, ch: null, lvl: "fine", why: "Not fermentable." },
  { re: /\b(xanthan|guar)\s*gum\b/i,                ch: null, lvl: "fine", why: "Fine in the amounts used to thicken food." },
  { re: /\b(soy\s*lecithin|e\s*-?322)\b/i,          ch: null, lvl: "fine", why: "An emulsifier. No FODMAPs left in it." },
  { re: /\b(rice flour|corn ?starch|corn flour|tapioca|potato starch)\b/i, ch: null, lvl: "fine", why: "Low FODMAP starch." },
  { re: /\b(citric acid|ascorbic|sodium|salt|turmeric|cumin|coriander|pepper|cardamom|cinnamon|clove)\b/i, ch: null, lvl: "fine", why: "No fermentable content." },
  { re: /\b(sugar|sucrose|cane sugar|jaggery)\b/i,  ch: null, lvl: "fine", why: "Plain sucrose splits evenly into glucose and fructose, so there is no excess fructose." },
  { re: /\b(whey\s*(protein\s*)?isolate|soy protein isolate)\b/i, ch: null, lvl: "fine", why: "Filtered until the sugars are gone." }
];

/* ==========================================================================
   STREET FOOD, PACKAGED FOOD, AND VEGETARIAN PROTEIN
   `harm` names what actually causes the trouble. `swap` is the nearest thing
   that does not. Blame the ingredient, not the dish.
   ========================================================================== */

const MORE2 = [
  /* --- STREET: north and Delhi ------------------------------------------- */
  D("alootikki",  "Aloo Tikki Chaat",       "street", "2 pieces", { fructan:.45, gos:.30, fructose:.30 }, { k:280, p:5,
      harm: "The potato is innocent. It is the meethi chutney (dates and tamarind), the garlic in the green chutney, and the raw onion on top.",
      swap: "Ask for it without meethi chutney and without onion. Curd and coriander instead." }),
  D("cholekulche","Chole Kulche",           "street", "1 plate",  { fructan:1.60, gos:1.30 }, { k:550, p:15,
      harm: "Chana for the GOS, maida kulcha for the fructans, onion in the masala. All three at once.",
      swap: "Chole with rice instead of kulcha halves it. Order the chole Jain." }),
  D("kachorisabzi","Kachori Sabzi",         "street", "2 pieces", { fructan:.90, gos:.80 }, { k:450, p:9,
      harm: "Maida shell, moong or urad filling, onion-heavy aloo sabzi.", swap: "Poha or plain paratha with curd." }),
  D("rajkachori", "Raj Kachori",            "street", "1 piece",  { fructan:1.10, gos:.90, fructose:.35 }, { k:400, p:9,
      harm: "Everything on this list in one shell: chana, sprouts, meethi chutney, onion.",
      swap: "Dahi puri without meethi chutney is the gentler chaat." }),
  D("papdichaat", "Papdi Chaat",            "street", "1 plate",  { fructan:.80, gos:.25, fructose:.40 }, { k:300, p:6,
      harm: "Maida papdi and the date chutney.", swap: "Ask for extra curd, no meethi chutney." }),
  D("dahibhalla", "Dahi Bhalla",            "street", "2 pieces", { gos:.70, lactose:2.50, fructose:.35 }, { k:320, p:8,
      harm: "Urad dal for GOS, a lot of curd for lactose, date chutney for fructose.",
      swap: "One bhalla, less curd, no meethi chutney." }),
  D("aloochaat",  "Aloo Chaat",             "street", "1 plate",  { fructan:.35, fructose:.25 }, { k:250, p:4,
      harm: "Only the chutneys and onion. The potato is fine.",
      swap: "One of the safer chaats if you skip the meethi chutney." }),
  D("ramladoo",   "Ram Ladoo",              "street", "1 plate",  { gos:.85, fructan:.30 }, { k:300, p:8,
      harm: "Moong dal batter, and the grated radish on top adds fructans.", swap: "Half a plate, no extra chutney." }),
  D("matarkulcha","Matar Kulcha",           "street", "1 plate",  { fructan:1.30, gos:.60 }, { k:400, p:11,
      harm: "White peas are high in GOS and the kulcha is maida.", swap: "Hard to rescue. Aloo chaat instead." }),
  D("momosveg",   "Momos, veg",             "street", "6 pieces", { fructan:.85 }, { k:250, p:7,
      harm: "Maida wrapper plus cabbage, onion and garlic in the filling. The red chutney is garlic too.",
      swap: "Chicken momos carry a little less, and skip the red chutney." }),
  D("momoschick", "Momos, chicken",         "street", "6 pieces", { fructan:.70 }, { k:280, p:14,
      harm: "The wrapper and the onion-garlic in the mince.", swap: "Skip the red chutney, which is nearly pure garlic." }),
  D("springroll", "Spring Roll",            "street", "2 pieces", { fructan:.95 }, { k:300, p:6,
      harm: "Maida sheet, cabbage, onion, garlic.", swap: "Nothing close. Have a plain dosa." }),
  D("honeychilli","Honey Chilli Potato",    "street", "1 plate",  { fructan:.70, fructose:.45 }, { k:380, p:5,
      harm: "Honey for excess fructose, garlic and onion in the sauce.", swap: "Plain salted fries are boring and clean." }),
  D("kathiroll",  "Kathi Roll, veg",        "street", "1 roll",   { fructan:.90 }, { k:420, p:12,
      harm: "Maida paratha and the onion inside.", swap: "Ask for no onion and it drops a long way." }),
  D("eggroll",    "Egg Roll",               "street", "1 roll",   { fructan:.75 }, { k:400, p:14,
      harm: "The paratha and the onion. The egg is free.", swap: "No onion. Egg bhurji with rice is cleaner still." }),
  D("breadpakora","Bread Pakora",           "street", "2 pieces", { fructan:.95, gos:.40 }, { k:350, p:7,
      harm: "Bread for fructans, besan batter for GOS.", swap: "Batata vada uses the same batter but no bread." }),
  D("dahipuri",   "Dahi Puri",              "street", "6 pieces", { fructan:.60, fructose:.40, lactose:1.80 }, { k:280, p:6,
      harm: "Meethi chutney and curd.", swap: "Without meethi chutney this is one of the better chaats." }),
  D("sevpuri",    "Sev Puri",               "street", "6 pieces", { fructan:.70, gos:.20, fructose:.40 }, { k:280, p:5,
      harm: "Sev is besan, and the meethi chutney has dates.", swap: "No meethi chutney, no onion." }),
  D("ragda",      "Ragda Pattice",          "street", "1 plate",  { fructan:.40, gos:1.20 }, { k:380, p:11,
      harm: "Ragda is white peas. That is almost all of the load.", swap: "The pattice on its own with curd." }),
  D("chanachaat", "Chana Chaat",            "street", "1 katori", { fructan:.25, gos:1.30 }, { k:250, p:10,
      harm: "Chana, straightforwardly.", swap: "Sprouted and well rinsed it drops by about half. Or fruit chaat." }),
  D("fruitchaat", "Fruit Chaat",            "street", "1 katori", { fructose:.55 }, { k:150, p:2,
      harm: "Depends entirely on the fruit. Apple, mango and watermelon are the high ones.",
      swap: "Papaya, pineapple, guava and orange make a clean version." }),
  D("jhalmuri",   "Jhal Muri",              "street", "1 packet", { fructan:.30 }, { k:200, p:4,
      harm: "Only the onion and a little chana.", swap: "One of the gentlest street snacks. Ask for no onion." }),

  /* --- STREET: west --------------------------------------------------- */
  D("dabeli",     "Dabeli",                 "street", "1 piece",  { fructan:.85, gos:.25, fructose:.35 }, { k:350, p:7,
      harm: "Pav for fructans, dabeli masala for onion and garlic, and the date chutney.",
      swap: "Batata vada without the pav." }),
  D("frankie",    "Frankie",                "street", "1 roll",   { fructan:.95 }, { k:400, p:10,
      harm: "Maida roti, onion, and the masala.", swap: "No onion, and the load nearly halves." }),
  D("vegsandwich","Grilled Veg Sandwich",   "street", "1 round",  { fructan:.75 }, { k:300, p:8,
      harm: "Bread and the green chutney, which is usually garlic.", swap: "Ask for no chutney, extra tomato and cucumber." }),
  D("batatavada", "Batata Vada",            "street", "2 pieces", { fructan:.30, gos:.45 }, { k:280, p:5,
      harm: "Besan batter for GOS and garlic in the filling.", swap: "Sabudana vada instead. Much gentler." }),
  D("sabudanavada","Sabudana Vada",         "street", "2 pieces", { fructan:.10, gos:.15 }, { k:300, p:5,
      harm: "Very little. Sabudana and peanut are both clean.", swap: "Already one of the best fried things you can order." }),
  D("kandapoha",  "Kanda Poha",             "street", "1 plate",  { fructan:.55 }, { k:280, p:5,
      harm: "Only the onion. Poha itself is free.", swap: "Plain poha without onion is close to zero load." }),
  D("usalpav",    "Usal Pav",               "street", "1 plate",  { fructan:.85, gos:1.10 }, { k:420, p:13,
      harm: "Sprouted matki for GOS and pav for fructans.", swap: "Sprouts help, but this is a heavy one." }),

  /* --- STREET: south --------------------------------------------------- */
  D("ravadosa",   "Rava Dosa",              "street", "1 piece",  { fructan:.55 }, { k:250, p:5,
      harm: "Rava is wheat, so this one is not like a rice dosa.", swap: "Plain dosa or set dosa." }),
  D("setdosa",    "Set Dosa",               "street", "3 pieces", { fructan:.10, gos:.25 }, { k:280, p:6,
      harm: "Very little. Fermented rice and urad.", swap: "Already a good choice." }),
  D("appam",      "Appam",                  "street", "2 pieces", { fructan:.05 }, { k:200, p:3,
      harm: "Almost nothing. Rice and coconut, fermented.", swap: "One of the cleanest breakfasts in the country." }),
  D("puttu",      "Puttu",                  "street", "1 serve",  { fructan:.05 }, { k:250, p:5,
      harm: "Rice flour and coconut. Clean.", swap: "Skip the kadala curry beside it, which is black chana." }),
  D("bonda",      "Mysore Bonda",           "street", "3 pieces", { fructan:.25, gos:.50 }, { k:260, p:5,
      harm: "Urad and maida.", swap: "Medu vada is similar; neither is light." }),
  D("mirchibajji","Mirchi Bajji",           "street", "2 pieces", { gos:.55, fructan:.20 }, { k:280, p:6,
      harm: "Besan batter.", swap: "Banana bajji uses the same batter with a gentler filling." }),

  /* --- STREET: east ---------------------------------------------------- */
  D("ghugni",     "Ghugni",                 "street", "1 katori", { fructan:.35, gos:1.30 }, { k:280, p:12,
      harm: "Dried peas, which are high GOS.", swap: "Soak overnight, discard the water, rinse hard." }),
  D("telebhaja",  "Telebhaja",              "street", "3 pieces", { gos:.50 }, { k:280, p:5,
      harm: "Besan batter.", swap: "Rice flour batter if you are making it at home." }),
  D("litti",      "Litti Chokha",           "street", "2 pieces", { fructan:.60, gos:.70 }, { k:400, p:12,
      harm: "Sattu is roasted chana, and the atta shell adds fructans. Onion and garlic in the chokha.",
      swap: "Chokha alone with rice, made without onion." }),

  /* --- STREET: gujarati and rajasthani ---------------------------------- */
  D("khaman",     "Khaman",                 "street", "1 plate",  { fructan:.10, gos:.60 }, { k:200, p:8,
      harm: "Besan, though fermenting takes some of the edge off.", swap: "Dhokla is the same family. Keep the portion small." }),
  D("khandvi",    "Khandvi",                "street", "1 plate",  { gos:.50, lactose:.60 }, { k:180, p:6,
      harm: "Besan and curd.", swap: "Small serving. It is light in every other way." }),
  D("fafda",      "Fafda Jalebi",           "street", "1 plate",  { fructan:.75, gos:.70 }, { k:520, p:8,
      harm: "Besan fafda and maida jalebi together. Both channels at once.", swap: "One or the other, not both." }),
  D("pyazkachori","Pyaz Kachori",           "street", "1 piece",  { fructan:1.20, gos:.55 }, { k:380, p:7,
      harm: "It is named after the onion. That is the whole problem.", swap: "Mirchi vada or a plain kachori." }),

  /* --- STREET: Indo-Chinese and other ----------------------------------- */
  D("chillipaneer","Chilli Paneer",         "street", "1 plate",  { fructan:.85, lactose:.35 }, { k:380, p:16,
      harm: "Garlic, onion and soy sauce. The paneer is fine.", swap: "Ask for no onion and no garlic. Good protein otherwise." }),
  D("vegfriedrice","Veg Fried Rice",        "street", "1 plate",  { fructan:.70 }, { k:380, p:7,
      harm: "Spring onion bulb, garlic, cabbage.", swap: "Ask for green tops only and no garlic. Rice itself is free." }),
  D("manchowsoup","Manchow Soup",           "street", "1 bowl",   { fructan:.65 }, { k:150, p:4,
      harm: "Garlic, onion and the fried noodles on top.", swap: "Clear soup with no garlic." }),
  D("amritsari",  "Amritsari Kulcha",       "street", "1 piece",  { fructan:1.40 }, { k:400, p:9,
      harm: "Maida, and a lot of it.", swap: "Rice with the same sabzi." }),
  D("shawarma",   "Shawarma",               "street", "1 roll",   { fructan:.80 }, { k:450, p:20,
      harm: "Pita and the garlic sauce. The meat is free.", swap: "Ask for the meat in a bowl with rice, no garlic sauce." }),
  D("eggbhurji",  "Egg Bhurji Pav",         "street", "1 plate",  { fructan:.70 }, { k:380, p:16,
      harm: "Onion in the bhurji and pav for fructans.", swap: "Bhurji without onion, with rice. Excellent protein then." }),
  D("maggi",      "Instant Noodles, masala","street", "1 packet", { fructan:1.10 }, { k:350, p:8,
      harm: "Wheat noodles, and the tastemaker is largely onion and garlic powder.",
      swap: "Rice noodles with your own tadka of hing, cumin and chilli." }),
  D("cornchaat",  "Corn Chaat",             "street", "1 katori", { fructan:.35, sorbitol:.25 }, { k:180, p:5,
      harm: "Sweet corn carries both fructans and sorbitol, and the onion adds more.", swap: "Half a serving, no onion." }),
  D("bhuttaroast","Roasted Bhutta",         "street", "1 cob",    { fructan:.36, sorbitol:.24 }, { k:150, p:5,
      harm: "A whole cob is a lot of corn. Half is fine.", swap: "Half a cob with lemon and chilli." }),
  D("peanutchaat","Peanut Chaat",           "street", "1 katori", { fructan:.35 }, { k:250, p:10,
      harm: "Only the onion. Peanuts are clean and high in protein.", swap: "No onion, and this becomes an excellent snack." }),

  /* --- PACKAGED --------------------------------------------------------- */
  D("rusk",       "Rusk / Toast",           "packaged","3 pieces", { fructan:.70 }, { k:180, p:4,
      harm: "Wheat.", swap: "Rice crackers or murmura." }),
  D("marie",      "Marie / Glucose biscuits","packaged","4 pieces",{ fructan:.45 }, { k:150, p:2,
      harm: "Maida.", swap: "Rice crackers, or makhana." }),
  D("creambiscuit","Cream biscuits",        "packaged","3 pieces", { fructan:.55, lactose:.80 }, { k:220, p:2,
      harm: "Maida and milk solids in the cream.", swap: "Dark chocolate, which is cleaner than it looks." }),
  D("digestive",  "Digestive biscuits",     "packaged","3 pieces", { fructan:.85 }, { k:210, p:3,
      harm: "Wholewheat, and many brands add chicory root fibre for the fibre claim, which is nearly pure fructan.",
      swap: "Read the label. If it says chicory or inulin, put it back." }),
  D("bhujia",     "Bhujia / Sev",           "packaged","30 g",     { gos:.85 }, { k:170, p:4,
      harm: "Besan, which is high GOS.", swap: "Plain salted peanuts, or murmura chivda made with rice." }),
  D("aloobhujia", "Aloo Bhujia",            "packaged","30 g",     { gos:.45, fructan:.35 }, { k:170, p:3,
      harm: "Besan and onion powder.", swap: "Plain potato chips are genuinely cleaner." }),
  D("chipsplain", "Potato chips, salted",   "packaged","30 g",     {}, { free:1, k:160, p:2,
      harm: "Nothing fermentable. Potato, oil and salt.", swap: "This is the safe packet in the shop." }),
  D("chipsmasala","Potato chips, masala",   "packaged","30 g",     { fructan:.40 }, { k:160, p:2,
      harm: "The seasoning, which is onion and garlic powder.", swap: "The plain salted version of the same packet." }),
  D("nachos",     "Nachos / Corn chips",    "packaged","30 g",     { fructan:.10 }, { k:150, p:2,
      harm: "Little, if they are plain corn. Cheese and salsa dips are the risk.", swap: "Plain, with guacamole rather than salsa." }),
  D("popcornplain","Popcorn, salted",       "packaged","3 cups",   {}, { free:1, k:110, p:3,
      harm: "Nothing.", swap: "One of the best snacks available to you." }),
  D("popcorncaramel","Popcorn, caramel",    "packaged","2 cups",   { fructose:.20 }, { k:200, p:2,
      harm: "The syrup, if it is corn syrup based.", swap: "Salted popcorn." }),
  D("whitebread", "White bread",            "packaged","2 slices", { fructan:.60 }, { k:150, p:5,
      harm: "Wheat.", swap: "Sourdough, where long fermentation breaks the fructans down." }),
  D("multigrain", "Multigrain bread",       "packaged","2 slices", { fructan:.95 }, { k:170, p:6,
      harm: "Sounds healthier and is usually worse. More grains, and often added inulin.",
      swap: "Sourdough, or plain white if that is the choice." }),
  D("sourdough",  "Sourdough bread",        "packaged","2 slices", { fructan:.25 }, { k:150, p:5,
      harm: "Some fructans survive, but far fewer.", swap: "The best bread on the shelf for this." }),
  D("ketchup",    "Tomato ketchup",         "packaged","2 tbsp",   { fructan:.30, fructose:.35 }, { k:40, p:0,
      harm: "Onion and garlic powder, and often high-fructose corn syrup.", swap: "Plain tomato puree with your own salt and chilli." }),
  D("mayo",       "Mayonnaise",             "packaged","2 tbsp",   {}, { free:1, k:190, p:0,
      harm: "Plain mayo is oil and egg. Garlic mayo is not.", swap: "Read which one you are buying." }),
  D("papad",      "Papad",                  "packaged","2 pieces", { gos:.55 }, { k:70, p:4,
      harm: "Urad dal, and the hing is compounded with wheat flour.", swap: "Rice papad, which is widely sold." }),
  D("instantsoup","Instant soup packet",    "packaged","1 packet", { fructan:.85 }, { k:70, p:2,
      harm: "Onion and garlic powder are the first flavour ingredients in nearly all of them.",
      swap: "Clear rasam, or a home stock with hing." }),
  D("rtecurry",   "Ready-to-eat curry pouch","packaged","1 pouch", { fructan:.95, gos:.40 }, { k:280, p:8,
      harm: "Onion and garlic paste as the base, sometimes cashew for thickness.", swap: "Very few of these work. Cook a Jain base and freeze it." }),
  D("cornflakes", "Corn flakes",            "packaged","1 katori", { fructan:.10 }, { k:150, p:3,
      harm: "Very little, if plain.", swap: "A good clean breakfast with lactose-free milk." }),
  D("wheatflakes","Wheat flakes",           "packaged","1 katori", { fructan:.55 }, { k:150, p:4,
      harm: "Wheat.", swap: "Corn flakes or poha." }),
  D("muesli",     "Muesli",                 "packaged","1 katori", { fructan:.90, fructose:.45 }, { k:250, p:6,
      harm: "The worst breakfast in the shop: wheat, raisins, dates, honey and often inulin, all together.",
      swap: "Poha, or corn flakes with a firm banana." }),
  D("granola",    "Granola",                "packaged","1 katori", { fructan:.70, fructose:.40 }, { k:280, p:6,
      harm: "Oats in quantity, plus honey or date syrup as the binder.", swap: "Plain oats, half a katori, with peanut butter." }),
  D("fruitjuice", "Fruit juice, tetra pack","packaged","1 glass",  { fructose:.50 }, { k:120, p:0,
      harm: "Apple and pear concentrate are the cheap sweeteners, and both are high in fructose.",
      swap: "Nimbu pani, or fresh orange." }),
  D("flavyogurt", "Flavoured yoghurt",      "packaged","1 cup",    { lactose:5.00, fructose:.25 }, { k:150, p:5,
      harm: "Lactose plus fruit syrup.", swap: "Hung curd with fresh fruit you choose yourself." }),
  D("icecream",   "Ice cream",              "packaged","1 scoop",  { lactose:4.00, fructan:.20 }, { k:200, p:3,
      harm: "Lactose, and some brands add inulin as a fat replacer.", swap: "Sorbet, or a small dark chocolate." }),
  D("milkchoc",   "Milk chocolate",         "packaged","30 g",     { lactose:1.50 }, { k:160, p:2,
      harm: "Milk solids.", swap: "Dark chocolate at 70 percent or above." }),
  D("sugarfreemint","Sugar-free mints",     "packaged","5 mints",  { sorbitol:.70 }, { k:20, p:0,
      harm: "Sorbitol and maltitol. These are laxatives at modest doses and people eat them all day.",
      swap: "Saunf, or a plain mint made with sugar." }),
  D("sugarfreegum","Sugar-free chewing gum","packaged","3 pieces", { sorbitol:.85 }, { k:15, p:0,
      harm: "Polyols, and chewing swallows air on top of it.", swap: "Stop chewing gum. It is one of the easiest wins there is." }),
  D("coffeemix",  "Instant coffee premix",  "packaged","1 sachet", { lactose:2.20 }, { k:90, p:2,
      harm: "The creamer is milk solids.", swap: "Black coffee, or coffee with lactose-free milk." }),
  D("maltdrink",  "Malt health drink powder","packaged","2 tbsp",  { fructan:.95 }, { k:120, p:3,
      harm: "Barley malt extract, which is a fructan. The tin says it is good for digestion; for you it is not.",
      swap: "Plain lactose-free milk with a spoon of sugar and cocoa." }),
  D("jam",        "Jam",                    "packaged","1 tbsp",   { fructose:.40 }, { k:55, p:0,
      harm: "The fruit, and often added fructose syrup.", swap: "Peanut butter." }),
  D("oatsmasala", "Masala oats packet",     "packaged","1 packet", { fructan:.70 }, { k:180, p:5,
      harm: "The masala sachet is onion and garlic powder.", swap: "Plain oats with your own hing tadka." }),
  D("dosabatterpk","Packaged dosa batter",  "packaged","1 dosa",   { fructan:.06, gos:.18 }, { k:170, p:4,
      harm: "Very little. Fermentation does the work.", swap: "A reliable clean option to keep in the fridge." }),
  D("frozenparatha","Frozen paratha",       "packaged","1 piece",  { fructan:.60 }, { k:220, p:5,
      harm: "Wheat.", swap: "Frozen dosa, or rice." }),
  D("mixture",    "Namkeen mixture",        "packaged","30 g",     { gos:.70, fructan:.30 }, { k:170, p:4,
      harm: "Besan sev, fried dal, and onion powder.", swap: "Murmura chivda with peanuts and curry leaves." }),

  /* --- VEGETARIAN PROTEIN ------------------------------------------------ */
  D("moongsprout","Moong sprouts",          "protein", "1 katori", { gos:.30 }, { k:100, p:7, pg:"plant", veg:1,
      note: "Sprouting for two to three days breaks a good part of the GOS down. Far gentler than the whole bean." }),
  D("matkisprout","Matki sprouts",          "protein", "1 katori", { gos:.40 }, { k:110, p:8, pg:"plant", veg:1 }),
  D("chanasprout","Chana sprouts",          "protein", "1 katori", { gos:.70 }, { k:130, p:9, pg:"plant", veg:1 }),
  D("bhunachana", "Bhuna chana / Roasted gram","protein","30 g",   { gos:.80 }, { k:130, p:7, pg:"plant", veg:1,
      note: "Cheap and very high in protein, but it is chana, so the GOS comes with it. Keep the handful small." }),
  D("makhana",    "Makhana / Fox nuts",     "protein", "30 g",     {}, { free:1, k:110, p:3, pg:"plant", veg:1,
      note: "Roast them in ghee with salt. No fermentable load at all, and one of the few Indian snacks that is genuinely free." }),
  D("besanchilla","Besan chilla",           "protein", "2 pieces", { gos:.55 }, { k:200, p:9, pg:"plant", veg:1,
      note: "Good protein, but besan carries GOS." }),
  D("moongchilla","Moong dal chilla",       "protein", "2 pieces", { gos:.25 }, { k:190, p:10, pg:"plant", veg:1,
      note: "The better chilla. Moong is the gentlest pulse and this is real protein." }),
  D("paneerbhurji","Paneer bhurji",         "protein", "1 katori", { lactose:.30 }, { k:280, p:18, pg:"dairy", veg:1,
      note: "Made without onion this is close to a perfect meal for you: high protein, almost no load." }),
  D("silkentofu", "Tofu, silken",           "protein", "100 g",    { gos:.55 }, { k:60, p:6, pg:"plant", veg:1,
      note: "Not the same as firm tofu. Silken is not pressed, so the GOS stays in." }),
  D("soygranule", "Soya granules",          "protein", "50 g dry", { gos:.90 }, { k:180, p:26, pg:"plant", veg:1,
      note: "Same as chunks. Soak, boil, squeeze and rinse to bring it down." }),
  D("broccoli",   "Broccoli",               "protein", "1 katori", { fructan:.25 }, { k:35, p:3, pg:"plant", veg:1,
      note: "The heads are fine in a normal serving. The stalks carry most of the fructans." }),
  D("greenpeaspr","Green peas",             "protein", "1 katori", { fructan:.30, gos:.35 }, { k:80, p:5, pg:"plant", veg:1 }),
  D("mushroompr", "Mushroom",               "protein", "1 katori", { mannitol:.65 }, { k:22, p:3, pg:"plant", veg:1,
      note: "Good protein for the calories and high in mannitol. Oyster mushrooms are the low-FODMAP exception." }),
  D("amaranthpr", "Rajgira / Amaranth",     "protein", "1 katori", { fructan:.45, gos:.30 }, { k:180, p:7, pg:"plant", veg:1,
      note: "Assumed safe because it is gluten-free. It is not." }),
  D("quinoapr",   "Quinoa",                 "protein", "1 katori", {}, { free:1, k:220, p:8, pg:"plant", veg:1,
      note: "Complete protein, no fermentable load, cooks like rice." }),
  D("milkpr",     "Milk",                   "protein", "1 glass",  { lactose:12.0 }, { k:150, p:8, pg:"dairy", veg:1 }),
  D("dahipr",     "Dahi / Curd",            "protein", "1 katori", { lactose:6.0 }, { k:120, p:7, pg:"dairy", veg:1 })
];
DISHES.push(...MORE2);

CATS.push(["packaged", "Packaged", ["packaged"]]);

/* mark what a vegetarian in India can eat: no meat, no fish, no egg */
const NONVEG = new Set(["animal"]);
DISHES.forEach(d => {
  if (d.pg && d.veg === undefined) d.veg = NONVEG.has(d.pg) ? 0 : 1;
});
