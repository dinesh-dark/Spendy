// bill-parser.mjs - Self-Verifying Bilingual Gemini + Local Receipt Parser (v3: accuracy fixes + standard product names)

export const UNITS = ["kg", "g", "L", "ml", "pcs"];
export const CATS = [
  "Vegetables", "Fruits", "Grains", "Dairy", "Grocery",
  "Meat & fish", "Household", "Personal care", "Dining & Outing",
  "Bills & Utilities", "Healthcare", "Shopping", "Education", "Miscellaneous"
];

// Tried in order. If a model is retired / not available to your key / rate-limited / overloaded, the next one is used.
// (Gemini 2.5 models are now restricted to existing users, so they are no longer listed.)
export const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

/* ------------------------------------------------------------------ *
 * LINE-LEVEL REJECT PATTERNS (non-item lines on a receipt)
 * Latin words now use \b word boundaries so real products are no longer
 * rejected by accident (Cinthol, Cinnamon, Sachet, Tin, Headphones ...).
 * Totals / GST / dates / times are now rejected too.
 * ------------------------------------------------------------------ */
export const REJECT_PATTERNS = [
  /\bno\b[\s.:-]*\d+/i,
  /\b(road|rd|street|st|nagar|salai|lane|pallavaram|chennai|tamil\s*nadu|pincode)\b/i,
  /\bpin[\s.:-]*\d{6}\b/i,
  /தெரு|சாலை|நகர்|சென்னை|பல்லாவரம்|விலாசம்|அஞ்சல்/,
  /\b(bill\s*no|bill\s*number|inv\.?\s*no|invoice|estimate|cash\s*bill|memo|counter)\b/i,
  /ரசீது\s*எண்|பில்\s*எண்|விலைப்பட்டியல்/,
  /\b(phone|mobile|mob|cell|tel|ph)\b[\s.:-]*\d*/i,
  /தொலைபேசி|அலைபேசி/,
  /\b(gstin|gst\s*no|tin|fssai|cin|pan\s*no|hsn|sac)\b/i,
  /\b(paid|returned|change|balance|round\s*off|rounding|sub\s*total|grand\s*total)\b/i,
  /\b(total|net\s*amt|net\s*amount|bill\s*amount|amount\s*payable|payable)\b/i,
  /\b(cgst|sgst|igst|gst|vat|cess|tax|discount|savings?|you\s*saved)\b/i,
  /\b(total\s*qty|total\s*items?|items?\s*[:=]|qty\s*[:=])/i,
  /\b(payment|tender(ed)?|cash\s*received|upi|card\s*no)\b/i,
  /செலுத்தியது|மீதி|மொத்தம்|தொகை|நன்றி/,
  /\b(thank\s*you|visit\s*again|save\s*trees|customer\s*copy|merchant\s*copy)\b/i,
  /\b(cashier|terminal|pos\s*id|transaction\s*id|txn\s*id|ref\s*no|auth\s*code)\b/i,
  /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/,   // date line
  /\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/i,     // time
  /^\s*\d{8,14}\s*$/,
  /^\s*[A-Z0-9-]{6,}\s*$/
];

// Used ONLY on names returned by Gemini: reject only if the name STARTS like a summary line.
const ITEM_NAME_REJECT = /^(grand\s*total|sub\s*total|total|net\s*amount|net\s*amt|bill\s*amount|cgst|sgst|igst|gst|vat|cess|tax|round\s*off|rounding|discount|change|balance|cash|paid|tendered|payment|items?|qty|quantity|thank\s*you)\b|மொத்தம்/i;

/* ------------------------------------------------------------------ *
 * STANDARD PRODUCT NAMES
 * Every item name is normalised to ONE standard English name so the same
 * product from different stores / languages lands under the same name
 * (this is what the Price tracker groups by).
 *
 * Order of matching (see resolveProduct):
 *   1. your own product list + previously saved names (exact, or one side of "A / B")
 *   2. this table (English, Tamil and Tanglish triggers)
 *   3. close spelling match (OCR slips such as "Toor Dai")
 *   4. otherwise a clean Title Case name
 *
 * Names below that contain "/" are the exact names used in index.html's chip list.
 * `proc: true` = the name itself may contain words like powder / oil / soap.
 * ------------------------------------------------------------------ */
