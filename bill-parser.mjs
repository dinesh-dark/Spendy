// bill-parser.mjs - Dedicated Strict Schema Receipt Parser

export const UNITS = ["kg", "g", "L", "ml", "pcs"];
export const CATS = ["Vegetables", "Fruits", "Grains", "Dairy", "Grocery", "Meat & fish", "Household", "Personal care", "Dining & Outing", "Bills & Utilities", "Healthcare", "Shopping", "Education", "Miscellaneous"];

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
  { triggers: [/துவரம்\s*பருப்பு/i, /துவரம்பருப்பு/i, /thuvaram\s*paruppu/i, /toor\s*dhal/i, /toor\s*dal/i], name: "Toor Dal", category: "Grains", unit: "kg" },
  { triggers: [/உளுத்தம்\s*பருப்பு/i, /உளுந்து/i, /urad\s*dal/i, /ulunthu/i, /ulandhu/i], name: "Urad Dal", category: "Grains", unit: "kg" },
  { triggers: [/பாசிப்பருப்பு/i, /பாசி\s*பருப்பு/i, /moong\s*dal/i, /paasi\s*paruppu/i], name: "Moong Dal", category: "Grains", unit: "kg" },
  { triggers: [/கடலைப்பருப்பு/i, /கடலை\s*பருப்பு/i, /chana\s*dal/i, /kadalai\s*paruppu/i], name: "Chana Dal", category: "Grains", unit: "kg" },
  { triggers: [/பொன்னி\s*அரிசி/i, /அரிசி/i, /ponni\s*rice/i, /raw\s*rice/i, /arisi/i], name: "Rice", category: "Grains", unit: "kg" },
  { triggers: [/கோதுமை\s*மாவு/i, /கோதுமை/i, /wheat\s*flour/i, /atta/i], name: "Wheat Flour / Atta", category: "Grains", unit: "kg" },
  { triggers: [/மைதா/i, /maida/i], name: "Maida", category: "Grains", unit: "kg" },
  { triggers: [/ரவை/i, /ரவா/i, /rava/i, /sooji/i], name: "Rava / Sooji", category: "Grains", unit: "kg" },
  { triggers: [/கடுகு/i, /kadugu/i, /mustard/i], name: "Mustard Seeds", category: "Grocery", unit: "g" },
  { triggers: [/சீரகம்/i, /seeragam/i, /jeera/i, /cumin/i], name: "Cumin Seeds", category: "Grocery", unit: "g" },
  { triggers: [/மிளகு/i, /milagu/i, /black\s*pepper/i, /pepper/i], name: "Black Pepper", category: "Grocery", unit: "g" },
  { triggers: [/நல்லெண்ணெய்/i, /gingelly\s*oil/i, /sesame\s*oil/i], name: "Gingelly Oil", category: "Grocery", unit: "L" },
  { triggers: [/கடலை\s*எண்ணெய்/i, /groundnut\s*oil/i], name: "Groundnut Oil", category: "Grocery", unit: "L" },
  { triggers: [/சூரியகாந்தி\s*எண்ணெய்/i, /sunflower\s*oil/i, /gold\s*winner/i], name: "Sunflower Oil", category: "Grocery", unit: "L" },
  { triggers: [/எண்ணெய்/i, /cooking\s*oil/i, /oil/i], name: "Cooking Oil", category: "Grocery", unit: "L" },
  { triggers: [/நெய்/i, /ghee/i], name: "Ghee", category: "Dairy", unit: "ml" },
  { triggers: [/சர்க்கரை/i, /சீனி/i, /sugar/i, /sakkarai/i], name: "Sugar", category: "Grocery", unit: "kg" },
  { triggers: [/உப்பு/i, /salt/i, /uppu/i], name: "Salt", category: "Grocery", unit: "kg" },
  { triggers: [/வெங்காயம்/i, /onion/i, /vengayam/i], name: "Onion", category: "Vegetables", unit: "kg" },
  { triggers: [/தக்காளி/i, /tomato/i, /thakkali/i], name: "Tomato", category: "Vegetables", unit: "kg" },
  { triggers: [/பூண்டு/i, /garlic/i, /poondu/i], name: "Garlic", category: "Vegetables", unit: "kg" },
  { triggers: [/சோப்பு/i, /cinthol/i, /hamam/i, /soap/i], name: "Bath Soap", category: "Personal care", unit: "pcs" }
];

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

