// bill-parser.mjs
// Robust Bilingual Gemini + Local Receipt Parser

export const UNITS = ["kg", "g", "L", "ml", "pcs"];

export const CATS = [
  "Vegetables", "Fruits", "Grains", "Dairy", "Grocery",
  "Meat & fish", "Household", "Personal care", "Dining & Outing",
  "Bills & Utilities", "Healthcare", "Shopping", "Education", "Miscellaneous"
];

export const REJECT_PATTERNS = [
  /no[\s.:-]*\d+/i,
  /road|street|nagar|salai|lane|pallavaram|chennai|tamil\s*nadu|pincode|pin[\s.:-]*\d{6}/i,
  /தெரு|சாலை|நகர்|சென்னை|பல்லாவரம்|விலாசம்|அஞ்சல்/i,
  /bill\s*no|bill\s*number|inv\s*no|invoice|estimate|cash\s*bill|memo|counter/i,
  /ரசீது\s*எண்|பில்\s*எண்|விலைப்பட்டியல்/i,
  /phone|mobile|cell|ph[\s.:-]*\d+/i,
  /தொலைபேசி|அலைபேசி/i,
  /gstin|gst\s*no|tin|fssai|cin|pan\s*no|hsn|sac/i,
  /paid\s*[:=]|returned|change|balance|round\s*off|sub\s*total/i,
  /payment|tender|cash\s*tender|cash\s*received/i,
  /செலுத்தியது|மீதி|தொகை|நன்றி/i,
  /thank\s*you|visit\s*again|save\s*trees|customer\s*copy|merchant\s*copy/i,
  /cashier|terminal|pos\s*id|transaction\s*id|txn\s*id|ref\s*no|auth\s*code/i,
  /^\s*\d{8,14}\s*$/,
  /^\s*[A-Z0-9-]{6,}\s*$/
];

export const TAMIL_GROCERY_KNOWLEDGE = [
  { triggers: [/துவரம்\s*பருப்பு/i, /துவரம்பருப்பு/i, /thuvaram\s*paruppu/i, /toor\s*dhal/i, /toor\s*dal/i], name: "Toor Dal", cat: "Grains", unit: "kg" },
  { triggers: [/உளுத்தம்\s*பருப்பு/i, /உளுந்து/i, /urad\s*dal/i, /ulunthu/i, /ulandhu/i], name: "Urad Dal", cat: "Grains", unit: "kg" },
  { triggers: [/பாசிப்பருப்பு/i, /பாசி\s*பருப்பு/i, /moong\s*dal/i, /paasi\s*paruppu/i], name: "Moong Dal", cat: "Grains", unit: "kg" },
  { triggers: [/கடலைப்பருப்பு/i, /கடலை\s*பருப்பு/i, /chana\s*dal/i, /kadalai\s*paruppu/i], name: "Chana Dal", cat: "Grains", unit: "kg" },
  { triggers: [/பொன்னி\s*அரிசி/i, /அரிசி/i, /ponni\s*rice/i, /raw\s*rice/i, /arisi/i], name: "Rice", cat: "Grains", unit: "kg" },
  { triggers: [/கோதுமை\s*மாவு/i, /கோதுமை/i, /wheat\s*flour/i, /atta/i], name: "Wheat Flour / Atta", cat: "Grains", unit: "kg" },
  { triggers: [/மைதா/i, /maida/i], name: "Maida", cat: "Grains", unit: "kg" },
  { triggers: [/ரவை/i, /ரவா/i, /rava/i, /sooji/i], name: "Rava / Sooji", cat: "Grains", unit: "kg" },
  { triggers: [/கடுகு/i, /kadugu/i, /mustard/i], name: "Mustard Seeds", cat: "Grocery", unit: "g" },
  { triggers: [/சீரகம்/i, /seeragam/i, /jeera/i, /cumin/i], name: "Cumin Seeds", cat: "Grocery", unit: "g" },
  { triggers: [/மிளகு/i, /milagu/i, /black\s*pepper/i, /pepper/i], name: "Black Pepper", cat: "Grocery", unit: "g" },
  { triggers: [/நல்லெண்ணெய்/i, /gingelly\s*oil/i, /sesame\s*oil/i], name: "Gingelly Oil", cat: "Grocery", unit: "L" },
  { triggers: [/கடலை\s*எண்ணெய்/i, /groundnut\s*oil/i], name: "Groundnut Oil", cat: "Grocery", unit: "L" },
  { triggers: [/சூரியகாந்தி\s*எண்ணெய்/i, /sunflower\s*oil/i, /gold\s*winner/i], name: "Sunflower Oil", cat: "Grocery", unit: "L" },
  { triggers: [/எண்ணெய்/i, /cooking\s*oil/i, /oil/i], name: "Cooking Oil", cat: "Grocery", unit: "L" },
  { triggers: [/நெய்/i, /ghee/i], name: "Ghee", cat: "Dairy", unit: "ml" },
  { triggers: [/சர்க்கரை/i, /சீனி/i, /sugar/i, /sakkarai/i], name: "Sugar", cat: "Grocery", unit: "kg" },
  { triggers: [/உப்பு/i, /salt/i, /uppu/i], name: "Salt", cat: "Grocery", unit: "kg" },
  { triggers: [/வெங்காயம்/i, /onion/i, /vengayam/i], name: "Onion", cat: "Vegetables", unit: "kg" },
  { triggers: [/தக்காளி/i, /tomato/i, /thakkali/i], name: "Tomato", cat: "Vegetables", unit: "kg" },
  { triggers: [/பூண்டு/i, /garlic/i, /poondu/i], name: "Garlic", cat: "Vegetables", unit: "kg" },
  { triggers: [/சோப்பு/i, /cinthol/i, /hamam/i, /soap/i], name: "Bath Soap", cat: "Personal care", unit: "pcs" }
];