export const TAMIL_GROCERY_KNOWLEDGE = [
  // ---- pulses, grains, flours
  { triggers: [/துவரம்\s*பருப்பு/i, /துவரம்பருப்பு/i, /thuvaram\s*paruppu/i, /toor\s*dh?al/i, /tur\s*dh?al/i, /arhar/i], name: "Toor Dal", category: "Grains", unit: "kg" },
  { triggers: [/உளுத்தம்\s*பருப்பு/i, /உளுந்து/i, /உளுந்தம்/i, /urad/i, /ulunthu/i, /ulandhu/i, /black\s*gram/i], name: "Urad Dal", category: "Grains", unit: "kg" },
  { triggers: [/பாசிப்பருப்பு/i, /பாசி\s*பருப்பு/i, /moong/i, /mung\s*dh?al/i, /green\s*gram/i, /pa?asi\s*paruppu/i], name: "Moong Dal", category: "Grains", unit: "kg" },
  { triggers: [/பொட்டுக்கடலை/i, /pottu\s*kadalai/i, /roasted\s*gram/i, /fried\s*gram/i], name: "Roasted Gram", category: "Grains", unit: "kg" },
  { triggers: [/கடலைப்பருப்பு/i, /கடலை\s*பருப்பு/i, /chana\s*dh?al/i, /bengal\s*gram/i, /kadalai\s*paruppu/i], name: "Chana Dal", category: "Grains", unit: "kg" },
  { triggers: [/அரிசி\s*மாவு/i, /rice\s*flour/i], name: "Rice Flour", category: "Grains", unit: "kg", proc: true },
  { triggers: [/இட்லி\s*அரிசி/i, /idli\s*rice/i], name: "Idli Rice", category: "Grains", unit: "kg" },
  { triggers: [/பாஸ்மதி/i, /basmati/i], name: "Basmati Rice", category: "Grains", unit: "kg" },
  { triggers: [/பொன்னி\s*அரிசி/i, /புழுங்கல்\s*அரிசி/i, /அரிசி/i, /ponni/i, /sona\s*masoori/i, /raw\s*rice/i, /boiled\s*rice/i, /rice/i, /arisi/i], name: "Rice", category: "Grains", unit: "kg" },
  { triggers: [/கோதுமை\s*மாவு/i, /கோதுமை/i, /wheat\s*flour/i, /whole\s*wheat/i, /atta/i], name: "Wheat flour / Atta", category: "Grains", unit: "kg", proc: true },
  { triggers: [/மைதா/i, /maida/i], name: "Maida", category: "Grains", unit: "kg", proc: true },
  { triggers: [/ரவை/i, /ரவா/i, /rava/i, /sooji/i, /semolina/i], name: "Rava / Sooji", category: "Grains", unit: "kg" },
  { triggers: [/அவல்/i, /poha/i, /aval/i], name: "Poha", category: "Grains", unit: "kg" },

  // ---- oils & ghee (specific first, generic "Cooking Oil" last)
  { triggers: [/தலை\s*எண்ணெய்/i, /hair\s*oil/i], name: "Hair Oil", category: "Personal care", unit: "ml", proc: true },
  { triggers: [/நல்லெண்ணெய்/i, /gingelly/i, /sesame\s*oil/i], name: "Gingelly Oil", category: "Grocery", unit: "L", proc: true },
  { triggers: [/கடலை\s*எண்ணெய்/i, /கடலெண்ணெய்/i, /groundnut\s*oil/i, /peanut\s*oil/i], name: "Groundnut Oil", category: "Grocery", unit: "L", proc: true },
  { triggers: [/சூரியகாந்தி\s*எண்ணெய்/i, /sunflower/i, /gold\s*winner/i], name: "Sunflower Oil", category: "Grocery", unit: "L", proc: true },
  { triggers: [/தேங்காய்\s*எண்ணெய்/i, /coconut\s*oil/i], name: "Coconut Oil", category: "Grocery", unit: "L", proc: true },
  { triggers: [/எண்ணெய்/i, /cooking\s*oil/i, /refined\s*oil/i, /palm\s*oil/i, /oil/i], name: "Cooking Oil", category: "Grocery", unit: "L", proc: true },
  { triggers: [/நெய்/i, /ghee/i], name: "Ghee", category: "Dairy", unit: "ml", proc: true },

  // ---- sugar, salt, spices, kitchen basics
  { triggers: [/வெல்லம்/i, /vellam/i, /jaggery/i], name: "Jaggery", category: "Grocery", unit: "kg" },
  { triggers: [/சர்க்கரை/i, /சீனி/i, /sugar/i, /sakkarai/i], name: "Sugar", category: "Grocery", unit: "kg" },
  { triggers: [/உப்பு/i, /salt/i, /uppu/i], name: "Salt", category: "Grocery", unit: "kg" },
  { triggers: [/மிளகாய்\s*தூள்/i, /chill?i\s*powder/i, /milagai\s*thool/i], name: "Chilli Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/மஞ்சள்/i, /turmeric/i, /haldi/i, /manjal/i], name: "Turmeric Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/மல்லி\s*தூள்/i, /coriander\s*powder/i, /dhania\s*powder/i], name: "Coriander Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/சாம்பார்\s*(தூள்|பொடி)/i, /sambar\s*(powder|podi)/i], name: "Sambar Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/கரம்\s*மசாலா/i, /garam\s*masala/i], name: "Garam Masala", category: "Grocery", unit: "g", proc: true },
  { triggers: [/பச்சை\s*மிளகாய்/i, /green\s*chill?i/i], name: "Green Chilli", category: "Vegetables", unit: "kg" },
  { triggers: [/வத்தல்/i, /காய்ந்த\s*மிளகாய்/i, /dry\s*chill?i/i, /red\s*chill?i/i], name: "Dry Chilli", category: "Grocery", unit: "g" },
  { triggers: [/கடுகு/i, /kadugu/i, /mustard/i], name: "Mustard / Kadugu", category: "Grocery", unit: "g" },
  { triggers: [/சீரகம்/i, /seeragam/i, /jeera/i, /cumin/i], name: "Cumin / Jeera", category: "Grocery", unit: "g" },
  { triggers: [/மிளகு/i, /milagu/i, /black\s*pepper/i, /pepper/i], name: "Pepper / Milagu", category: "Grocery", unit: "g" },
  { triggers: [/சோம்பு/i, /fennel/i, /saunf/i], name: "Fennel Seeds", category: "Grocery", unit: "g" },
  { triggers: [/வெந்தயம்/i, /fenugreek/i, /methi/i], name: "Fenugreek Seeds", category: "Grocery", unit: "g" },
  { triggers: [/ஏலக்காய்/i, /cardamom/i, /elaichi/i], name: "Cardamom", category: "Grocery", unit: "g" },
  { triggers: [/கிராம்பு/i, /cloves?/i], name: "Cloves", category: "Grocery", unit: "g" },
  { triggers: [/பட்டை/i, /cinnamon/i], name: "Cinnamon", category: "Grocery", unit: "g" },
  { triggers: [/பெருங்காயம்/i, /asafoetida/i, /hing/i], name: "Asafoetida", category: "Grocery", unit: "g" },
  { triggers: [/புளி/i, /tamarind/i], name: "Tamarind", category: "Grocery", unit: "g" },
  { triggers: [/தேயிலை/i, /டீ\s*தூள்/i, /tea\s*(powder|dust)/i], name: "Tea Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/காபி\s*தூள்/i, /coffee\s*powder/i, /filter\s*coffee/i], name: "Coffee Powder", category: "Grocery", unit: "g", proc: true },
  { triggers: [/வேர்க்கடலை/i, /groundnut/i, /peanut/i], name: "Groundnut", category: "Grocery", unit: "kg" },

  // ---- vegetables
  { triggers: [/சின்ன\s*வெங்காயம்/i, /small\s*onion/i, /shallot/i, /sambar\s*onion/i], name: "Small Onion", category: "Vegetables", unit: "kg" },
  { triggers: [/வெங்காயம்/i, /onion/i, /vengayam/i], name: "Onion", category: "Vegetables", unit: "kg" },
  { triggers: [/தக்காளி/i, /tomato/i, /thakkali/i], name: "Tomato", category: "Vegetables", unit: "kg" },
  { triggers: [/பூண்டு/i, /garlic/i, /poondu/i], name: "Garlic", category: "Vegetables", unit: "kg" },
  { triggers: [/உருளை/i, /potato/i, /urulai/i], name: "Potato", category: "Vegetables", unit: "kg" },
  { triggers: [/கேரட்/i, /carrot/i], name: "Carrot", category: "Vegetables", unit: "kg" },
  { triggers: [/பீன்ஸ்/i, /beans?/i], name: "Beans", category: "Vegetables", unit: "kg" },
  { triggers: [/கத்தரி/i, /brinjal/i, /eggplant/i], name: "Brinjal", category: "Vegetables", unit: "kg" },
  { triggers: [/வெண்டை/i, /ladies?\s*finger/i, /okra/i, /bhindi/i], name: "Ladies Finger", category: "Vegetables", unit: "kg" },
  { triggers: [/முட்டைகோஸ்/i, /cabbage/i], name: "Cabbage", category: "Vegetables", unit: "kg" },
  { triggers: [/காலிஃப்ளவர்/i, /cauliflower/i], name: "Cauliflower", category: "Vegetables", unit: "kg" },
  { triggers: [/முருங்கை/i, /drumstick/i], name: "Drumstick", category: "Vegetables", unit: "kg" },
  { triggers: [/இஞ்சி/i, /ginger/i], name: "Ginger", category: "Vegetables", unit: "kg" },
  { triggers: [/எலுமிச்சை/i, /lemon/i], name: "Lemon", category: "Vegetables", unit: "kg" },
  { triggers: [/கறிவேப்பிலை/i, /curry\s*leaves/i], name: "Curry Leaves", category: "Vegetables", unit: "pcs" },
  { triggers: [/கொத்தமல்லி/i, /coriander\s*leaves/i, /coriander/i], name: "Coriander Leaves", category: "Vegetables", unit: "pcs" },
  { triggers: [/தேங்காய்/i, /coconut/i], name: "Coconut", category: "Vegetables", unit: "pcs" },

  // ---- fruits
  { triggers: [/வாழைப்பழம்/i, /banana/i], name: "Banana", category: "Fruits", unit: "kg" },
  { triggers: [/ஆப்பிள்/i, /apple/i], name: "Apple", category: "Fruits", unit: "kg" },
  { triggers: [/ஆரஞ்சு/i, /orange/i], name: "Orange", category: "Fruits", unit: "kg" },
  { triggers: [/மாம்பழம்/i, /mango/i], name: "Mango", category: "Fruits", unit: "kg" },
  { triggers: [/திராட்சை/i, /grapes?/i], name: "Grapes", category: "Fruits", unit: "kg" },
  { triggers: [/மாதுளை/i, /pomegranate/i], name: "Pomegranate", category: "Fruits", unit: "kg" },

  // ---- dairy, eggs, meat & fish
  { triggers: [/(^|[^஀-௿])பால்(?![஀-௿])/i, /milk/i, /aavin/i], name: "Milk", category: "Dairy", unit: "L" },
  { triggers: [/தயிர்/i, /curd/i, /yogh?urt/i, /dahi/i], name: "Curd", category: "Dairy", unit: "ml" },
  { triggers: [/முட்டை(?!கோஸ்)/i, /eggs?/i], name: "Eggs", category: "Dairy", unit: "pcs" },
  { triggers: [/பன்னீர்/i, /paneer/i], name: "Paneer", category: "Dairy", unit: "g" },
  { triggers: [/சிக்கன்/i, /கோழி/i, /chicken/i], name: "Chicken", category: "Meat & fish", unit: "kg" },
  { triggers: [/மட்டன்/i, /ஆட்டிறைச்சி/i, /mutton/i], name: "Mutton", category: "Meat & fish", unit: "kg" },
  { triggers: [/மீன்/i, /fish/i], name: "Fish", category: "Meat & fish", unit: "kg" },

  // ---- household & personal care
  { triggers: [/துணி\s*சோப்பு/i, /வாஷிங்\s*பவுடர்/i, /detergent/i, /surf\s*excel/i, /ariel/i, /tide/i], name: "Detergent", category: "Household", unit: "kg", proc: true },
  { triggers: [/dish\s*wash/i, /\bvim\b/i, /பாத்திரம்/i], name: "Dishwash", category: "Household", unit: "ml", proc: true },
  { triggers: [/ஷாம்பு/i, /shampoo/i], name: "Shampoo", category: "Personal care", unit: "ml", proc: true },
  { triggers: [/சோப்பு/i, /cinthol/i, /hamam/i, /lifebuoy/i, /santoor/i, /medimix/i, /lux/i, /soap/i], name: "Cinthol / Bath Soap", category: "Personal care", unit: "pcs", proc: true }
];

