import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

interface Store {
  _id: { $oid: string };
  name: string;
  address: string;
}

interface Rep {
  _id: { $oid: string };
  name: string;
}

interface FollowupOutput {
  followupDate: string; // YYYY-MM-DD format
  interestLevel: string; // Empty string for all
  comments: string; // Extracted from HTML
  store: { $oid: string }; // Store ObjectId reference
  rep: { $oid: string }; // Rep ObjectId reference
}

// Load stores and reps data
const storesPath = path.join(__dirname, "../../better-edibles.stores.json");
const repsPath = path.join(__dirname, "../../better-edibles.reps.json");
const followupsHtmlPath = path.join(__dirname, "../../followups.html");

const stores: Store[] = JSON.parse(fs.readFileSync(storesPath, "utf-8"));
const reps: Rep[] = JSON.parse(fs.readFileSync(repsPath, "utf-8"));

// Create name-to-ID mappings
const storeNameToId = new Map<string, string>();
stores.forEach((store) => {
  const normalizedName = store.name.trim().toUpperCase();
  storeNameToId.set(normalizedName, store._id.$oid);
});

const repNameToId = new Map<string, string>();
reps.forEach((rep) => {
  const normalizedName = rep.name.trim().toLowerCase();
  repNameToId.set(normalizedName, rep._id.$oid);
});

console.log(`Loaded ${stores.length} stores`);
console.log(`Loaded ${reps.length} reps`);

// Function to convert MM/DD/YYYY to YYYY-MM-DD
function convertDate(dateStr: string): string {
  const [month, day, year] = dateStr.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Function to find store ID by name
function findStoreId(storeName: string): string | null {
  const normalized = storeName.trim().toUpperCase();
  return storeNameToId.get(normalized) || null;
}

// Function to find rep ID by name
function findRepId(repName: string): string | null {
  const normalized = repName.trim().toLowerCase();
  return repNameToId.get(normalized) || null;
}

// Parse the HTML file
console.log("Reading followups HTML file...");
const html = fs.readFileSync(followupsHtmlPath, "utf-8");
const $ = cheerio.load(html);

const followups: FollowupOutput[] = [];
const errors: any[] = [];

// Process each alert div
$('div[class^="alert-"]').each((index, element) => {
  const $alert = $(element);
  const alertId = $alert.attr("id");

  // Skip the alert-success header
  if (!alertId || alertId === "" || $alert.hasClass("alert-success")) {
    return;
  }

  try {
    // Extract store name
    const storeName = $alert.find(".alert-title strong").first().text().trim();

    // Extract comments and metadata from alert-text
    const alertTextDiv = $alert.find(".alert-text").first();
    const fullText = alertTextDiv.text().trim();

    // Extract [RepName, Date] pattern
    const metadataMatch = fullText.match(/\[(.*?),(\d{2}\/\d{2}\/\d{4})\]\s*$/);

    if (!metadataMatch) {
      errors.push({
        alertId,
        storeName,
        error: "Could not extract rep and date",
        fullText,
      });
      return;
    }

    const repName = metadataMatch[1].trim();
    const dateStr = metadataMatch[2].trim();

    // Extract comments (everything before the metadata)
    const comments = fullText
      .replace(/\[(.*?),(\d{2}\/\d{2}\/\d{4})\]\s*$/, "")
      .replace(/\s+/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();

    // Find store ID
    const storeId = findStoreId(storeName);
    if (!storeId) {
      errors.push({
        alertId,
        storeName,
        error: "Store not found",
        repName,
        date: dateStr,
      });
      return;
    }

    // Find rep ID
    const repId = findRepId(repName);
    if (!repId) {
      errors.push({
        alertId,
        storeName,
        error: "Rep not found",
        repName,
        date: dateStr,
      });
      return;
    }

    // Convert date
    const followupDate = convertDate(dateStr);

    // Create followup object matching Followup schema
    followups.push({
      followupDate, // string in YYYY-MM-DD format
      interestLevel: "", // empty string as requested
      comments, // extracted comment text
      store: { $oid: storeId }, // Store ObjectId reference
      rep: { $oid: repId }, // Rep ObjectId reference
    });
  } catch (error: any) {
    errors.push({
      alertId,
      error: error.message,
    });
  }
});

console.log(`\n✅ Parsed ${followups.length} followups successfully`);
console.log(`❌ ${errors.length} errors occurred`);

// Write output files
const outputPath = path.join(__dirname, "../../followups.migrated.json");
fs.writeFileSync(outputPath, JSON.stringify(followups, null, 2));
console.log(`\n📝 Followups saved to: ${outputPath}`);

if (errors.length > 0) {
  const errorsPath = path.join(__dirname, "../../followups.errors.json");
  fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
  console.log(`⚠️  Errors saved to: ${errorsPath}`);

  // Show some error examples
  console.log("\nSample errors:");
  errors.slice(0, 5).forEach((err) => {
    console.log(`  - ${err.error}: ${err.storeName || err.alertId}`);
    if (err.repName) console.log(`    Rep: ${err.repName}`);
  });
}

// Show some statistics
const uniqueStores = new Set(followups.map((f) => f.store.$oid)).size;
const uniqueReps = new Set(followups.map((f) => f.rep.$oid)).size;

console.log("\n📊 Statistics:");
console.log(`  Total followups: ${followups.length}`);
console.log(`  Unique stores: ${uniqueStores}`);
console.log(`  Unique reps: ${uniqueReps}`);

// Show sample followup
if (followups.length > 0) {
  console.log("\n📋 Sample followup:");
  console.log(JSON.stringify(followups[0], null, 2));
}