const CATEGORY_KEYWORDS = {
  Vegetables: [
    "tomato", "tomatoes", "onion", "potato", "carrot", "beans",
    "brinjal", "eggplant", "cabbage", "cauliflower", "ladies finger",
    "okra", "drumstick", "beetroot", "radish", "cucumber",
    "capsicum", "chilli", "green chilli", "ginger", "garlic",
    "keerai", "spinach", "palak", "mushroom"
  ],
  Fruits: [
    "apple", "banana", "orange", "grapes", "mango", "papaya",
    "watermelon", "muskmelon", "guava", "pineapple", "pomegranate",
    "sapota", "chikoo", "lemon", "lime", "pear", "kiwi"
  ],
  Grains: [
    "rice", "ponni", "sona masuri", "basmati", "wheat", "atta",
    "flour", "rava", "sooji", "semolina", "maida", "ragi",
    "millet", "bajra", "jowar", "oats", "corn", "poha", "aval"
  ],
  Dairy: [
    "milk", "curd", "yogurt", "butter", "ghee", "paneer",
    "cheese", "cream", "lassi", "buttermilk", "ice cream"
  ],
  "Meat & fish": [
    "chicken", "mutton", "fish", "prawn", "prawns", "shrimp",
    "crab", "meat", "beef", "egg", "eggs"
  ],
  Household: [
    "detergent", "washing powder", "dishwash", "dish wash",
    "floor cleaner", "toilet cleaner", "phenyl", "harpic",
    "vim", "scrub", "broom", "mop", "dustbin", "garbage bag",
    "tissue", "foil", "aluminium foil", "cling film"
  ],
  "Personal care": [
    "soap", "shampoo", "conditioner", "toothpaste", "toothbrush",
    "face wash", "body wash", "cream", "lotion", "deodorant",
    "perfume", "powder", "razor", "shaving", "sanitary", "diaper"
  ],
  Grocery: [
    "dal", "dhal", "toor", "tur dal", "moong", "urad", "chana",
    "gram", "rajma", "sugar", "salt", "oil", "sunflower",
    "groundnut", "coconut oil", "tea", "coffee", "biscuit",
    "noodles", "pasta", "masala", "spice", "turmeric", "chilli powder",
    "pepper", "cumin", "jeera", "mustard", "cardamom", "cashew",
    "almond", "raisins", "dry fruit", "pickle", "sauce", "jam"
  ],
  Healthcare: [
    "medicine", "tablet", "capsule", "syrup", "ointment",
    "vitamin", "bandage", "mask", "medical"
  ],
  Shopping: [
    "shirt", "pant", "dress", "shoe", "slipper", "bag",
    "clothing", "accessory"
  ],
  Education: [
    "book", "notebook", "pen", "pencil", "eraser", "school",
    "stationery"
  ],
  "Bills & Utilities": [
    "electricity", "eb", "water bill", "internet", "broadband",
    "mobile recharge", "recharge", "gas"
  ],
  "Dining & Outing": [
    "restaurant", "hotel", "cafe", "coffee shop", "meal",
    "food", "biriyani", "biryani", "pizza", "burger"
  ]
};

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0
    ? Math.round(n * 1000) / 1000
    : 0;
}

function normalizeSpaces(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const maxDim = 2000;
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas processing failed"));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image processing failed"));
    };

    img.src = url;
  });
}