function normalize(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
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

export async function localOcr(canvas, statusCb) {
  await loadTess();
  const result = await window.Tesseract.recognize(canvas, "eng+tam", {
    logger: m => {
      if (!statusCb || !m || !m.status) return;
      const progress = typeof m.progress === "number" ? ` ${Math.round(m.progress * 100)}%` : "";
      statusCb(`${m.status}${progress}`);
    }
  });
  return (result && result.data && result.data.text) || "";
}

/**
 * AI OCR Parser enforcing the schema:
 * required: ["store", "date", "total", "payment", "items"]
 * items.required: ["name", "qty", "unit", "amount", "category"]
 */
export async function parseWithGemini(base64Data, apiKey, knownProducts = [], defaultDate, statusCb) {
  if (statusCb) statusCb("Reading and verifying bill via Gemini AI...");

  const prompt = `This is a shop receipt from India in INR. It may contain English, Tamil (தமிழ்), or Tanglish.
Extract EVERY purchased product line item and output STRICT JSON matching the exact schema.

STRICT INSTRUCTIONS:
1. ONLY EXTRACT ACTUAL PRODUCTS PURCHASED.
   NEVER include shop address, road names, pin codes, phone numbers, Bill No, HSN codes, barcode numbers, CGST/SGST/tax rows, total lines, discounts, savings, change, or payment rows in 'items'.
2. Translate Tamil product names to English Title Case (e.g. 'துவரம் பருப்பு' -> 'Toor Dal', 'சீரகம்' -> 'Cumin Seeds').
3. For pack sizes with multipliers (e.g. 'SUGAR 1KG' x 2), consolidate to qty: 2, unit: "kg".
4. 'amount' is the final net price paid for that specific line.
5. 'total' is the net payable grand total printed on the receipt.
6. Match against this product list if clearly applicable:
   ${Array.isArray(knownProducts) && knownProducts.length ? knownProducts.slice(0, 100).join(", ") : "(None)"}`;

  const geminiSchema = {
    type: "OBJECT",
    properties: {
      store: { type: "STRING", description: "Shop or merchant name only, or empty string" },
      date: { type: "STRING", description: "Date as YYYY-MM-DD or empty string" },
      total: { type: "NUMBER", description: "Final payable amount printed on bill, or 0" },
      payment: { type: "STRING", enum: ["Cash", "UPI", "Card", ""], description: "Payment method" },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Clean, short English product name in Title Case" },
            qty: { type: "NUMBER", description: "Numeric quantity purchased" },
            unit: { type: "STRING", enum: UNITS, description: "Unit of measurement" },
            amount: { type: "NUMBER", description: "Final line amount paid" },
            category: { type: "STRING", enum: CATS, description: "Category of the item" }
          },
          required: ["name", "qty", "unit", "amount", "category"]
        }
      }
    },
    required: ["store", "date", "total", "payment", "items"]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    throw new Error("AI returned invalid JSON.");
  }

  // Format and sanitize output strictly to target schema specifications
  const cleanItems = (Array.isArray(parsed.items) ? parsed.items : [])
    .map(i => {
      const q = safeNum(i.qty) || 1;
      const a = safeNum(i.amount);
      const catName = CATS.includes(i.category) ? i.category : "Grocery";
      return {
        name: String(i.name || "").trim().slice(0, 40),
        qty: q,
        unit: UNITS.includes(i.unit) ? i.unit : "pcs",
        amount: a,
        category: catName,
        cat: catName,
        on: true
      };
    })
    .filter(i => i.name && i.amount > 0 && !REJECT_PATTERNS.some(re => re.test(i.name)));

  return {
    store: String(parsed.store || "").trim().slice(0, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : defaultDate,
    total: safeNum(parsed.total),
    payment: ["Cash", "UPI", "Card"].includes(parsed.payment) ? parsed.payment : "Cash",
    items: cleanItems
  };
}