// Latin triggers are wrapped so "oil" no longer matches "Toilet", "rice" no longer matches "Price", etc.
// (No lookbehind, so it also works on older iPhones / Safari.)
const hasTamil = re => /[஀-௿]/.test(re.source);
const KNOWLEDGE = TAMIL_GROCERY_KNOWLEDGE.map(e => ({
  ...e,
  guard: !e.proc,
  triggers: e.triggers.map(re =>
    hasTamil(re) ? re : new RegExp(`(^|[^A-Za-z])(?:${re.source})(?![A-Za-z])`, "i")
  )
}));

// Processed products must NOT be collapsed to the raw ingredient (Tomato Ketchup != Tomato)
const PROCESSED_WORDS = /ketchup|sauce|pickle|puree|chips|soup|juice|jam|paste|powder|masala|mix|biscuits?|noodles|cake|chocolate|bikis|bread|cream|drink|shake|butter|squash|wash|soap|shampoo|oil/i;

/* ------------- name standardisation helpers ------------- */

function keyOf(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9஀-௿]+/g, " ").trim();
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function sim(a, b) {
  const m = Math.max(a.length, b.length);
  return m ? 1 - lev(a, b) / m : 1;
}

const sortTokens = k => k.split(" ").sort().join(" ");

// Accepts ["Name", ...] or [["Name", emoji, category, unit], ...] or [{name, cat}, ...]
function prepKnown(list) {
  const out = [], seen = new Set();
  (Array.isArray(list) ? list : []).forEach(e => {
    const name = normalize(Array.isArray(e) ? e[0] : (e && e.name) || e);
    if (!name || typeof name !== "string") return;
    const key = keyOf(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const cat = Array.isArray(e) ? e[2] : (e && e.cat) || "";
    const parts = name.includes("/") ? name.split("/").map(keyOf).filter(Boolean) : [];
    out.push({ name, key, cat: typeof cat === "string" ? cat : "", parts });
  });
  return out;
}

function findKnown(key, kn) {
  for (const k of kn) if (k.key === key) return k;
  for (const k of kn) if (k.parts.includes(key)) return k;   // "Atta" -> "Wheat flour / Atta"
  return null;
}

function matchEntry(text) {
  const guarded = PROCESSED_WORDS.test(text);
  for (const e of KNOWLEDGE) {
    if (e.guard && guarded) continue;
    if (e.triggers.some(re => re.test(text))) return e;
  }
  return null;
}

const unitFor = name => (matchEntry(name) || {}).unit || "";

const SIZE_RE = /(^|[^A-Za-z0-9.])(\d+(?:\.\d+)?)\s*(kgs?|kilograms?|gms?|grams?|g|ltrs?|litres?|liters?|ml|l)(?![A-Za-z])/i;

// "Aashirvaad Atta 5kg" -> { text: "Aashirvaad Atta", size: { v: 5, unit: "kg" } }
function extractSize(text) {
  const m = text.match(SIZE_RE);
  if (!m) return { text, size: null };
  const v = Number(m[2]);
  const u = m[3].toLowerCase();
  if (!(v > 0)) return { text, size: null };
  const unit = u.startsWith("k") ? "kg" : u === "ml" ? "ml" : u.startsWith("l") ? "L" : "g";
  const rest = (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length))
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s\-–,(]+$/, "")
    .trim();
  return { text: rest || text, size: { v, unit } };
}

