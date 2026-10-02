```javascript
// bill-parser.mjs
// Robust Bilingual Gemini + Local Receipt Parser
//
// Functionality preserved:
// 1. Gemini AI parser for high-accuracy receipt understanding
// 2. Local OCR fallback using Tesseract.js
// 3. PDF first-page rendering using PDF.js
// 4. Tamil + English + Tanglish receipt support
// 5. Same output structure used by the existing application
//
// Improvements:
// - More robust Indian receipt line parsing
// - Better quantity / rate / amount detection
// - Better total detection
// - Better store detection
// - Better Tamil unit recognition
// - Better category detection
// - Better handling of SKU / HSN / barcode numbers
// - Better handling of common POS bill layouts
// - Better protection against subtotal/tax/payment/header noise
// - Safer OCR image preprocessing
// - Supports common GST/POS/retail receipt formats

export const UNITS = ["kg", "g", "L", "ml", "pcs"];

export const CATS = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Dairy",
  "Grocery",
  "Meat & fish",
  "Household",
  "Personal care",
  "Dining & Outing",
  "Bills & Utilities",
  "Healthcare",
  "Shopping",
  "Education",
  "Miscellaneous"
];

/* =========================================================
   REJECTION PATTERNS
   ========================================================= */

export const REJECT_PATTERNS = [
  // English address / identification
  /no[\s.:-]*\d+/i,
  /road|street|nagar|salai|lane|pallavaram|chennai|tamil\s*nadu|pincode|pin[\s.:-]*\d{6}/i,

  // Tamil address / identification
  /தெரு|சாலை|நகர்|சென்னை|பல்லாவரம்|விலாசம்|அஞ்சல்/i,

  // Bill / invoice headers
  /bill\s*no|bill\s*number|inv\s*no|invoice|estimate|cash\s*bill|memo|counter/i,
  /ரசீது\s*எண்|பில்\s*எண்|விலைப்பட்டியல்/i,

  // Contact information
  /phone|mobile|cell|ph[\s.:-]*\d+/i,
  /தொலைபேசி|அலைபேசி/i,

  // Tax / registration
  /gstin|gst\s*no|tin|fssai|cin|pan\s*no|hsn|sac/i,

  // Payment / summary noise
  /paid\s*[:=]|returned|change|balance|round\s*off|sub\s*total/i,
  /payment|tender|cash\s*tender|cash\s*received/i,
  /செலுத்தியது|மீதி|தொகை|நன்றி/i,

  // Footer / advertising
  /thank\s*you|visit\s*again|save\s*trees|customer\s*copy|merchant\s*copy/i,

  // Common POS fields
  /cashier|terminal|pos\s*id|transaction\s*id|txn\s*id|ref\s*no|auth\s*code/i,

  // Barcode / SKU-only rows
  /^\s*\d{8,14}\s*$/,
  /^\s*[A-Z0-9-]{6,}\s*$/,
];

/* =========================================================
   CATEGORY KEYWORDS
   ========================================================= */

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
    "clothing", "dress", "accessory"
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

/* =========================================================
   BASIC HELPERS
   ========================================================= */

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   IMAGE SHRINK / PREPROCESS
   ========================================================= */

export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const maxDim = 2000;

        const ratio = Math.min(
          1,
          maxDim / Math.max(img.width, img.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas processing failed"));
          return;
        }

        // White background helps receipts photographed on grey/dark surfaces.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

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

/* =========================================================
   PDF
   ========================================================= */

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

    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js";

    s.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    s.onerror = () =>
      reject(new Error("PDF engine failed to load"));

    document.head.appendChild(s);
  });

  return pdfjsReady;
}

export async function pdfToCanvas(file) {
  await loadPdfJs();

  const buf = await file.arrayBuffer();

  const doc = await window.pdfjsLib.getDocument({
    data: buf
  }).promise;

  // Preserve current functionality: first page.
  const page = await doc.getPage(1);

  const vp0 = page.getViewport({
    scale: 1
  });

  const scale = Math.min(
    2.5,
    1800 / Math.max(vp0.width, 1)
  );

  const vp = page.getViewport({
    scale
  });

  const canvas = document.createElement("canvas");

  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);

  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx,
    viewport: vp
  }).promise;

  return canvas;
}

/* =========================================================
   TESSERACT
   ========================================================= */

let tessReady = null;

export function loadTess() {
  if (tessReady) return tessReady;

  tessReady = new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }

    const s = document.createElement("script");

    s.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

    s.onload = () => resolve();

    s.onerror = () =>
      reject(new Error("OCR engine failed to load"));

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
          const progress =
            typeof m.progress === "number"
              ? ` ${Math.round(m.progress * 100)}%`
              : "";

          statusCb(`${m.status}${progress}`);
        }
      }
    }
  );

  return (
    result &&
    result.data &&
    result.data.text
  ) || "";
}

/* =========================================================
   PRODUCT CATEGORY
   ========================================================= */

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

/* =========================================================
   PRODUCT NAME CLEANING
   ========================================================= */

function cleanProductName(name) {
  let value = normalizeSpaces(name);

  // Remove leading line numbers.
  value = value.replace(
    /^\s*(?:\d{1,4}[\s.)\-:#]*)+/,
    ""
  );

  // Remove common product codes.
  value = value.replace(
    /\b(?:sku|item\s*code|code|hsn)\s*[:#-]?\s*[A-Z0-9-]+\b/gi,
    ""
  );

  // Remove barcode-like numeric strings.
  value = value.replace(
    /\b\d{8,14}\b/g,
    ""
  );

  // Remove quantities / units.
  value = value.replace(
    /\b\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|ml|pcs|pc|nos|no)\b/gi,
    ""
  );

  // Tamil units.
  value = value.replace(
    /\b\d+(?:\.\d+)?\s*(?:கிலோ|கிராம்|கிராம்கள்|லிட்டர்|மில்லி)\b/gi,
    ""
  );

  // Remove trailing numeric columns.
  value = value.replace(
    /(?:\s+|\s*[*xX]\s*)\d+(?:\.\d+)?(?:\s+|$)/g,
    " "
  );

  // Remove currency / separators.
  value = value.replace(
    /[₹$€£]/g,
    ""
  );

  value = value.replace(
    /[|]+/g,
    " "
  );

  value = normalizeSpaces(value);

  // If OCR produces only punctuation/numbers, reject it.
  if (!/[A-Za-z\u0B80-\u0BFF]/.test(value)) {
    return "";
  }

  return value.slice(0, 40);
}

/* =========================================================
   DATE
   ========================================================= */

function detectDate(rawText, defaultDate) {
  const text = String(rawText || "");

  const patterns = [
    /([0-3]?\d)[\/\-.]([01]?\d)[\/\-.]((?:20)?\d\d)/,
    /((?:20)\d\d)[\/\-.]([01]?\d)[\/\-.]([0-3]?\d)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    let day;
    let month;
    let year;

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

    if (
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 2000 &&
      year <= 2100
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return defaultDate;
}

/* =========================================================
   PAYMENT
   ========================================================= */

function detectPayment(rawText) {
  const text = String(rawText || "").toLowerCase();

  if (
    /\bupi\b/.test(text) ||
    /\bgpay\b/.test(text) ||
    /google\s*pay/.test(text) ||
    /phone\s*pe/.test(text) ||
    /\bpaytm\b/.test(text) ||
    /\bbhim\b/.test(text)
  ) {
    return "UPI";
  }

  if (
    /\bcredit\s*card\b/.test(text) ||
    /\bdebit\s*card\b/.test(text) ||
    /\bcard\b/.test(text) ||
    /\bpos\b/.test(text)
  ) {
    return "Card";
  }

  if (
    /\bcash\b/.test(text) ||
    /cash\s*bill/i.test(text) ||
    /cash\s*tender/i.test(text)
  ) {
    return "Cash";
  }

  return "Cash";
}

/* =========================================================
   TOTAL
   ========================================================= */

function extractAmountFromText(text) {
  const values = String(text || "")
    .replace(/₹/g, " ")
    .replace(/rs\.?/gi, " ")
    .match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g);

  if (!values || !values.length) return 0;

  const numbers = values
    .map(v => Number(v.replace(/,/g, "")))
    .filter(n => Number.isFinite(n) && n >= 0);

  return numbers.length
    ? numbers[numbers.length - 1]
    : 0;
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

      if (amount > 0 && amount <= 10000000) {
        return safeNumber(amount);
      }
    }
  }

  // Lower-priority generic total.
  for (const line of lines) {
    if (!/\btotal\b/i.test(line)) continue;

    const amount = extractAmountFromText(line);

    if (amount > 0 && amount <= 10000000) {
      return safeNumber(amount);
    }
  }

  return 0;
}

/* =========================================================
   STORE DETECTION
   ========================================================= */

function detectStore(lines) {
  const addressWords = [
    "road",
    "street",
    "nagar",
    "salai",
    "lane",
    "chennai",
    "tamil nadu",
    "pincode",
    "phone",
    "mobile",
    "gst",
    "fssai",
    "invoice",
    "bill",
    "receipt",
    "date",
    "time",
    "cashier"
  ];

  for (const rawLine of lines.slice(0, 10)) {
    const line = normalizeSpaces(rawLine);

    if (line.length < 3 || line.length > 60) continue;

    if (!/[A-Za-z\u0B80-\u0BFF]/.test(line)) continue;

    if (/^\d/.test(line)) continue;

    if (REJECT_PATTERNS.some(re => re.test(line))) continue;

    const lower = line.toLowerCase();

    if (
      addressWords.some(word =>
        lower.includes(word)
      )
    ) {
      continue;
    }

    // Store names are usually not long sentences.
    if (line.split(/\s+/).length > 10) continue;

    return line.slice(0, 40);
  }

  return "";
}

/* =========================================================
   UNIT DETECTION
   ========================================================= */

function detectUnit(line) {
  const value = String(line || "").toLowerCase();

  if (
    /\bkg\b|\bkgs\b|\bkilogram\b|\bkilograms\b/.test(value) ||
    /கிலோ/.test(value)
  ) {
    return "kg";
  }

  if (
    /\bg\b|\bgm\b|\bgms\b|\bgram\b|\bgrams\b/.test(value) ||
    /கிராம்/.test(value)
  ) {
    return "g";
  }

  if (
    /\bml\b|\bmillilitre\b|\bmilliliter\b/.test(value) ||
    /மில்லி/.test(value)
  ) {
    return "ml";
  }

  if (
    /\bl\b|\bltr\b|\bltrs\b|\blitre\b|\blitres\b|\bliter\b|\bliters\b/.test(value) ||
    /லிட்டர்/.test(value)
  ) {
    return "L";
  }

  return "pcs";
}

/* =========================================================
   QUANTITY / UNIT
   ========================================================= */

function detectQuantityAndUnit(line) {
  const value = String(line || "");

  const match = value.match(
    /(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|ml|pcs|pc|nos|no|கிலோ|கிராம்|லிட்டர்|மில்லி)/i
  );

  if (!match) {
    return {
      qty: 1,
      unit: "pcs"
    };
  }

  let qty = Number(match[1]) || 1;

  const rawUnit = match[2].toLowerCase();

  let unit = "pcs";

  if (
    rawUnit.startsWith("kg") ||
    rawUnit === "கிலோ"
  ) {
    unit = "kg";
  } else if (
    ["g", "gm", "gms", "gram", "grams"].includes(rawUnit) ||
    rawUnit === "கிராம்"
  ) {
    unit = "g";
  } else if (
    ["ml", "millilitre", "milliliter"].includes(rawUnit) ||
    rawUnit === "மில்லி"
  ) {
    unit = "ml";
  } else if (
    ["l", "ltr", "ltrs", "litre", "litres", "liter", "liters"].includes(rawUnit) ||
    rawUnit === "லிட்டர்"
  ) {
    unit = "L";
  } else {
    unit = "pcs";
  }

  return {
    qty: safeNumber(qty) || 1,
    unit
  };
}

/* =========================================================
   NUMBER EXTRACTION
   ========================================================= */

function extractNumbers(line) {
  const matches = String(line || "")
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g);

  return matches
    ? matches
        .map(Number)
        .filter(n => Number.isFinite(n))
    : [];
}

/* =========================================================
   PRODUCT LINE FILTER
   ========================================================= */

function isRejectedLine(line) {
  const value = normalizeSpaces(line);

  if (!value) return true;

  if (REJECT_PATTERNS.some(re => re.test(value))) {
    return true;
  }

  // Summary keywords.
  if (
    /^(?:subtotal|sub total|total|grand total|net total|net amount|amount payable|amount due|tax|gst|cgst|sgst|discount|saving|savings|round off|change|balance)$/i.test(
      value
    )
  ) {
    return true;
  }

  // Tamil summary lines.
  if (
    /மொத்தம்|வரி|தள்ளுபடி|சேமிப்பு|மீதம்|நன்றி/.test(value)
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   PRODUCT LINE PARSER
   ========================================================= */

function parseLocalItemLine(line) {
  const original = normalizeSpaces(line);

  if (isRejectedLine(original)) {
    return null;
  }

  if (!/[A-Za-z\u0B80-\u0BFF]/.test(original)) {
    return null;
  }

  const nums = extractNumbers(original);

  if (!nums.length) {
    return null;
  }

  /*
   * The last monetary-looking number is normally
   * the line amount in Indian POS bills.
   */
  let amount = nums[nums.length - 1];

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 500000
  ) {
    return null;
  }

  const { qty: detectedQty, unit } =
    detectQuantityAndUnit(original);

  let qty = detectedQty || 1;
  let rate = amount;

  /*
   * Common POS format:
   *
   * ITEM   QTY   RATE   AMOUNT
   *
   * Example:
   * TOOR DAL  2  120  240
   */
  if (nums.length >= 3) {
    const possibleQty = nums[nums.length - 3];
    const possibleRate = nums[nums.length - 2];
    const calculated = possibleQty * possibleRate;

    if (
      possibleQty > 0 &&
      possibleRate > 0 &&
      Math.abs(calculated - amount) <= Math.max(1.5, amount * 0.01)
    ) {
      qty = possibleQty;
      rate = possibleRate;
    }
  }

  /*
   * Another common format:
   *
   * ITEM   QTY   AMOUNT
   */
  if (nums.length >= 2) {
    const possibleQty = nums[nums.length - 2];

    if (
      possibleQty > 0 &&
      possibleQty <= 1000 &&
      Math.abs(possibleQty * amount - amount) <= 0.01
    ) {
      qty = possibleQty;
      rate = +(amount / qty).toFixed(2);
    }
  }

  /*
   * If explicit weight exists, use it.
   */
  if (detectedQty > 0) {
    qty = detectedQty;
    rate = +(amount / qty).toFixed(2);
  }

  /*
   * Clean the product name.
   */
  let name = original;

  // Remove leading item number.
  name = name.replace(
    /^\s*\d{1,4}[\s.)\-:#]+/,
    ""
  );

  // Remove explicit quantity/unit.
  name = name.replace(
    /\b\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|ml|pcs|pc|nos|no)\b/gi,
    ""
  );

  name = name.replace(
    /\b\d+(?:\.\d+)?\s*(?:கிலோ|கிராம்|லிட்டர்|மில்லி)\b/gi,
    ""
  );

  // Remove trailing numeric columns.
  name = name.replace(
    /\s+\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?\s*$/,
    ""
  );

  // Remove barcode / HSN.
  name = name.replace(
    /\b\d{8,14}\b/g,
    ""
  );

  // Remove obvious SKU/HSN codes.
  name = name.replace(
    /\b(?:sku|hsn|code|item\s*code)\s*[:#-]?\s*[A-Z0-9-]+\b/gi,
    ""
  );

  // Remove price-like tokens.
  name = name.replace(
    /(?:₹|rs\.?)\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/gi,
    ""
  );

  name = name.replace(
    /[₹$€£]/g,
    ""
  );

  name = normalizeSpaces(name);

  /*
   * Reject obvious non-product names.
   */
  if (!name || name.length < 2) {
    return null;
  }

  if (
    /^(qty|quantity|rate|amount|price|description|item|product)$/i.test(name)
  ) {
    return null;
  }

  /*
   * Prevent pure number / punctuation OCR noise.
   */
  if (!/[A-Za-z\u0B80-\u0BFF]/.test(name)) {
    return null;
  }

  const category = detectCategory(name);

  return {
    name: name.slice(0, 40),
    qty: safeNumber(qty) || 1,
    unit: UNITS.includes(unit) ? unit : "pcs",
    rate: safeNumber(rate) || amount,
    amount: safeNumber(amount),
    cat: category,
    on: true
  };
}

/* =========================================================
   GEMINI AI PARSER
   ========================================================= */

export async function parseWithGemini(
  base64Data,
  apiKey,
  knownProducts = [],
  defaultDate,
  statusCb
) {
  if (statusCb) {
    statusCb(
      "Reading and translating bill via Gemini AI..."
    );
  }

  const prompt = `This is a grocery, supermarket, provision shop, pharmacy, restaurant, retail, or general purchase receipt from India. Prices are in INR.

