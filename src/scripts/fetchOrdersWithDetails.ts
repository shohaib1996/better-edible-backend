import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import axiosBase from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────
// TYPES for helper JSON files
// ─────────────────────────────

interface RepDoc {
  _id: { $oid: string };
  name: string;
}

interface StoreDoc {
  _id: { $oid: string };
  name: string;
  address: string;
}

interface ProductDoc {
  _id: { $oid: string };
  productLine?: string;
  subProductLine?: string;
  itemName?: string;
  prices?: Record<string, { price?: number; discountPrice?: number }>;
  price?: number;
  discountPrice?: number;
}

type OrderStatus =
  | "submitted"
  | "accepted"
  | "manifested"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

interface OrderItem {
  product: { $oid: string } | null;
  name: string;
  unitLabel: string | null;
  unitPrice: number;
  discountPrice?: number;
  qty: number;
  lineTotal: number;
  appliedDiscount: boolean;
}

interface MigratedOrder {
  orderNumber: number | null;
  store: { $oid: string } | null;
  rep: { $oid: string } | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment: {
    method: "cash" | "card" | "bank" | "stripe";
    amount: number;
    collected: boolean;
  };
  status: OrderStatus;
  deliveryDate: string | null; // ISO string
  dueDate: string | null;
  note: string;
  discountType: "flat" | "percent";
  discountValue: number;
}

// ─────────────────────────────
// Helpers
// ─────────────────────────────

const BASE_URL =
  process.env.OLD_BASE_URL?.replace(/\/+$/, "") || "https://better-edibles.com";

const jar = new CookieJar();
const axios = wrapper(
  axiosBase.create({
    baseURL: BASE_URL,
    jar,
    withCredentials: true,
    maxRedirects: 5,
  })
);

const rootDir = path.join(__dirname, "../..");

function readJson<T>(filename: string): T {
  const p = path.join(rootDir, filename);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw) as T;
}

function normalize(str: string): string {
  return str.replace(/\s+/g, " ").trim().toLowerCase();
}

// ─────────────────────────────
// Load reps / stores / products
// ─────────────────────────────

const reps: RepDoc[] = readJson<RepDoc[]>("better-edibles.reps.json");
const stores: StoreDoc[] = readJson<StoreDoc[]>("better-edibles.stores.json");
const products: ProductDoc[] = readJson<ProductDoc[]>(
  "better-edibles.products.json"
);

// rep map by name
const repMapByName = new Map<string, string>();
for (const rep of reps) {
  repMapByName.set(normalize(rep.name), rep._id.$oid);
}

// store map by normalized name → list (because duplicates like “LA MOTA …”)
const storeMapByName = new Map<string, StoreDoc[]>();
for (const store of stores) {
  const key = normalize(store.name);
  const arr = storeMapByName.get(key) ?? [];
  arr.push(store);
  storeMapByName.set(key, arr);
}

// product lookup helper
function findProduct(
  rawName: string,
  unitLabelRaw: string | null,
  unitPrice?: number
): ProductDoc | null {
  // Example rawName: "Original - Hybrid", "Fruity - Sativa", "SPLIT QUADS"
  const cleaned = rawName.replace(/\u00a0/g, " ").trim();
  const [left, right] = cleaned.split("-").map((p) => p.trim());
  const baseName = left || cleaned;
  const baseKey = normalize(baseName);

  // If unitLabelRaw isn't provided, try from right side
  const unitCandidate = unitLabelRaw || right || "";
  const unit = normalize(unitCandidate);
  const isStrain = unit === "hybrid" || unit === "indica" || unit === "sativa";

  // Special handling for BLISS products
  // Old: "BLISS - Pineapple" → New: productLine="BLISS Cannabis Syrup", subProductLine="Pineapple"
  if (baseKey === "bliss" && unit) {
    const blissProducts = products.filter(
      (p) => p.productLine && normalize(p.productLine).includes("bliss")
    );
    const match = blissProducts.find(
      (p) => p.subProductLine && normalize(p.subProductLine) === unit
    );
    if (match) return match;
  }

  // Special handling for Fifty-One Fifty products
  // Old: "Fifty - One Fifty" → New: productLine="Fifty-One Fifty", itemName varies
  // Match by price since old system doesn't capture specific item name
  if (baseKey === "fifty" && unitPrice) {
    const fiftyProducts = products.filter(
      (p) => p.productLine && normalize(p.productLine).includes("fifty")
    );
    const match = fiftyProducts.find(
      (p) => p.price === unitPrice || p.discountPrice === unitPrice
    );
    if (match) return match;
  }

  // Strict match by subProductLine or itemName
  let candidates = products.filter(
    (p) =>
      (p.subProductLine && normalize(p.subProductLine) === baseKey) ||
      (p.itemName && normalize(p.itemName) === baseKey)
  );

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1 && isStrain) {
    const withUnit = candidates.filter((p) => p.prices && p.prices[unit]);
    if (withUnit.length === 1) return withUnit[0];
    if (withUnit.length > 1) return withUnit[0];
  }

  // Fuzzy fallback
  candidates = products.filter(
    (p) =>
      (p.subProductLine && normalize(p.subProductLine).includes(baseKey)) ||
      (p.itemName && normalize(p.itemName).includes(baseKey))
  );
  return candidates[0] ?? null;
}