// Returns { name, size, cat, unit, how }   how: catalog | alias | fuzzy | none
function resolveProduct(raw, kn) {
  const { text, size } = extractSize(normalize(raw));
  const base = normalize(text) || normalize(raw);
  const key = keyOf(base);
  const done = (name, cat, how) => ({ name, size, cat: cat || "", unit: unitFor(name), how });
  if (!key) return done(base, "", "none");

  let hit = findKnown(key, kn);
  if (hit) return done(hit.name, hit.cat, "catalog");

  const e = matchEntry(base);
  if (e) {
    hit = findKnown(keyOf(e.name), kn);
    return hit ? done(hit.name, hit.cat || e.category, "catalog") : done(e.name, e.category, "alias");
  }

  // close spelling (OCR slips): "Toor Dai", "Sugr", "Wheat Flor"
  if (key.length >= 5) {
    const tk = sortTokens(key);
    let best = null, bestScore = 0;
    for (const k of kn) {
      for (const c of [k.key, ...k.parts]) {
        if (c.length < 5) continue;
        const s = sim(tk, sortTokens(c));
        if (s > bestScore) { bestScore = s; best = { name: k.name, cat: k.cat }; }
      }
    }
    for (const en of KNOWLEDGE) {
      const ek = keyOf(en.name);
      if (ek.length < 5) continue;
      const s = sim(tk, sortTokens(ek));
      if (s > bestScore) {
        const h2 = findKnown(ek, kn);
        bestScore = s;
        best = { name: h2 ? h2.name : en.name, cat: (h2 && h2.cat) || en.category };
      }
    }
    if (best && bestScore >= 0.85) return done(best.name, best.cat, "fuzzy");
  }

  return done(titleCase(base), "", "none");
}