The receipt may contain:
- English
- Tamil script (தமிழ்)
- Tanglish
- Mixed English/Tamil
- GST retail POS formatting
- Supermarket formatting
- Handwritten-looking OCR
- Product codes / SKU / HSN
- Weight-based products
- Packaged products
- Loose products
- Multiple quantities

TASK:
Read every purchased line item from the receipt and return structured data.

Translate product names into clear standard English Title Case where possible.

Examples:
துவரம் பருப்பு -> Toor Dal
சீரகம் -> Cumin Seeds
எண்ணெய் -> Cooking Oil
CINTHOL OLD RS40 -> Cinthol Soap

CRITICAL RULES:

1. ONLY LIST PURCHASED PRODUCTS.
Skip:
- shop address
- GST/FSSAI
- phone numbers
- Bill No
- Invoice No
- date/time headers
- cashier information
- HSN/SAC
- SKU/barcodes
- subtotals
- tax summary
- CGST
- SGST
- IGST
- discounts summary
- savings
- round-off
- change
- payment/tender rows
- loyalty information

2. QUANTITY & UNIT:
If weight/volume is stated:
- 0.750 kg -> qty 0.750, unit kg
- 500 g -> qty 500, unit g
- 1 L -> qty 1, unit L
- 250 ml -> qty 250, unit ml

