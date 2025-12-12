import * as fs from "fs";
import * as path from "path";

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
  store?: { $oid: string }; // Store ObjectId reference
  rep?: { $oid: string }; // Rep ObjectId reference
}

interface ErrorEntry {
  alertId: string;
  storeName?: string;
  error: string;
  fullText?: string;
  repName?: string;
  date?: string;
}

// Load data
const storesPath = path.join(__dirname, "../../better-edibles.stores.json");
const repsPath = path.join(__dirname, "../../better-edibles.reps.json");
const errorsPath = path.join(__dirname, "../../followups.errors.json");

const stores: Store[] = JSON.parse(fs.readFileSync(storesPath, "utf-8"));
const reps: Rep[] = JSON.parse(fs.readFileSync(repsPath, "utf-8"));
const errors: ErrorEntry[] = JSON.parse(fs.readFileSync(errorsPath, "utf-8"));

console.log(`Loaded ${stores.length} stores`);
console.log(`Loaded ${reps.length} reps`);
console.log(`Loaded ${errors.length} errors`);

// Create mappings
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

// Helper functions
function convertDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [month, day, year] = dateStr.split("/");
    if (!month || !day || !year) return "";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } catch (e) {
    return "";
  }
}

function findStoreId(storeName: string): string {
  if (!storeName) return "";
  const normalized = storeName.trim().toUpperCase();
  // Try exact match first
  let id = storeNameToId.get(normalized);
  if (id) return id;

  // Try partial match if no exact match (basic fuzzy logic could go here, but sticking to simple normalized for now as per instructions to just be lenient with empty)
  return "";
}

function findRepId(repName: string): string {
  if (!repName) return "";
  const normalized = repName.trim().toLowerCase();
  // Handle "House Account" specifically if needed, otherwise normal lookup
  // Note: House Account seems to be in the reps list usually, but let's check.
  // Actually the previous script worked for some House Accounts, so it must be in the DB.
  return repNameToId.get(normalized) || "";
}

const recovered: FollowupOutput[] = [];
const stillFailed: any[] = [];

errors.forEach((err) => {
  let repName = err.repName || "";
  let dateStr = err.date || "";
  let comments = "";
  let storeName = err.storeName || "";

  // Try to extract from fullText if we have it (especially for "Could not extract..." errors)
  if (err.fullText) {
    // New Regex: captures multiline content inside []
    const metadataMatch = err.fullText.match(
      /\[([\s\S]*?),(\d{2}\/\d{2}\/\d{4})\]\s*$/
    );

    if (metadataMatch) {
      repName = metadataMatch[1].trim(); // capture includes newlines, trim handles basic cleaning
      // Further clean repName if it has newlines inside
      repName = repName.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

      dateStr = metadataMatch[2].trim();

      comments = err.fullText
        .replace(/\[([\s\S]*?),(\d{2}\/\d{2}\/\d{4})\]\s*$/, "")
        .replace(/\s+/g, " ")
        .replace(/&nbsp;/g, " ")
        .trim();
    } else {
      // If regex still fails, use the entire text as comments if we haven't extracted anything else
      if (!comments) comments = err.fullText.trim();
    }
  }

  // Determine IDs
  const storeId = findStoreId(storeName);
  const repId = findRepId(repName);
  const followupDate = convertDate(dateStr);

  const followup: FollowupOutput = {
    followupDate,
    interestLevel: "",
    comments,
  };

  // Only add store if ID is valid
  if (storeId) {
    followup.store = { $oid: storeId };
  }

  // Only add rep if ID is valid
  if (repId) {
    followup.rep = { $oid: repId };
  }

  recovered.push(followup);
});

console.log(`\n✅ Recovered ${recovered.length} items`);

// Write output
const outputPath = path.join(__dirname, "../../followups.recovered.json");
fs.writeFileSync(outputPath, JSON.stringify(recovered, null, 2));
console.log(`\n📝 Recovered data saved to: ${outputPath}`);

// Show a sample
if (recovered.length > 0) {
  console.log("\nSample recovered item:");
  console.log(JSON.stringify(recovered[0], null, 2));
}

// Check for completely empty critical fields to warn user?
// The user said "if something does not have any property that will be empty i don't have to put that"
// but the JSON structure usually requires keys. I put keys with empty strings.