let pdfjsReady = null;

export function loadPdfJs() {
  if (pdfjsReady) return pdfjsReady;

  pdfjsReady = new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";
      } catch (_) {}
      resolve();
      return;
    }

    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js";
    s.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    s.onerror = () => reject(new Error("PDF engine failed to load"));
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

  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport: vp
  }).promise;

  return canvas;
}

let tessReady = null;

export function loadTess() {
  if (tessReady) return tessReady;

  tessReady = new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }

    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("OCR engine failed to load"));
    document.head.appendChild(s);
  });

  return tessReady;
}

export async function localOcr(canvas, statusCb) {
  await loadTess();

  const result = await window.Tesseract.recognize(
    canvas,
    "eng+tam",
    {
      logger: m => {
        if (!statusCb || !m) return;
        if (m.status) {
          const progress = typeof m.progress === "number" ? ` ${Math.round(m.progress * 100)}%` : "";
          statusCb(`${m.status}${progress}`);
        }
      }
    }
  );

  return (result && result.data && result.data.text) || "";
}

function detectCategory(name) {
  const lower = String(name || "").toLowerCase();

  for (const category of CATS) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (!keywords) continue;

    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return "Grocery";
}

function detectDate(rawText, defaultDate) {
  const text = String(rawText || "");
  const patterns = [
    /([0-3]?\d)[\/\-.]([01]?\d)[\/\-.]((?:20)?\d\d)/,
    /((?:20)\d\d)[\/\-.]([01]?\d)[\/\-.]([0-3]?\d)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    let day, month, year;
    if (match[1].length === 4) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }

    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return defaultDate;
}

function detectPayment(rawText) {
  const text = String(rawText || "").toLowerCase();

  if (/\bupi\b/.test(text) || /\bgpay\b/.test(text) || /google\s*pay/.test(text) || /phone\s*pe/.test(text) || /\bpaytm\b/.test(text) || /\bbhim\b/.test(text)) {
    return "UPI";
  }

  if (/\bcredit\s*card\b/.test(text) || /\bdebit\s*card\b/.test(text) || /\bcard\b/.test(text) || /\bpos\b/.test(text)) {
    return "Card";
  }

  return "Cash";
}

function extractAmountFromText(text) {
  const values = String(text || "")
    .replace(/₹/g, " ")
    .replace(/rs\.?/gi, " ")
    .match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g);

  if (!values || !values.length) return 0;

  const numbers = values
    .map(v => Number(v.replace(/,/g, "")))
    .filter(n => Number.isFinite(n) && n >= 0);

  return numbers.length ? numbers[numbers.length - 1] : 0;
}

function detectTotal(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const priorityPatterns = [
    /grand\s*total/i,
    /net\s*(?:amount|amt|total)/i,
    /amount\s*(?:payable|due)/i,
    /payable/i,
    /balance\s*due/i,
    /மொத்தம்/i,
    /செலுத்த\s*வேண்டிய/i
  ];

  for (const pattern of priorityPatterns) {
    for (const line of lines) {
      if (!pattern.test(line)) continue;
      const amount = extractAmountFromText(line);
      if (amount > 0 && amount <= 10000000) return safeNumber(amount);
    }
  }

  for (const line of lines) {
    if (!/\btotal\b/i.test(line)) continue;
    const amount = extractAmountFromText(line);
    if (amount > 0 && amount <= 10000000) return safeNumber(amount);
  }

  return 0;
}

function detectStore(lines) {
  const addressWords = [
    "road", "street", "nagar", "salai", "lane", "chennai", "tamil nadu",
    "pincode", "phone", "mobile", "gst", "fssai", "invoice", "bill",
    "receipt", "date", "time", "cashier"
  ];

  for (const rawLine of lines.slice(0, 10)) {
    const line = normalizeSpaces(rawLine);
    if (line.length < 3 || line.length > 60) continue;
    if (!/[A-Za-z\u0B80-\u0BFF]/.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (REJECT_PATTERNS.some(re => re.test(line))) continue;

    const lower = line.toLowerCase();
    if (addressWords.some(word => lower.includes(word))) continue;
    if (line.split(/\s+/).length > 10) continue;

    return line.slice(0, 40);
  }

  return "";
}

function detectQuantityAndUnit(line) {
  const value = String(line || "");
  const match = value.match(
    /(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|ml|pcs|pc|nos|no|கிலோ|கிராம்|லிட்டர்|மில்லி)/i
  );

  if (!match) {
    return { qty: 1, unit: "pcs" };
  }

  const qty = Number(match[1]) || 1;
  const rawUnit = match[2].toLowerCase();
  let unit = "pcs";

  if (rawUnit.startsWith("kg") || rawUnit === "கிலோ") {
    unit = "kg";
  } else if (["g", "gm", "gms", "gram", "grams"].includes(rawUnit) || rawUnit === "கிராம்") {
    unit = "g";
  } else if (["ml", "millilitre", "milliliter"].includes(rawUnit) || rawUnit === "மில்லி") {
    unit = "ml";
  } else if (["l", "ltr", "ltrs", "litre", "litres", "liter", "liters"].includes(rawUnit) || rawUnit === "லிட்டர்") {
    unit = "L";
  }

  return { qty: safeNumber(qty) || 1, unit };
}

function extractNumbers(line) {
  const matches = String(line || "")
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g);

  return matches
    ? matches.map(Number).filter(n => Number.isFinite(n))
    : [];
}