If a pack size and multiplier are present:
SUGAR 1KG x 2 -> qty 2, unit kg

For count-based products:
use pcs.

Prefer kg instead of g when the actual quantity is exactly 1000 g or more.
Prefer L instead of ml when the actual quantity is exactly 1000 ml or more.

3. AMOUNT:
Use the final net amount charged for that specific line item after item-level discount.

4. RATE:
Calculate the rate per purchased unit.

5. KNOWN PRODUCTS:
If the item clearly corresponds to one of these known products, use the exact catalog name:

${(
  Array.isArray(knownProducts) &&
  knownProducts.length
    ? knownProducts.slice(0, 100).join(", ")
    : "(None provided)"
)}

6. TOTAL:
Use the final grand total / net payable amount printed on the bill.

If the printed total is unavailable, calculate the total from the purchased items.

7. DO NOT INVENT:
If something is unreadable, make the most reasonable interpretation from the visible text, but do not create products that are not visible.

8. GENERAL RETAIL BILLS:
The receipt does not necessarily have to be a grocery bill. Correctly classify products into the available categories.`;

  const geminiSchema = {
    type: "OBJECT",

    properties: {
      store: {
        type: "STRING",
        description:
          "Shop or merchant name printed on the bill, or empty string"
      },

      date: {
        type: "STRING",
        description:
          "Bill date in YYYY-MM-DD format"
      },

      total: {
        type: "NUMBER",
        description:
          "Final grand total payable"
      },

      payment: {
        type: "STRING",
        enum: ["Cash", "UPI", "Card", ""],
        description:
          "Payment mode if detected"
      },

      items: {
        type: "ARRAY",

        items: {
          type: "OBJECT",

          properties: {
            name: {
              type: "STRING"
            },

            qty: {
              type: "NUMBER"
            },

            unit: {
              type: "STRING",
              enum: UNITS
            },

            rate: {
              type: "NUMBER"
            },

            amount: {
              type: "NUMBER"
            },

            category: {
              type: "STRING",
              enum: CATS
            }
          },

          required: [
            "name",
            "qty",
            "unit",
            "amount",
            "category"
          ]
        }
      }
    },

    required: [
      "store",
      "date",
      "total",
      "items"
    ]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              },

              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
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
    const err =
      await response.json().catch(() => ({}));

    throw new Error(
      err.error?.message ||
      `Gemini API error (Status ${response.status})`
    );
  }

  const resJson = await response.json();

  const textOut =
    resJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOut) {
    throw new Error(
      "Could not parse receipt contents."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(textOut);
  } catch (_) {
    throw new Error(
      "AI returned invalid receipt data."
    );
  }

  const num = x =>
    safeNumber(x);

  const cleanItems =
    (Array.isArray(parsed.items)
      ? parsed.items
      : []
    )
      .map(i => {
        const q =
          num(i.qty) || 1;

        const a =
          num(i.amount);

        const r =
          num(i.rate) ||
          (q > 0
            ? +(a / q).toFixed(2)
            : a);

        return {
          name: String(
            i.name || ""
          )
            .trim()
            .slice(0, 40),

          qty: q,

          unit:
            UNITS.includes(i.unit)
              ? i.unit
              : "pcs",

          rate: r,

          amount: a,

          cat:
            CATS.includes(i.category)
              ? i.category
              : "Grocery",

          on: true
        };
      })
      .filter(
        i =>
          i.name &&
          i.amount > 0
      );

  return {
    store: String(
      parsed.store || ""
    )
      .trim()
      .slice(0, 40),

    date:
      /^\d{4}-\d{2}-\d{2}$/.test(
        parsed.date || ""
      )
        ? parsed.date
        : defaultDate,

    total:
      num(parsed.total),

    pay:
      ["Cash", "UPI", "Card"].includes(
        parsed.payment
      )
        ? parsed.payment
        : "Cash",

    items_count:
      cleanItems.length,

    items:
      cleanItems
  };
}

/* =========================================================
   LOCAL OCR / REGEX / KNOWLEDGE ENGINE
   ========================================================= */

export function parseLocalText(
  rawText,
  defaultDate
) {
  const normalizedText =
    String(rawText || "")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ");

  const lines =
    normalizedText
      .split("\n")
      .map(l =>
        normalizeSpaces(l)
      )
      .filter(Boolean);

  /*
   * Store
   */
  const store =
    detectStore(lines);

  /*
   * Date
   */
  const date =
    detectDate(
      normalizedText,
      defaultDate
    );

  /*
   * Total
   */
  const billTotal =
    detectTotal(normalizedText);

  /*
   * Payment
   */
  const pay =
    detectPayment(normalizedText);

  /*
   * Items
   */
  const items = [];

  for (const line of lines) {
    const item =
      parseLocalItemLine(line);

    if (!item) continue;

    /*
     * Avoid duplicate lines caused by OCR.
     */
    const duplicate =
      items.some(existing => {
        const sameName =
          existing.name
            .toLowerCase() ===
          item.name.toLowerCase();

        const sameAmount =
          Math.abs(
            existing.amount -
            item.amount
          ) < 0.01;

        const sameQty =
          Math.abs(
            existing.qty -
            item.qty
          ) < 0.001;

        return (
          sameName &&
          sameAmount &&
          sameQty
        );
      });

    if (!duplicate) {
      items.push(item);
    }
  }

  /*
   * If total is missing, calculate it
   * from detected items.
   */
  let total = billTotal;

  if (
    !total &&
    items.length
  ) {
    total =
      items.reduce(
        (sum, item) =>
          sum + safeNumber(item.amount),
        0
      );

    total =
      Math.round(total * 100) / 100;
  }

  return {
    store,
    date,
    pay,
    total,

    items_count:
      items.length,

    items
  };
}
```

