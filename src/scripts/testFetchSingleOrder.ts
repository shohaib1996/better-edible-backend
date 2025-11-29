import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import axiosBase from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────
// TYPES
// ─────────────────────────────

interface ProductDoc {
  _id: { $oid: string };
  productLine?: string;
  subProductLine?: string;
  itemName?: string;
  prices?: Record<string, { price?: number; discountPrice?: number }>;
  price?: number;
  discountPrice?: number;
}

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

function parseMoney(str: string): number {
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

// ─────────────────────────────
// Load products
// ─────────────────────────────

const products: ProductDoc[] = readJson<ProductDoc[]>(
  "better-edibles.products.json"
);

// product lookup helper
function findProduct(
  rawName: string,
  unitLabelRaw: string | null
): ProductDoc | null {
  // Example rawName: "Original - Hybrid", "Fruity - Sativa", "SPLIT QUADS"
  const cleaned = rawName.replace(/\u00a0/g, " ").trim();
  const [left, right] = cleaned.split("-").map((p) => p.trim());
  const baseName = left || cleaned;
  const baseKey = normalize(baseName);

  // If unitLabelRaw isn’t provided, try from right side
  const unitCandidate = unitLabelRaw || right || "";
  const unit = normalize(unitCandidate);
  const isStrain = unit === "hybrid" || unit === "indica" || unit === "sativa";

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
// Fetch & parse order-details.php
// ─────────────────────────────

async function fetchOrderDetails(orderId: string, storeParam: string) {
  const url = `/reps/admin/order-details.php?i=${orderId}&s=${storeParam}`;
  console.log(`  🔍 Fetching details: ${url}`);

  const res = await axios.get(url);
  fs.writeFileSync("debug_order_details.html", res.data);
  const $ = cheerio.load(res.data);

  const items: OrderItem[] = [];

  // Log the raw HTML table to see what we are getting if needed
  // console.log(res.data);

  const rows = $("table.table.table-bordered tbody tr");
  console.log(`  Found ${rows.length} rows in the table.`);

  rows.each((i, row) => {
    const $row = $(row);
    const nameCell = $row.find("td.cart-product-name-info");
    const qtyCell = $row.find("td.cart-product-quantity");
    const unitPriceCell = $row.find("td.cart-product-sub-total").first();
    const totalCell = $row.find("td.cart-product-grand-total");

    if (!nameCell.length) {
      console.log(`  Row ${i}: No name cell found.`);
      return;
    }

    const rawName = nameCell.text().replace(/\s+/g, " ").trim();
    const qty = parseInt(qtyCell.text().trim(), 10) || 0;
    const unitPrice = parseMoney(unitPriceCell.text());
    const lineTotal = parseMoney(totalCell.text());

    console.log(
      `  Row ${i}: ${rawName} | Qty: ${qty} | Price: ${unitPrice} | Total: ${lineTotal}`
    );

    // Extract “Original - Hybrid” → baseName + unitLabel
    const cleaned = rawName.replace(/\u00a0/g, " ").trim();
    const [left, right] = cleaned.split("-").map((p) => p.trim());
    const baseName = left || cleaned;
    const unitLabel = right ? right.toLowerCase() : null;

    const productDoc = findProduct(baseName, unitLabel);
    if (!productDoc) {
      console.warn(`    ⚠️  No product match for line: "${rawName}"`);
    } else {
      console.log(
        `    ✅ Matched product: ${
          productDoc.productLine || productDoc.itemName
        }`
      );
    }

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

    // Test specific URL: https://better-edibles.com/reps/admin/order-details.php?i=3339&s=219
    const orderId = "3339";
    const storeParam = "219";

    console.log(
      `\nTesting fetch for Order ID: ${orderId}, Store Param: ${storeParam}`
    );
    const items = await fetchOrderDetails(orderId, storeParam);

    console.log("\n📦 Parsed Items:");
    console.log(JSON.stringify(items, null, 2));
  } catch (err: any) {
    console.error("💥 Script failed:", err?.message || err);
    process.exit(1);
  }
}

main();
