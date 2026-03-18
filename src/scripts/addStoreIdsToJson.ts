/**
 * Script: Add storeId to better-edibles-database.stores.json
 *
 * Sorts stores by _id (insertion order proxy) and assigns S10001, S10002, ...
 * Writes output to better-edibles-database.stores.updated.json
 *
 * Usage:
 *   npx ts-node src/scripts/addStoreIdsToJson.ts
 */

import fs from "fs";
import path from "path";

const INPUT = path.resolve(__dirname, "../../better-edibles-database.stores.json");
const OUTPUT = path.resolve(__dirname, "../../better-edibles-database.stores.updated.json");

const stores = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

// Sort by _id.$oid (ObjectIds are lexicographically sortable by insertion time)
stores.sort((a: any, b: any) => a._id.$oid.localeCompare(b._id.$oid));

let seq = 10000;
const updated = stores.map((store: any) => {
  seq++;
  return { ...store, storeId: `S${seq}` };
});

fs.writeFileSync(OUTPUT, JSON.stringify(updated, null, 2));
console.log(`Done. Assigned S10001 → S${seq} to ${updated.length} stores.`);
console.log(`Output: ${OUTPUT}`);