function findStoreId(
  storeName: string,
  address: string
): { $oid: string } | null {
  const key = normalize(storeName);
  const candidates = storeMapByName.get(key);
  if (!candidates || candidates.length === 0) {
    console.warn(`⚠️  No store match for: "${storeName}"`);
    return null;
  }
  if (candidates.length === 1) {
    return { $oid: candidates[0]._id.$oid };
  }
  // If multiple with same name, try by partial address match
  const addrKey = normalize(address.split(/\s{2,}/)[0]);
  const match =
    candidates.find((s) => normalize(s.address).includes(addrKey)) ||
    candidates[0];

  return { $oid: match._id.$oid };
}

function findRepId(repName: string): { $oid: string } | null {
  const key = normalize(repName);
  const id = repMapByName.get(key);
  if (!id) {
    console.warn(`⚠️  No rep match for: "${repName}"`);
    return null;
  }
  return { $oid: id };
}

function parseMoney(str: string): number {
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function parseDateFromMMDDYYYY(str: string | null | undefined): string | null {
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(
    2,
    "0"
  )}T00:00:00.000Z`;
  return iso;
}

// ─────────────────────────────
// Login
// ─────────────────────────────

async function loginOldPortal() {
  const username = process.env.OLD_ADMIN_USERNAME;
  const password = process.env.OLD_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("OLD_ADMIN_USERNAME / OLD_ADMIN_PASSWORD not set in .env");
  }

  console.log("🔐 Logging in to old reps portal...");

  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  form.set("submit", "Login");

  await axios.post("/reps/index.php", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
    validateStatus: (s) => s === 302 || s === 200,
  });

  console.log("✅ Login OK (session cookie stored).");
}

// ─────────────────────────────
// Parse orders-past-1000.html (top list)
// ─────────────────────────────

interface TopOrderRow {
  orderNumber: number | null;
  storeName: string;
  address: string;
  repName: string;
  shippedDateStr: string | null;
  totalAmount: number;
  note: string;
  orderId: string; // "i" in query
  storeParam: string; // "s" in query
}

function parseTopOrders(): TopOrderRow[] {
  const htmlPath = path.join(rootDir, "orders-past-1000.html");
  console.log("📄 Reading orders-past-1000.html from:", htmlPath);
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  const rows: TopOrderRow[] = [];

  $("section.docs").each((i, el) => {
    const section = $(el);

    // orderNumber
    const orderNumText = section
      .find("dt:contains('Order#')")
      .next("dd")
      .text()
      .replace(/[:\s]/g, "")
      .trim();
    const orderNumber = orderNumText ? parseInt(orderNumText, 10) : null;

    const storeName = section.find("h4 a").text().trim();
    const address = section.find("p.text-info").first().text().trim();

    const repName = section
      .find("dt:contains('Rep')")
      .next("dd")
      .text()
      .replace(/^:\s*/, "")
      .trim();

    const shippedDateStr =
      section.find("input[name='seldate']").val()?.toString().trim() || null;

    const amountText = section
      .find("dt:contains('Amount')")
      .next("dd")
      .text()
      .replace(/^:\s*\$/, "")
      .trim();
    const totalAmount = parseMoney(amountText);

    const note = section
      .find("div.span10 p.note-area")
      .text()
      .replace(/^\s*Note\s*:/i, "")
      .trim();

    // Pull i & s from the onclick attribute
    const onClickAttr = section
      .find("h4 a[onclick*='order-details.php']")
      .attr("onclick");

    let orderId = "";
    let storeParam = "";

    if (onClickAttr) {
      const m = onClickAttr.match(/order-details\.php\?([^']+)/);
      if (m) {
        const qs = new URLSearchParams(m[1]);
        orderId = qs.get("i") || "";
        storeParam = qs.get("s") || "";
      }
    }

    rows.push({
      orderNumber,
      storeName,
      address,
      repName,
      shippedDateStr,
      totalAmount,
      note,
      orderId,
      storeParam,
    });
  });

  console.log(
    `✅ Parsed ${rows.length} top-level orders from orders-past-1000.html`
  );
  return rows;
}

// ─────────────────────────────
// Fetch & parse order-details.php
// ─────────────────────────────

async function fetchOrderDetails(orderId: string, storeParam: string) {
  if (!orderId || !storeParam) {
    console.warn(
      `⚠️  Missing orderId/storeParam for order; skipping details (i=${orderId}, s=${storeParam})`
    );
    return [] as OrderItem[];
  }

  const url = `/reps/admin/order-details.php?i=${orderId}&s=${storeParam}`;
  console.log(`  🔍 Fetching details: ${url}`);

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const items: OrderItem[] = [];
  const rows = $("table.table.table-bordered tbody tr");
  console.log(`    Found ${rows.length} rows for order ${orderId}`);

  rows.each((i, row) => {
    const $row = $(row);
    const nameCell = $row.find("td.cart-product-name-info");
    const qtyCell = $row.find("td.cart-product-quantity");
    const unitPriceCell = $row.find("td.cart-product-sub-total").first();
    const totalCell = $row.find("td.cart-product-grand-total");

    if (!nameCell.length) return;

    const rawName = nameCell.text().replace(/\s+/g, " ").trim();
    const qty = parseInt(qtyCell.text().trim(), 10) || 0;
    const unitPrice = parseMoney(unitPriceCell.text());
    const lineTotal = parseMoney(totalCell.text());

    // Extract “Original - Hybrid” → baseName + unitLabel
    const cleaned = rawName.replace(/\u00a0/g, " ").trim();
    const [left, right] = cleaned.split("-").map((p) => p.trim());
    const baseName = left || cleaned;
    const unitLabel = right ? right.toLowerCase() : null;

    const productDoc = findProduct(baseName, unitLabel, unitPrice);
    if (!productDoc) {
      console.warn(`    ⚠️  No product match for line: "${rawName}"`);
    }

    // Try to infer discount: for migrated history we’ll treat
    // unitPrice as the final price and mark no discount.
    const discountPrice = unitPrice;
    const appliedDiscount = false;

    items.push({
      product: productDoc ? { $oid: productDoc._id.$oid } : null,
      name: baseName,
      unitLabel,
      unitPrice,
      discountPrice,
      qty,
      lineTotal,
      appliedDiscount,
    });
  });

  return items;
}

// ─────────────────────────────
// Main runner
// ─────────────────────────────

async function main() {
  try {
    await loginOldPortal();

    const topOrders = parseTopOrders();

    const migrated: MigratedOrder[] = [];

    for (const [idx, row] of topOrders.entries()) {
      console.log(
        `\n===============================\nProcessing order ${idx + 1}/${
          topOrders.length
        }  (#${row.orderNumber ?? "?"} – ${row.storeName})`
      );

      const storeId = findStoreId(row.storeName, row.address);
      const repId = row.repName ? findRepId(row.repName) : null;

      const deliveryDateIso = parseDateFromMMDDYYYY(row.shippedDateStr);

      const items = await fetchOrderDetails(row.orderId, row.storeParam);

      // If detail items exist, recompute subtotal & total from them;
      // otherwise use the amount from the shipped list.
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.lineTotal;
      }
      if (!subtotal) {
        subtotal = row.totalAmount;
      }

      const total = subtotal; // no tax/discount available in old system
      const tax = 0;
      const discount = 0;

      const migratedOrder: MigratedOrder = {
        orderNumber: row.orderNumber, // keep old number if present, otherwise null → your schema will auto-increment
        store: storeId,
        rep: repId,
        items,
        subtotal,
        tax,
        discount,
        total,
        payment: {
          method: "cash",
          amount: total,
          collected: false,
        },
        status: "shipped", // this script is for shipped-orders page
        deliveryDate: deliveryDateIso,
        dueDate: null,
        note: row.note,
        discountType: "flat",
        discountValue: 0,
      };

      migrated.push(migratedOrder);
    }

    const outPath = path.join(rootDir, "orders.migrated2.json");
    fs.writeFileSync(outPath, JSON.stringify(migrated, null, 2));
    console.log(
      `\n✅ Done. Wrote ${migrated.length} orders with items to ${outPath}`
    );
  } catch (err: any) {
    console.error("💥 Script failed:", err?.message || err);
    process.exit(1);
  }
}

main();