function isRejectedLine(line) {
  const value = normalizeSpaces(line);
  if (!value) return true;
  if (REJECT_PATTERNS.some(re => re.test(value))) return true;

  if (/^(?:subtotal|sub total|total|grand total|net total|net amount|amount payable|amount due|tax|gst|cgst|sgst|igst|discount|saving|savings|round off|change|balance)$/i.test(value)) {
    return true;
  }

  if (/மொத்தம்|வரி|தள்ளுபடி|சேமிப்பு|மீதம்|நன்றி/.test(value)) {
    return true;
  }

  return false;
}

function parseLocalItemLine(line) {
  const original = normalizeSpaces(line);
  if (isRejectedLine(original)) return null;
  if (!/[A-Za-z\u0B80-\u0BFF]/.test(original)) return null;

  const nums = extractNumbers(original);
  if (!nums.length) return null;

  let amount = nums[nums.length - 1];
  if (!Number.isFinite(amount) || amount <= 0 || amount > 500000) return null;

  const { qty: detectedQty, unit } = detectQuantityAndUnit(original);
  let qty = detectedQty || 1;
  let rate = amount;

  if (nums.length >= 3) {
    const possibleQty = nums[nums.length - 3];
    const possibleRate = nums[nums.length - 2];
    const calculated = possibleQty * possibleRate;

    if (possibleQty > 0 && possibleRate > 0 && Math.abs(calculated - amount) <= Math.max(1.5, amount * 0.01)) {
      qty = possibleQty;
      rate = possibleRate;
    }
  }

  if (detectedQty > 0) {
    qty = detectedQty;
    rate = +(amount / qty).toFixed(2);
  }

  let name = original
    .replace(/^\s*\d{1,4}[\s.)\-:#]+/, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|ml|pcs|pc|nos|no)\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:கிலோ|கிராம்|லிட்டர்|மில்லி)\b/gi, "")
    .replace(/\s+\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?\s*$/, "")
    .replace(/\b\d{8,14}\b/g, "")
    .replace(/\b(?:sku|hsn|code|item\s*code)\s*[:#-]?\s*[A-Z0-9-]+\b/gi, "")
    .replace(/(?:₹|rs\.?)\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/gi, "")
    .replace(/[₹$€£]/g, "")
    .trim();

  name = normalizeSpaces(name);
  if (!name || name.length < 2) return null;
  if (/^(qty|quantity|rate|amount|price|description|item|product)$/i.test(name)) return null;
  if (!/[A-Za-z\u0B80-\u0BFF]/.test(name)) return null;

  // Bilingual translation & standard name mapping
  let finalCategory = detectCategory(name);
  for (const entry of TAMIL_GROCERY_KNOWLEDGE) {
    if (entry.triggers.some(re => re.test(name))) {
      name = entry.name;
      finalCategory = entry.cat;
      break;
    }
  }

  return {
    name: name.slice(0, 40),
    qty: safeNumber(qty) || 1,
    unit: UNITS.includes(unit) ? unit : "pcs",
    rate: safeNumber(rate) || amount,
    price: safeNumber(rate) || amount,
    amount: safeNumber(amount),
    cat: finalCategory,
    category: finalCategory,
    on: true
  };
}

export async function parseWithGemini(
  base64Data,
  apiKey,
  knownProducts = [],
  defaultDate,
  statusCb
) {
  if (statusCb) statusCb("Reading and translating bill via Gemini AI...");

  const prompt = `This is a grocery, supermarket, provision shop, pharmacy, restaurant, retail, or general purchase receipt from India. Prices are in INR.
The receipt may contain English, Tamil script (தமிழ்), Tanglish, or mixed English/Tamil.

TASK:
Read every purchased line item and return structured data.
Translate product names into clear standard English Title Case (e.g. துவரம் பருப்பு -> Toor Dal, சீரகம் -> Cumin Seeds, எண்ணெய் -> Cooking Oil, CINTHOL OLD RS40 -> Cinthol Soap).

CRITICAL RULES:
1. ONLY LIST PURCHASED PRODUCTS.
Skip shop address, GST/FSSAI, phone numbers, Bill No, Invoice No, date/time headers, cashier info, HSN/SAC, barcodes, subtotals, tax summary, CGST/SGST, discounts, savings, round-off, change, and tender rows.

2. QUANTITY & UNIT:
- If weight/volume is stated: 0.750 kg -> qty 0.750, unit kg; 500 g -> qty 500, unit g; 1 L -> qty 1, unit L.
- If pack size & multiplier: SUGAR 1KG x 2 -> qty 2, unit kg.
- Prefer kg over g once quantity is 1000 or more.
- Prefer L over ml once quantity is 1000 or more.
- For count-based items use pcs.

3. AMOUNT: Final net amount charged for that specific line item after item-level discounts.
4. RATE: Price per single unit (amount / qty).
5. KNOWN PRODUCTS: Match against this catalog if clearly applicable:
${(Array.isArray(knownProducts) && knownProducts.length ? knownProducts.slice(0, 100).join(", ") : "(None provided)")}
6. TOTAL: Final net payable amount printed on bill.`;

  const geminiSchema = {
    type: "OBJECT",
    properties: {
      store: { type: "STRING", description: "Shop or merchant name" },
      date: { type: "STRING", description: "Bill date in YYYY-MM-DD format" },
      total: { type: "NUMBER", description: "Final grand total payable" },
      payment: { type: "STRING", enum: ["Cash", "UPI", "Card", ""], description: "Payment mode" },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            qty: { type: "NUMBER" },
            unit: { type: "STRING", enum: UNITS },
            rate: { type: "NUMBER" },
            amount: { type: "NUMBER" },
            category: { type: "STRING", enum: CATS }
          },
          required: ["name", "qty", "unit", "amount", "category"]
        }
      }
    },
    required: ["store", "date", "total", "items"]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: geminiSchema,
          temperature: 0.1
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error (Status ${response.status})`);
  }

  const resJson = await response.json();
  const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOut) throw new Error("Could not parse receipt contents.");

  let parsed;
  try {
    parsed = JSON.parse(textOut);
  } catch (_) {
    throw new Error("AI returned invalid receipt data.");
  }

  const num = x => safeNumber(x);

  const cleanItems = (Array.isArray(parsed.items) ? parsed.items : [])
    .map(i => {
      const q = num(i.qty) || 1;
      const a = num(i.amount);
      const r = num(i.rate) || (q > 0 ? +(a / q).toFixed(2) : a);
      const category = CATS.includes(i.category) ? i.category : "Grocery";

      return {
        name: String(i.name || "").trim().slice(0, 40),
        qty: q,
        unit: UNITS.includes(i.unit) ? i.unit : "pcs",
        rate: r,
        price: r,
        amount: a,
        cat: category,
        category: category,
        on: true
      };
    })
    .filter(i => i.name && i.amount > 0);

  return {
    store: String(parsed.store || "").trim().slice(0, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : defaultDate,
    total: num(parsed.total),
    pay: ["Cash", "UPI", "Card"].includes(parsed.payment) ? parsed.payment : "Cash",
    items_count: cleanItems.length,
    items: cleanItems
  };
}

export function parseLocalText(rawText, defaultDate) {
  const normalizedText = String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ");

  const lines = normalizedText
    .split("\n")
    .map(l => normalizeSpaces(l))
    .filter(Boolean);

  const store = detectStore(lines);
  const date = detectDate(normalizedText, defaultDate);
  const billTotal = detectTotal(normalizedText);
  const pay = detectPayment(normalizedText);
  const items = [];

  for (const line of lines) {
    const item = parseLocalItemLine(line);
    if (!item) continue;

    const duplicate = items.some(existing => {
      const sameName = existing.name.toLowerCase() === item.name.toLowerCase();
      const sameAmount = Math.abs(existing.amount - item.amount) < 0.01;
      const sameQty = Math.abs(existing.qty - item.qty) < 0.001;
      return sameName && sameAmount && sameQty;
    });

    if (!duplicate) items.push(item);
  }

  let total = billTotal;
  if (!total && items.length) {
    total = items.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    total = Math.round(total * 100) / 100;
  }

  return {
    store,
    date,
    pay,
    total,
    items_count: items.length,
    items
  };
}
