// bill-parser.mjs - Tamil & English Bilingual OCR & Receipt Parser

// Comprehensive Tamil Script & Tanglish to English Grocery Dictionary
export const TAMIL_GROCERY_KNOWLEDGE = [
  // Grains, Dals & Pulses
  { triggers: [/துவரம்\s*பருப்பு/i, /துவரம்பருப்பு/i, /thuvaram\s*paruppu/i, /toor\s*dhal/i, /toor\s*dal/i], name: "Toor Dal", cat: "Grains", unit: "kg" },
  { triggers: [/உளுத்தம்\s*பருப்பு/i, /உளுந்து/i, /urad\s*dal/i, /ulunthu/i, /ulandhu/i], name: "Urad Dal", cat: "Grains", unit: "kg" },
  { triggers: [/பாசிப்பருப்பு/i, /பாசி\s*பருப்பு/i, /moong\s*dal/i, /paasi\s*paruppu/i], name: "Moong Dal", cat: "Grains", unit: "kg" },
  { triggers: [/கடலைப்பருப்பு/i, /கடலை\s*பருப்பு/i, /chana\s*dal/i, /kadalai\s*paruppu/i], name: "Chana Dal", cat: "Grains", unit: "kg" },
  { triggers: [/பொன்னி\s*அரிசி/i, /அரிசி/i, /ponni\s*rice/i, /raw\s*rice/i, /boiled\s*rice/i, /arisi/i], name: "Rice", cat: "Grains", unit: "kg" },
  { triggers: [/கோதுமை\s*மாவு/i, /கோதுமை/i, /wheat\s*flour/i, /atta/i, /aashirvaad/i], name: "Wheat Flour / Atta", cat: "Grains", unit: "kg" },
  { triggers: [/மைதா/i, /maida/i], name: "Maida", cat: "Grains", unit: "kg" },
  { triggers: [/ரவை/i, /ரவா/i, /rava/i, /sooji/i], name: "Rava / Sooji", cat: "Grains", unit: "kg" },

  // Spices & Condiments
  { triggers: [/கடுகு/i, /kadugu/i, /mustard/i], name: "Mustard Seeds", cat: "Grocery", unit: "g" },
  { triggers: [/சீரகம்/i, /seeragam/i, /jeera/i, /cumin/i], name: "Cumin Seeds", cat: "Grocery", unit: "g" },
  { triggers: [/மிளகு/i, /milagu/i, /black\s*pepper/i, /pepper/i], name: "Black Pepper", cat: "Grocery", unit: "g" },
  { triggers: [/வெந்தயம்/i, /vendhayam/i, /fenugreek/i], name: "Fenugreek", cat: "Grocery", unit: "g" },
  { triggers: [/மஞ்சள்\s*தூள்/i, /மஞ்சள்/i, /turmeric/i, /manjal/i], name: "Turmeric Powder", cat: "Grocery", unit: "g" },
  { triggers: [/மிளகாய்\s*தூள்/i, /மிளகாய்/i, /chilli\s*powder/i, /milagai/i], name: "Chilli Powder", cat: "Grocery", unit: "g" },
  { triggers: [/மல்லி\s*தூள்/i, /தனியா/i, /coriander\s*powder/i, /dhaniya/i], name: "Coriander Powder", cat: "Grocery", unit: "g" },
  { triggers: [/பெருங்காயம்/i, /asafoetida/i, /perungayam/i, /lg\s*perungayam/i], name: "Asafoetida", cat: "Grocery", unit: "g" },
  { triggers: [/புளி/i, /tamarind/i, /puli/i], name: "Tamarind", cat: "Grocery", unit: "kg" },

  // Cooking Essentials & Oils
  { triggers: [/நல்லெண்ணெய்/i, /gingelly\s*oil/i, /sesame\s*oil/i, /idhayam/i], name: "Gingelly Oil", cat: "Grocery", unit: "L" },
  { triggers: [/கடலை\s*எண்ணெய்/i, /groundnut\s*oil/i, /peanut\s*oil/i], name: "Groundnut Oil", cat: "Grocery", unit: "L" },
  { triggers: [/சூரியகாந்தி\s*எண்ணெய்/i, /sunflower\s*oil/i, /gold\s*winner/i], name: "Sunflower Oil", cat: "Grocery", unit: "L" },
  { triggers: [/எண்ணெய்/i, /cooking\s*oil/i, /oil/i], name: "Cooking Oil", cat: "Grocery", unit: "L" },
  { triggers: [/நெய்/i, /ghee/i, /ney/i], name: "Ghee", cat: "Dairy", unit: "ml" },
  { triggers: [/சர்க்கரை/i, /சீனி/i, /sugar/i, /sakkarai/i], name: "Sugar", cat: "Grocery", unit: "kg" },
  { triggers: [/நாட்டு\s*சர்க்கரை/i, /வெல்லம்/i, /jaggery/i, /nattu\s*sakkarai/i], name: "Jaggery", cat: "Grocery", unit: "kg" },
  { triggers: [/உப்பு/i, /salt/i, /uppu/i, /tata\s*salt/i], name: "Salt", cat: "Grocery", unit: "kg" },

  // Fresh Produce & Daily Items
  { triggers: [/வெங்காயம்/i, /onion/i, /vengayam/i, /chinna\s*vengayam/i], name: "Onion", cat: "Vegetables", unit: "kg" },
  { triggers: [/தக்காளி/i, /tomato/i, /thakkali/i], name: "Tomato", cat: "Vegetables", unit: "kg" },
  { triggers: [/உருளைக்கிழங்கு/i, /potato/i, /urulaikilangu/i], name: "Potato", cat: "Vegetables", unit: "kg" },
  { triggers: [/பூண்டு/i, /garlic/i, /poondu/i], name: "Garlic", cat: "Vegetables", unit: "kg" },
  { triggers: [/இஞ்சி/i, /ginger/i, /inji/i], name: "Ginger", cat: "Vegetables", unit: "g" },
  { triggers: [/பச்சை\s*மிளகாய்/i, /green\s*chilli/i], name: "Green Chilli", cat: "Vegetables", unit: "g" },
  { triggers: [/பால்/i, /milk/i, /aavin/i, /arokya/i], name: "Milk", cat: "Dairy", unit: "L" },
  { triggers: [/முட்டை/i, /egg/i, /muttai/i], name: "Eggs", cat: "Dairy", unit: "pcs" },
  { triggers: [/தேயிலை/i, /டீ/i, /tea/i, /bru/i, /taj\s*mahal/i, /red\s*label/i], name: "Tea / Coffee", cat: "Grocery", unit: "g" },

  // Household & Personal Hygiene
  { triggers: [/சோப்பு/i, /cinthol/i, /hamam/i, /lifebuoy/i, /lux/i, /mysore\s*sandal/i, /medimix/i], name: "Bath Soap", cat: "Personal care", unit: "pcs" },
  { triggers: [/துணி\s*சோப்பு/i, /டிடர்ஜென்ட்/i, /surf\s*excel/i, /ariel/i, /rin/i, /detergent/i], name: "Detergent", cat: "Household", unit: "kg" },
  { triggers: [/பாத்திரம்\s*கழுவும்/i, /vim\s*bar/i, /exo/i, /pril/i], name: "Dishwash Bar", cat: "Household", unit: "pcs" },
  { triggers: [/பற்பசை/i, /colgate/i, /close\s*up/i, /sensodyne/i, /paste/i], name: "Toothpaste", cat: "Personal care", unit: "pcs" }
];

