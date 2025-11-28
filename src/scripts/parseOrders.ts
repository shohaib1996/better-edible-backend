import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

// ─────────────────────────────────────────────
// CLEAN STRING HELPER (fixes NBSP & weird chars)
// ─────────────────────────────────────────────
function clean(value: any): string {
  if (!value) return "";
  return value
    .toString()
    .replace(/[\u00A0]/g, " ") // fix non-breaking spaces
    .replace(/[^\x20-\x7E]/g, " ") // remove hidden unicode
    .replace(/^\s*:?/, "") // remove leading colon
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

// Parse "MM/DD/YYYY" into a UTC Date (midnight)
function parseMmDdYyyyToUTC(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleaned = clean(dateStr);
  if (!cleaned) return null;

  const parts = cleaned.split(/[/-]/);
  if (parts.length !== 3) return null;

  const [mmStr, ddStr, yyyyStr] = parts;
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);
  const yyyy = parseInt(yyyyStr, 10);

  if (!mm || !dd || !yyyy) return null;

  // Force UTC midnight
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

// ─────────────────────────────────────────────
// LOAD REPS
// ─────────────────────────────────────────────
const repsPath = path.join(__dirname, "../../better-edibles.reps.json");
const reps = JSON.parse(fs.readFileSync(repsPath, "utf8"));

// Map: "STEVEN CHO" → ObjectId
const repMap: Record<string, string> = {};
for (const rep of reps) {
  repMap[rep.name.trim().toUpperCase()] = rep._id.$oid;
}

// ─────────────────────────────────────────────
// LOAD STORES
// ─────────────────────────────────────────────
const storesPath = path.join(__dirname, "../../better-edibles.stores.json");
const stores = JSON.parse(fs.readFileSync(storesPath, "utf8"));

// Map: "UPLIFT BOTANICALS" → ObjectId
const storeMap: Record<string, string> = {};
for (const s of stores) {
  storeMap[s.name.trim().toUpperCase()] = s._id.$oid;
}

// ─────────────────────────────────────────────
// LOAD HTML
// ─────────────────────────────────────────────
const htmlPath = path.join(__dirname, "../../orders.html");
const html = fs.readFileSync(htmlPath, "utf8");
const $ = cheerio.load(html);

// ─────────────────────────────────────────────
// ORDER OUTPUT TYPE
// ─────────────────────────────────────────────
interface ParsedOrder {
  orderNumber: number | null;
  store: { $oid: string } | null;
  rep: { $oid: string } | null;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment: {
    method: string;
    amount: number;
    collected: boolean;
  };
  status: string;
  note: string;
  deliveryDate: Date | null;
  dueDate: null;
  discountType: string;
  discountValue: number;
}

const orders: ParsedOrder[] = [];

// ─────────────────────────────────────────────
// PARSE EACH ORDER BLOCK
// ─────────────────────────────────────────────
$("section.docs").each((i, el) => {
  const section = $(el);

  // ORDER NUMBER
  const orderNumberText = clean(
    section.find("dt:contains('Order#')").next("dd").text()
  );
  const orderNumber = orderNumberText ? parseInt(orderNumberText, 10) : null;

  // STORE
  const storeName = clean(section.find("h4 a").text()).toUpperCase();
  const storeId = storeMap[storeName] || null;

  // REP
  const repText = clean(
    section.find("dt:contains('Rep')").next("dd").text()
  ).toUpperCase();
  const repId = repMap[repText] || null;

  // DELIVERY DATE = shipped date input value
  const shippedRaw = section.find("input[name='seldate']").val();
  const deliveryDate = parseMmDdYyyyToUTC(
    shippedRaw ? shippedRaw.toString() : null
  );

  // NOTE
  const note = clean(
    section.find("div.span10 p.note-area").text().replace("Note", "")
  );

  // AMOUNT
  const amountText = clean(
    section.find("dt:contains('Amount')").next("dd").text()
  ).replace("$", "");
  const amount = amountText ? parseFloat(amountText) : 0;

  orders.push({
    orderNumber,
    store: storeId ? { $oid: storeId } : null,
    rep: repId ? { $oid: repId } : null,
    items: [],
    subtotal: amount,
    tax: 0,
    discount: 0,
    total: amount,
    payment: {
      method: "cash",
      amount,
      collected: false,
    },
    status: "shipped",
    note,
    deliveryDate,
    dueDate: null,
    discountType: "flat",
    discountValue: 0,
  });
});

// ─────────────────────────────────────────────
// SAVE OUTPUT
// ─────────────────────────────────────────────
const outputPath = path.join(__dirname, "../../orders.json");
fs.writeFileSync(outputPath, JSON.stringify(orders, null, 2));

console.log(`✅ orders.json created successfully (${orders.length} orders)`);
