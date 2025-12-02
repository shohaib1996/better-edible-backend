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

interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
  importantToKnow?: string;
}

interface Store {
  oldId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  rep: string | null;
  group: string;
  terms: string;
  contacts: Contact[];
  balanceDue?: number;
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
// Parse stores-list.html
// ─────────────────────────────

interface StoreListRow {
  storeId: string;
  name: string;
  address: string;
  rep: string;
  balanceDue: number;
}

function parseStoresList(): StoreListRow[] {
  const htmlPath = path.join(rootDir, "stores-list.html");
  console.log("📄 Reading stores-list.html from:", htmlPath);
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  const rows: StoreListRow[] = [];

  $("section.docs").each((i, el) => {
    const section = $(el);

    // Get store ID from checkbox
    const checkbox = section.find('input.repscheck[name="repsfilter[]"]');
    const storeId = checkbox.attr("value") || "";

    if (!storeId) return;

    // Store name and address
    const name = section.find("h4 a").first().text().trim();
    const address = section.find("p.s-text.text-info").first().text().trim();

    // Rep name
    const repText = section.find("p[style*='float: right']").text().trim();
    const rep = repText.replace(/^Rep\s*:\s*/i, "").trim();

    // Balance due (if exists)
    const balanceText = section
      .find("span.tamt")
      .text()
      .replace(/[$,]/g, "")
      .trim();
    const balanceDue = balanceText ? parseFloat(balanceText) : 0;

    rows.push({
      storeId,
      name,
      address,
      rep,
      balanceDue,
    });
  });

  console.log(`✅ Parsed ${rows.length} stores from stores-list.html`);
  return rows;
}

// ─────────────────────────────
// Fetch store-add.php details
// ─────────────────────────────

async function fetchStoreDetails(
  storeId: string,
  defaultName: string
): Promise<Store | null> {
  try {
    const url = `/reps/admin/store-add.php?s=${storeId}&a=2`;
    console.log(`  🔍 Fetching details: ${url}`);

    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    // Extract form values
    let name = $('input[name="name"]').val()?.toString().trim() || "";
    if (!name) name = defaultName; // Use default name from list if form is empty

    const address = $('input[name="address"]').val()?.toString().trim() || "";
    const city = $('input[name="city"]').val()?.toString().trim() || "";
    const state = $('select[name="state"]').val()?.toString().trim() || "";
    const zip = $('input[name="zip"]').val()?.toString().trim() || "";
    const group = $('select[name="group"]').val()?.toString().trim() || "";
    const terms = $('select[name="terms"]').val()?.toString().trim() || "";

    // Get selected rep text
    const repSelect = $('select[name="rep"]');
    const rep = repSelect.find("option:selected").text().trim() || null;

    // Extract contacts (there may be multiple contact rows)
    const contacts: Contact[] = [];

    // Look for contact table rows
    $('tr[id^="contact_"]').each((i, row) => {
      const $row = $(row);

      const contactName =
        $row.find('input[name^="contact_name"]').val()?.toString().trim() || "";
      const contactRole =
        $row.find('input[name^="contact_role"]').val()?.toString().trim() || "";
      const contactEmail =
        $row.find('input[name^="contact_email"]').val()?.toString().trim() ||
        "";
      const contactPhone =
        $row.find('input[name^="contact_phone"]').val()?.toString().trim() ||
        "";
      const importantToKnow =
        $row
          .find('textarea[name^="contact_important"]')
          .val()
          ?.toString()
          .trim() || "";

      if (contactName || contactEmail || contactPhone) {
        contacts.push({
          name: contactName,
          role: contactRole,
          email: contactEmail,
          phone: contactPhone,
          importantToKnow: importantToKnow || undefined,
        });
      }
    });

    const store: Store = {
      oldId: storeId,
      name,
      address,
      city,
      state,
      zip,
      rep,
      group,
      terms,
      contacts,
    };

    console.log(`    ✓ ${store.name} (${store.city}, ${store.state})`);
    return store;
  } catch (err: any) {
    console.error(`    ✗ Failed to fetch store ${storeId}:`, err.message);
    return null;
  }
}

// ─────────────────────────────
// Main runner
// ─────────────────────────────

async function main() {
  try {
    console.log("=".repeat(70));
    console.log("STORE MIGRATION SCRIPT");
    console.log("=".repeat(70));

    await loginOldPortal();

    const storeListRows = parseStoresList();

    const migrated: Store[] = [];

    for (const [idx, row] of storeListRows.entries()) {
      console.log(
        `\n[${idx + 1}/${storeListRows.length}] Processing store: ${row.name}`
      );

      const store = await fetchStoreDetails(row.storeId, row.name);

      if (store) {
        // Add balance due from the list page
        if (row.balanceDue > 0) {
          store.balanceDue = row.balanceDue;
        }
        migrated.push(store);
      }

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const outPath = path.join(rootDir, "stores.migrated.json");
    fs.writeFileSync(outPath, JSON.stringify(migrated, null, 2));
    console.log(
      `\n✅ Done. Wrote ${migrated.length} stores with details to ${outPath}`
    );
    console.log("=".repeat(70));
  } catch (err: any) {
    console.error("💥 Script failed:", err?.message || err);
    process.exit(1);
  }
}

main();