export const REJECT_PATTERNS = [
  /no[\s.:-]*\d+/i,
  /road|street|nagar|salai|lane|pallavaram|chennai|tamil\s*nadu|pincode|pin[\s.:-]*\d{6}/i,
  /தெரு|சாலை|நகர்|சென்னை|பல்லாவரம்|விலாசம்/i,
  /bill\s*no|inv\s*no|invoice|estimate|cash\s*bill|memo|counter/i,
  /ரசீது\s*எண்|பில்\s*எண்/i,
  /phone|mobile|cell|ph[\s.:-]*\d+/i,
  /தொலைபேசி|அலைபேசி/i,
  /gstin|tin|fssai|cin/i,
  /paid\s*[:=]|returned|change|balance|round\s*off|sub\s*total/i,
  /செலுத்தியது|மீதி|தொகை|நன்றி/i,
  /thank\s*you|visit\s*again|save\s*trees|customer/i
];

export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 1800;
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
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
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";
      resolve();
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
  const scale = Math.min(2, 1600 / vp0.width);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  return canvas;
}

let tessReady = null;
export function loadTess() {
  if (tessReady) return tessReady;
  tessReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("OCR engine failed to load"));
    document.head.appendChild(s);
  });
  return tessReady;
}

// Bilingual local OCR: runs both English and Tamil models
export async function localOcr(canvas, statusCb) {
  await loadTess();
  const result = await window.Tesseract.recognize(canvas, "eng+tam", {
    logger: m => {
      if (statusCb && m.status) statusCb(`${m.status} ${m.progress ? Math.round(m.progress * 100) + "%" : ""}`);
    }
  });
  return (result && result.data && result.data.text) || "";
}

