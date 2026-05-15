// Run: npx ts-node src/scripts/backfillStoreZips.ts
import * as fs from "fs";
import * as path from "path";

const FILE = path.join(__dirname, "../../better-edibles-database.stores.json");

interface StoreDoc {
  storeId?: string;
  name?: string;
  address?: string;
  zip?: string;
  [key: string]: unknown;
}

const stores: StoreDoc[] = JSON.parse(fs.readFileSync(FILE, "utf8"));

let added = 0;
let skipped = 0;
let noMatch = 0;

for (const store of stores) {
  if (store.zip) {
    skipped++;
    continue;
  }

  const match = store.address?.match(/(\d{5})\s*$/);
  if (match) {
    store.zip = match[1];
    added++;
  } else {
    console.warn(`No ZIP found: [${store.storeId}] ${store.name} — "${store.address}"`);
    noMatch++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(stores, null, 2), "utf8");

console.log(`\nDone. Added: ${added} | Already had zip: ${skipped} | No match: ${noMatch}`);