/**
 * Local Fallback OCR Parser conforming to the same strict schema
 */
export function parseLocalText(rawText, defaultDate) {
  const lines = String(rawText || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(normalize)
    .filter(Boolean);

  let store = "";
  for (const line of lines.slice(0, 6)) {
    if (!REJECT_PATTERNS.some(re => re.test(line)) && line.length >= 3 && !/^\d/.test(line)) {
      store = line.slice(0, 40);
      break;
    }
  }

  let date = defaultDate;
  const dMatch = rawText.match(/([0-3]?\d)[\/\-.]([01]?\d)[\/\-.]((?:20)?\d\d)/);
  if (dMatch) {
    let dd = +dMatch[1], mm = +dMatch[2], yy = +dMatch[3];
    if (yy < 100) yy += 2000;
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  let total = 0;
  const tMatch = rawText.match(/(?:total|net\s*amt|amount\s*payable|grand\s*total|மொத்தம்)[^\d\n]*([0-9,]+\.?[0-9]{0,2})/i);
  if (tMatch) total = parseFloat(tMatch[1].replace(/,/g, "")) || 0;

  const items = [];
  for (const line of lines) {
    if (REJECT_PATTERNS.some(re => re.test(line))) continue;

    const nums = (line.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
    if (!nums.length) continue;

    let amount = nums[nums.length - 1];
    if (!amount || amount <= 0 || amount > 500000) continue;

    let qty = 1, unit = "pcs";
    const uMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|l|ltr|ltrs|ml|pcs|nos|கிலோ|கிராம்|லிட்டர்)/i);
    if (uMatch) {
      qty = safeNum(uMatch[1]) || 1;
      const uStr = uMatch[2].toLowerCase();
      if (uStr.startsWith("kg") || uStr === "கிலோ") unit = "kg";
      else if (uStr.startsWith("g") || uStr === "கிராம்") unit = "g";
      else if (uStr.startsWith("l") || uStr === "லிட்டர்") unit = "L";
      else if (uStr.startsWith("ml")) unit = "ml";
    }

    let cleanName = line
      .replace(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|l|ltr|ltrs|ml|pcs|nos|கிலோ|கிராம்|லிட்டர்)/gi, "")
      .replace(/\s+\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?\s*$/, "")
      .replace(/[0-9*#@₹$:%|]/g, "")
      .trim();

    cleanName = normalize(cleanName);
    if (cleanName.length < 2 || /^(qty|rate|amount|price|item|product)$/i.test(cleanName)) continue;

    let category = "Grocery";
    for (const entry of TAMIL_GROCERY_KNOWLEDGE) {
      if (entry.triggers.some(re => re.test(cleanName) || re.test(line))) {
        cleanName = entry.name;
        category = entry.category;
        if (unit === "pcs" && entry.unit) unit = entry.unit;
        break;
      }
    }

    items.push({
      name: cleanName.slice(0, 40),
      qty: safeNum(qty) || 1,
      unit: UNITS.includes(unit) ? unit : "pcs",
      amount: safeNum(amount),
      category,
      cat: category,
      on: true
    });
  }

  if (!total && items.length) {
    total = items.reduce((s, i) => s + i.amount, 0);
  }

  return {
    store,
    date,
    total: safeNum(total),
    payment: /upi|gpay/i.test(rawText) ? "UPI" : /card/i.test(rawText) ? "Card" : "Cash",
    items
  };
}