// Translates and maps extracted Tamil text to standard English
export function translateTamilItemName(text) {
  for (const item of TAMIL_GROCERY_KNOWLEDGE) {
    for (const rgx of item.triggers) {
      if (rgx.test(text)) {
        return { name: item.name, cat: item.cat, unit: item.unit };
      }
    }
  }
  return null;
}

// AI-based parser: Interprets Tamil & English bills into structured English JSON
export async function parseWithGemini(base64Data, apiKey, categoriesStr, defaultDate, statusCb) {
  if (statusCb) statusCb("Translating & reading bill via Gemini Vision AI...");
  const prompt = `You are an expert grocery receipt reader for Tamil Nadu provision shops and supermarkets.
The receipt may be printed in Tamil script, English, or Tanglish (Tamil written in English script).

Translate all items accurately into standard ENGLISH product names and extract only the target fields specified.

Return ONLY a pure JSON object adhering strictly to this schema:
{
  "store": "Exact store or merchant name",
  "date": "YYYY-MM-DD (convert any DD/MM/YYYY or DD-MM-YY to ISO). Defaults to ${defaultDate}",
  "pay": "Cash, UPI, or Card",
  "total": 0.00,
  "items_count": 0,
  "items": [
    {
      "name": "Standard English product name (e.g., 'துவரம் பருப்பு' -> 'Toor Dal', 'சீரகம்' -> 'Cumin Seeds', 'எண்ணெய்' -> 'Cooking Oil')",
      "qty": 1.0,
      "unit": "kg, g, L, ml, or pcs",
      "rate": 0.00,
      "amount": 0.00,
      "cat": "Closest category from: ${categoriesStr}"
    }
  ]
}

STRICT INSTRUCTIONS:
1. TARGET DATA ONLY: Extract only store name, purchase date, payment mode, total bill amount, items count, and line items (name, qty, rate, amount).
2. EXCLUDE NOISE: Do NOT include address lines (e.g., 'Road', 'Street', 'Pallavaram', 'Chennai', 'தெரு'), phone numbers, GST/tin numbers, invoice numbers ('Bill No'), or payment breakdown lines ('Paid', 'Returned', 'Change').
3. TAMIL TRANSLATION: Every item name in the 'items' array MUST be translated to its exact English common name.
4. QUANTITY & RATE: Correctly separate the unit quantity/weight, rate per unit, and net amount.
5. Return raw JSON only with no markdown or formatting wrappers.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Data } }
        ]
      }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Gemini Vision rejected request");
  }
  const data = await res.json();
  const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
  parsed.items_count = parsed.items ? parsed.items.length : 0;
  return parsed;
}

// Fallback Local Heuristic Parser for Tamil & English
export function parseLocalText(rawText, defaultDate) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

  let store = "";
  for (const line of lines.slice(0, 6)) {
    if (!REJECT_PATTERNS.some(re => re.test(line)) && line.length >= 3 && !/^\d/.test(line)) {
      store = line;
      break;
    }
  }

  let date = defaultDate;
  const dMatch = rawText.match(/([0-3]?\d)[\/\-.]([01]?\d)[\/\-.]((?:20)?\d\d)/);
  if (dMatch) {
    let dd = +dMatch[1], mm = +dMatch[2], yy = +dMatch[3];
    if (yy < 100) yy += 2000;
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }

  let billTotal = 0;
  const tMatch = rawText.match(/(?:total|net\s*amt|amount\s*payable|grand\s*total|மொத்தம்|தொகை)[^\d\n]*([0-9,]+\.?[0-9]{0,2})/i);
  if (tMatch) billTotal = parseFloat(tMatch[1].replace(/,/g, "")) || 0;

  const items = [];
  for (let line of lines) {
    if (REJECT_PATTERNS.some(re => re.test(line))) continue;

    const nums = [];
    const numRegex = /(?:\b|^)(\d+(?:\.\d+)?)(?:\b|$)/g;
    let nm;
    while ((nm = numRegex.exec(line)) !== null) {
      nums.push(parseFloat(nm[1]));
    }
    if (nums.length < 1) continue;

    let netAmount = nums[nums.length - 1];
    if (isNaN(netAmount) || netAmount <= 0 || netAmount > 50000) continue;

    let qty = 1, unit = "pcs", rate = netAmount;
    const unitMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|nos|கிலோ|கிராம்|லிட்டர்)/i);
    if (unitMatch) {
      qty = parseFloat(unitMatch[1]) || 1;
      const uStr = unitMatch[2].toLowerCase();
      if (uStr.startsWith("kg") || uStr === "கிலோ") unit = "kg";
      else if (uStr.startsWith("g") || uStr === "கிராம்") unit = "g";
      else if (uStr.startsWith("l") || uStr === "லிட்டர்") unit = "L";
      else if (uStr.startsWith("ml")) unit = "ml";
    }

    if (nums.length >= 3) {
      const possibleQty = nums[nums.length - 3];
      const possibleRate = nums[nums.length - 2];
      if (Math.abs(possibleQty * possibleRate - netAmount) <= 1.0) {
        qty = possibleQty;
        rate = possibleRate;
      }
    } else if (qty > 0) {
      rate = +(netAmount / qty).toFixed(2);
    }

    let cleanName = line
      .replace(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|nos|கிலோ|கிராம்|லிட்டர்)/gi, "")
      .replace(/[\d.,]+$/g, "")
      .replace(/[0-9*#@₹$:%]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (cleanName.length < 2) continue;

    // Translate Tamil / Tanglish text into proper English grocery name
    const translation = translateTamilItemName(cleanName) || translateTamilItemName(line);
    let finalName = cleanName;
    let detectedCategory = "Grocery";

    if (translation) {
      finalName = translation.name;
      detectedCategory = translation.cat;
      if (unit === "pcs" && translation.unit) unit = translation.unit;
    }

    items.push({
      name: finalName,
      qty: qty,
      unit: unit,
      rate: rate,
      amount: netAmount,
      cat: detectedCategory,
      on: true
    });
  }

  return {
    store,
    date,
    pay: /upi|gpay|phonepe/i.test(rawText) ? "UPI" : /card|pos/i.test(rawText) ? "Card" : "Cash",
    total: billTotal,
    items_count: items.length,
    items
  };
}