// Mutates an item { name, qty, unit, category, cat }: standard name, category, and pack-size handling.
function applyStandard(it, kn) {
  const r = resolveProduct(it.name, kn);
  let name = r.name;
  if (r.size && it.unit === "pcs") {
    if (r.unit && r.unit !== "pcs") {
      // loose goods sold in packs ("Atta 5kg", "Milk 500 ml" x2) -> real weight / volume so prices compare per kg / per L
      let q = (safeNum(it.qty) || 1) * r.size.v, u = r.size.unit;
      if (u === "g") { q /= 1000; u = "kg"; } else if (u === "ml") { q /= 1000; u = "L"; }
      it.qty = Math.round(q * 1000) / 1000 || 1;
      it.unit = u;
    } else if (r.how === "none") {
      name = `${name} ${r.size.v} ${r.size.unit}`;   // packaged goods: keep the pack size so same packs compare
    }
  }
  it.name = name;
  if (r.cat) { it.category = r.cat; it.cat = r.cat; }
  return r;
}

/**
 * Public helper for index.html: returns the standard name for any typed / scanned product name.
 * knownList = the app's product list (and optionally previously saved names).
 */
export function standardizeName(raw, knownList = []) {
  const clean = normalize(raw);
  if (!clean) return clean;
  const r = resolveProduct(clean, prepKnown(knownList));
  return (r.how === "none" ? titleCase(clean) : r.name).slice(0, 40);
}


/* ------------------------------ helpers ------------------------------ */

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

function normalize(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function titleCase(s) {
  const t = normalize(s);
  if (!/[A-Za-z]/.test(t)) return t;
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t; // already mixed case
  return t.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// OCR often reads digits as letters inside price-like tokens: "1O.OO" -> "10.00", "l20,5O" -> "120.50"
function fixPriceTokens(text) {
  return String(text || "").replace(
    /(^|[^A-Za-z])([\dOoIl|SB]*\d[\dOoIl|SB]*[.,][\dOoIl|SB]{2,3})(?![\dA-Za-z])/g,
    (m, pre, tok) =>
      pre + tok.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/S/g, "5").replace(/B/g, "8")
  );
}

// Returns [{v, dec, len}]; handles "1,250.00" (thousands) and "120,00" (decimal comma)
function extractNumbers(text) {
  const t = String(text || "")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2")
    .replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
  const out = [];
  const re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(t))) {
    const digits = m[0].replace(".", "").length;
    const v = Number(m[0]);
    if (!Number.isFinite(v)) continue;
    // 6+ digit integers are barcodes / codes / phone fragments, never prices
    if (!m[0].includes(".") && digits >= 6) continue;
    out.push({ v, dec: m[0].includes("."), len: digits });
  }
  return out;
}

/* ------------------------------ image helpers ------------------------------ */

export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        // FIX: the old code limited the LONGEST side to 2000px, so a long thin shop receipt
        // (e.g. 1000x4000) was shrunk to ~500px wide and the text became unreadable.
        const MAX_LONG = 3600;
        const MIN_WIDTH = 1200;
        let ratio = Math.min(1, MAX_LONG / Math.max(img.width, img.height));
        if (img.width * ratio < MIN_WIDTH) ratio = Math.min(1, MIN_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas fail")); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) { URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image fail")); };
    img.src = url;
  });
}

let pdfjsReady = null;
export function loadPdfJs() {
  if (pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js";
    s.onload = () => {
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js"; resolve(); } catch (_) { resolve(); }
    };
    s.onerror = () => reject(new Error("PDF load fail"));
    document.head.appendChild(s);
  });
  return pdfjsReady;
}

export async function pdfToCanvas(file) {
  await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const vp0 = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 1800 / Math.max(vp0.width, 1));
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  return canvas;
}

let tessReady = null;
export function loadTess() {
  if (tessReady) return tessReady;
  tessReady = new Promise((resolve, reject) => {
    if (window.Tesseract) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("OCR load fail"));
    document.head.appendChild(s);
  });
  return tessReady;
}