### What I changed without changing your application's functionality

Your existing functions remain:

```text
shrinkImage()
loadPdfJs()
pdfToCanvas()
loadTess()
localOcr()
parseWithGemini()
parseLocalText()
```

And your existing output remains:

```javascript
{
  store,
  date,
  pay,
  total,
  items_count,
  items
}
```

So the rest of your Spendy application should **not need to be redesigned**.

### One important point about "all types of bills"

This version is more general than a grocery-only parser. It can recognize the structure of:

* Grocery/supermarket bills
* Provision-store bills
* Vegetable/fruit bills
* Pharmacy/healthcare bills
* Household purchases
* Personal-care purchases
* Clothing/shopping bills
* Restaurant bills
* Stationery/education purchases
* General retail POS bills
* GST invoices
* Bills with Tamil + English
* Tanglish
* Weight-based items
* Count-based items
* `Qty × Rate = Amount` layouts
* Simple `Item → Amount` layouts

But there is an important distinction:

**Gemini is the intelligent parser. Local OCR is the fallback parser.**

The local parser cannot reliably understand every arbitrary receipt layout because OCR gives us text, not the semantic understanding that Gemini provides. The improved rules make the fallback considerably more tolerant, but I would **keep Gemini as your primary parser** if accuracy is your priority.

Also, your current `pdfToCanvas()` deliberately processes only the **first PDF page**. I have preserved that because you specifically asked not to modify functionality. If your bills can be multi-page PDFs, that's one enhancement I'd make separately rather than silently changing your current workflow.