// Grayscale + contrast stretch (+ upscale small images). Makes faded thermal prints far more readable to Tesseract.
function preprocessForOcr(src) {
  try {
    const up = src.width < 1400 ? Math.min(2, 1400 / src.width) : 1;
    const w = Math.round(src.width * up), h = Math.round(src.height * up);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = d[i + 1] = d[i + 2] = g;
      hist[g]++;
    }
    const total = w * h;
    let lo = 0, hi = 255, acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.01) { lo = i; break; } }
    acc = 0;
    for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.01) { hi = i; break; } }
    if (hi - lo < 30) { lo = 0; hi = 255; }
    const span = hi - lo;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / span));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  } catch (_) {
    return src;
  }
}

export async function localOcr(canvas, statusCb) {
  await loadTess();
  const prepared = preprocessForOcr(canvas);
  const logger = m => {
    if (!statusCb || !m || !m.status) return;
    const progress = typeof m.progress === "number" ? ` ${Math.round(m.progress * 100)}%` : "";
    statusCb(`${m.status}${progress}`);
  };
  let worker = null;
  try {
    // PSM 6 (uniform block) + preserved spaces keeps receipt columns apart (qty | rate | amount)
    worker = await window.Tesseract.createWorker("eng+tam", 1, { logger });
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
    const { data } = await worker.recognize(prepared);
    return (data && data.text) || "";
  } catch (_) {
    const result = await window.Tesseract.recognize(prepared, "eng+tam", { logger });
    return (result && result.data && result.data.text) || "";
  } finally {
    if (worker) { try { await worker.terminate(); } catch (_) { /* ignore */ } }
  }
}

/* ------------------------------ Gemini parser ------------------------------ */

export async function parseWithGemini(base64Data, apiKey, knownProducts = [], defaultDate, statusCb) {
  if (statusCb) statusCb("Inspecting columns & verifying totals with Gemini AI...");

  const kn = prepKnown(knownProducts);
  const catalog = kn.length ? kn.map(k => k.name).slice(0, 250).join(" | ") : "(None provided)";

  const prompt = `You are an expert bilingual Indian receipt parser. The bill may be in Tamil (தமிழ்), English, or Tanglish, and may be a photo of a long, faded thermal print.

READ THE BILL IN THIS ORDER:

1. COLUMNS: Find the header (Item | Qty/Weight | Rate/MRP | Amount). The LAST number on an item row is the line amount. Never use barcodes, item codes, HSN codes, serial numbers (1,2,3...) or MRP as the amount or quantity.
2. MULTI-LINE ITEMS: If an item name sits on one line and its numbers on the next line, they belong to ONE item.
3. QTY x RATE CHECK: For every item verify qty x rate = amount (allow small rounding). If it does not, re-read the digits (common misreads: 1/7, 0/6/8, 3/8, 5/6) before answering. Loose goods are often weighed, e.g. 1.250 kg.
4. NAMES (used to compare prices between stores, so they must be consistent):
   - Output the STANDARD generic English product name: Title Case, singular, no Tamil script, no pack size (put the size in qty/unit), no packaging words (Pkt, Pouch, Bottle). Drop the brand when a generic name exists. Examples: 'துவரம் பருப்பு' -> 'Toor Dal'; 'Aashirvaad Atta 5kg' -> 'Wheat flour / Atta'; 'Gold Winner Oil 1L' -> 'Sunflower Oil'; 'சீரகம்' -> 'Cumin / Jeera'; 'Cinthol Soap' -> 'Cinthol / Bath Soap'.
   - If the item matches an entry of the PRODUCT CATALOG below, copy that catalog name EXACTLY (same spelling, spaces and slash).
   - If nothing matches, create a short generic English name. Keep a brand only for packaged goods that have no generic name (e.g. 'Parle-G Biscuit').
   - Pack sizes: '2 x 500 g' loose goods -> qty 1, unit 'kg'. Countable goods (eggs, soap, biscuits) -> qty = count, unit 'pcs'.
   PRODUCT CATALOG: ${catalog}
5. TOTAL: "total" is the final payable amount PRINTED on the bill (labels: Total Amt, Total Amount, Bill Amount, Net Amount, Grand Total, மொத்தம்), usually bottom right. Copy the printed value; do NOT compute it yourself. Do not confuse it with 'Total Qty' or 'Total Items'.
6. SUM CHECK: Add up your item amounts. If the sum is far from the printed total, you have probably missed or misread an item - look again. Do NOT invent items to fill a gap. Small differences (round-off, bag charge, bill discount) are fine.
7. NEVER list as items: store address, phone numbers, PIN, GSTIN, bill number, date/time, CGST/SGST/GST lines, discount/round-off lines, payment lines (Cash Tendered, Balance Returned), 'Total Qty', 'Items:' counts.

Output strictly in the JSON schema.`;

  const geminiSchema = {
    type: "OBJECT",
    properties: {
      store: { type: "STRING", description: "Shop or merchant name only, or empty string" },
      date: { type: "STRING", description: "Bill date as YYYY-MM-DD or empty string" },
      total: { type: "NUMBER", description: "Final payable amount PRINTED on the bill (not computed)" },
      payment: { type: "STRING", enum: ["Cash", "UPI", "Card"], description: "Payment mode detected (Cash if not shown)" },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Standard generic English product name in Title Case (catalog name when it matches)" },
            qty: { type: "NUMBER", description: "Purchased quantity or weight" },
            unit: { type: "STRING", enum: UNITS, description: "Unit of measurement" },
            amount: { type: "NUMBER", description: "Final line amount from the rightmost amount column" },
            category: { type: "STRING", enum: CATS, description: "Category classification" }
          },
          required: ["name", "qty", "unit", "amount", "category"]
        }
      }
    },
    required: ["store", "date", "total", "payment", "items"]
  };

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
      ]
    }],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: geminiSchema,
      temperature: 0.1
    }
  });

  let resJson = null;
  const errors = [];
  for (const model of GEMINI_MODELS) {
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );
    } catch (netErr) {
      throw new Error("Network error: " + (netErr && netErr.message ? netErr.message : "offline"));
    }
    if (response.ok) { resJson = await response.json(); break; }
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini API error (Status ${response.status})`;
    // bad / unauthorised key: no point trying other models
    if (response.status === 401 || response.status === 403) throw new Error(msg);
    errors.push(`${model}: ${String(msg).slice(0, 110)}`);
  }
  if (!resJson) throw new Error(errors.join(" | ") || "Gemini request failed.");

  const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOut) {
    const block = resJson.promptFeedback?.blockReason;
    throw new Error(block ? `Receipt blocked by AI (${block}).` : "Could not parse receipt contents.");
  }

  let parsed;
  try {
    parsed = JSON.parse(textOut);
  } catch (_) {
    throw new Error("AI returned invalid JSON.");
  }

  const cleanItems = (Array.isArray(parsed.items) ? parsed.items : [])
    .map(i => {
      const q = safeNum(i.qty) || 1;
      const a = safeNum(i.amount);
      const catName = CATS.includes(i.category) ? i.category : "Grocery";
      return {
        name: normalize(i.name),
        qty: q,
        unit: UNITS.includes(i.unit) ? i.unit : "pcs",
        amount: a,
        category: catName,
        cat: catName,
        on: true
      };
    })
    // Only reject summary-style NAMES (starts with Total / GST / Discount ...).
    .filter(i => i.name && /[\p{L}]/u.test(i.name) && i.amount > 0 && !ITEM_NAME_REJECT.test(i.name))
    // Standard name, category and pack-size handling (same rules for Gemini and local OCR)
    .map(i => { applyStandard(i, kn); i.name = i.name.slice(0, 40); return i; });

  const itemsSum = Math.round(cleanItems.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  let finalTotal = safeNum(parsed.total);
  if (!finalTotal && itemsSum > 0) finalTotal = itemsSum;

  // Real verification in code (the model cannot be trusted to do its own arithmetic)
  let warning = "";
  const tol = Math.max(2, finalTotal * 0.01);
  if (cleanItems.length && finalTotal && Math.abs(itemsSum - finalTotal) > tol) {
    warning = `Items add up to ${itemsSum} but the bill total is ${finalTotal}. Please check the items.`;
  }

  const result = {
    store: String(parsed.store || "").trim().slice(0, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : defaultDate,
    total: finalTotal,
    payment: ["Cash", "UPI", "Card"].includes(parsed.payment) ? parsed.payment : "Cash",
    items: cleanItems
  };
  if (warning) result.warning = warning; // extra optional field; existing code can ignore it
  return result;
}

/* ------------------------------ Local OCR text parser ------------------------------ */

const TOTAL_LABEL = /(grand\s*total|total\s*amt|total\s*amount|net\s*amount|net\s*amt|bill\s*amount|amount\s*payable|payable|total|மொத்தம்)/i;
const TOTAL_SKIP = /\b(qty|quantity|items?|pcs|nos|tax|gst|cgst|sgst|igst|discount|savings?)\b/i;

function findTotalCandidates(lines) {
  const cands = [];
  for (let j = lines.length - 1; j >= Math.max(0, lines.length - 20); j--) {
    const line = lines[j];
    const lm = line.match(TOTAL_LABEL);
    if (!lm || TOTAL_SKIP.test(line)) continue;
    let nums = extractNumbers(line.slice(lm.index + lm[0].length));
    if (!nums.length && lines[j + 1] && !/\p{L}/u.test(lines[j + 1])) nums = extractNumbers(lines[j + 1]);
    if (!nums.length) continue;
    const dec = nums.filter(n => n.dec);
    const pick = (dec.length ? dec[dec.length - 1] : nums[nums.length - 1]).v;
    if (pick > 0 && pick < 500000) cands.push(pick);
  }
  return cands;
}

function parseItemLine(origLine, kn) {
  if (REJECT_PATTERNS.some(re => re.test(origLine))) return null;

  // strip leading barcode / serial number
  let line = origLine
    .replace(/^\s*\d{6,14}\s+/, "")
    .replace(/^\s*\d{1,3}[.)\-]?\s+(?=\p{L})/u, "");

  // explicit unit token: "1.5 kg", "500 g", "1 ltr", "கிலோ" ...
  let unitQty = 0;
  let unit = "";
  let explicitUnit = false;
  const uRe = /(\d+(?:[.,]\d+)?)\s*(kgs?|kilo|gms?|grams?|g|ltrs?|litres?|liters?|ml|l|pcs|nos|கிலோ|கிராம்|லிட்டர்)(?![\p{L}\p{M}])/iu;
  const uMatch = line.match(uRe);
  if (uMatch) {
    unitQty = safeNum(uMatch[1].replace(",", "."));
    const u = uMatch[2].toLowerCase();
    if (u.startsWith("k") || u === "கிலோ") unit = "kg";
    else if (u === "ml") unit = "ml";
    else if (u.startsWith("l") || u === "லிட்டர்") unit = "L";
    else if (u.startsWith("g") || u === "கிராம்") unit = "g";
    else unit = "pcs";
    line = line.replace(uRe, " ");
    explicitUnit = true;
  }

  const nums = extractNumbers(line);
  if (!nums.length) return null;

  // Indian bills: the LAST number on the row is the net line amount
  const amount = nums[nums.length - 1].v;
  if (!amount || amount <= 0 || amount > 500000) return null;
  const others = nums.slice(0, -1).map(n => n.v);

  // Find qty x rate = amount among the remaining numbers (qty column comes before rate)
  let pairQty = 0;
  const tol = Math.max(0.6, amount * 0.015);
  outer: for (let a = 0; a < others.length; a++) {
    for (let b = a + 1; b < others.length; b++) {
      if (others[a] > 0 && Math.abs(others[a] * others[b] - amount) <= tol) { pairQty = others[a]; break outer; }
    }
  }

  let qty = unitQty || 1;
  if (pairQty) qty = unitQty ? safeNum(unitQty * pairQty) : pairQty;
  if (!unit) unit = "pcs";

  let cleanName = line
    .replace(/[0-9*#@₹$:%|=_~^<>[\]{}()\\/]+/g, " ")
    .replace(/^[\s.,\-–]+|[\s.,\-–]+$/g, "");
  cleanName = normalize(cleanName);
  if ((cleanName.match(/\p{L}/gu) || []).length < 2) return null; // FIX: names like "//" from date lines are dropped
  if (/^(qty|rate|amount|price|item|product|mrp|description)$/i.test(cleanName)) return null;

  const it = {
    name: cleanName,
    qty: safeNum(qty) || 1,
    unit: UNITS.includes(unit) ? unit : "pcs",
    amount: safeNum(amount),
    category: "Grocery",
    cat: "Grocery",
    on: true
  };
  const r = applyStandard(it, kn);
  // no unit printed on the line: use the product's usual unit (Toor Dal -> kg, Cooking Oil -> L ...)
  if (!explicitUnit && it.unit === "pcs" && r.unit && r.unit !== "pcs") it.unit = r.unit;
  it.name = it.name.slice(0, 40);
  return it;
}

export function parseLocalText(rawText, defaultDate, knownProducts = []) {
  const kn = prepKnown(knownProducts);
  const text = fixPriceTokens(String(rawText || "").replace(/\r/g, "\n"));
  const lines = text.split("\n").map(normalize).filter(Boolean);

  // Store: first real-looking line at the top (the old code skipped any line containing 'chennai', 'road', etc.)
  const STORE_SKIP = /\b(gstin|gst|tin|invoice|bill|tax|phone|ph|mobile|cell|tel|date|cash|estimate|memo)\b|^\d/i;
  let store = "";
  for (const line of lines.slice(0, 6)) {
    if ((line.match(/\p{L}/gu) || []).length >= 3 && !STORE_SKIP.test(line) && !/\b\d{6,}\b/.test(line)) {
      store = line.slice(0, 40);
      break;
    }
  }

  let date = defaultDate;
  const dMatch = text.match(/([0-3]?\d)[\/\-.]([01]?\d)[\/\-.]((?:20)?\d\d)(?!\d)/);
  if (dMatch) {
    let dd = +dMatch[1], mm = +dMatch[2], yy = +dMatch[3];
    if (yy < 100) yy += 2000;
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  // Join "name line" + "numbers-only line" that OCR split in two
  const joined = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const next = lines[i + 1];
    if (
      next &&
      /\p{L}/u.test(cur) && !/\d/.test(cur) &&
      /\d/.test(next) && !/\p{L}/u.test(next) &&
      !REJECT_PATTERNS.some(re => re.test(cur))
    ) {
      joined.push(`${cur} ${next}`);
      i++;
    } else {
      joined.push(cur);
    }
  }

  const items = [];
  for (const line of joined) {
    const it = parseItemLine(line, kn);
    if (it) items.push(it);
  }

  // Total: pick the printed-total candidate that agrees with the item sum; never use 'Total Qty'
  const sumItems = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const cands = findTotalCandidates(lines);
  let total = 0;
  if (cands.length) {
    const tol = Math.max(1.5, sumItems * 0.01);
    const agreeing = cands.filter(c => Math.abs(c - sumItems) <= tol);
    total = agreeing.length ? agreeing[0] : cands[0];
  }
  if (!total && items.length) total = sumItems;

  const result = {
    store,
    date,
    total: safeNum(total),
    payment: /upi|gpay|phonepe|paytm/i.test(rawText) ? "UPI" : /\bcard\b|visa|mastercard|rupay/i.test(rawText) ? "Card" : "Cash",
    items
  };
  if (items.length && total && Math.abs(sumItems - total) > Math.max(2, total * 0.01)) {
    result.warning = `Items add up to ${sumItems} but the bill total is ${safeNum(total)}. Please check the items.`;
  }
  return result;
}
