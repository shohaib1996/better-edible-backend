import fs from "fs";
import path from "path";

// Types
interface OldStore {
  oldId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  rep: string | null;
  group: string;
  terms: string;
  contacts: any[];
  balanceDue?: number;
}

interface CurrentStore {
  _id: { $oid: string };
  name: string;
  address: string;
  rep?: { $oid: string };
  paymentStatus: string | null;
  updatedAt: { $date: string };
  contacts: Array<{ $oid: string }>;
  blocked?: boolean;
  state?: string;
  terms?: string;
  group?: string;
  city?: string;
  zip?: string;
}

// Helper functions
function normalizeAddress(addr: string): string {
  return addr.toLowerCase().replace(/\s+/g, " ").replace(/[,\.]/g, "").trim();
}

function mapTerms(oldTerms: string): string {
  const termsMap: { [key: string]: string } = {
    "1": "COD",
    "2": "15 days",
    "3": "30 days",
  };
  return termsMap[oldTerms] || "COD";
}

function main() {
  const rootDir = path.join(__dirname, "../..");

  // Read files
  const migratedPath = path.join(rootDir, "stores.migrated.json");
  const currentPath = path.join(rootDir, "better-edibles.stores.json");

  console.log("📖 Reading files...");
  const migratedStores: OldStore[] = JSON.parse(
    fs.readFileSync(migratedPath, "utf-8")
  );
  const currentStores: CurrentStore[] = JSON.parse(
    fs.readFileSync(currentPath, "utf-8")
  );

  console.log(`Found ${migratedStores.length} migrated stores`);
  console.log(`Found ${currentStores.length} current stores`);

  // Create lookup maps for migrated data
  const migratedByAddress = new Map<string, OldStore>();
  const migratedByName = new Map<string, OldStore>();

  migratedStores.forEach((store) => {
    if (store.address) {
      const key = normalizeAddress(store.address);
      migratedByAddress.set(key, store);
    }
    if (store.name) {
      const key = normalizeAddress(store.name); // Reuse normalize for name too (lowercase, trim)
      migratedByName.set(key, store);
    }
  });

  // Update current stores with state, terms, and group
  console.log("\n🔄 Updating existing stores...");
  let updatedCount = 0;
  let notFoundCount = 0;

  // Track which migrated stores were used so we can find the missing ones
  const usedMigratedIds = new Set<string>();

  currentStores.forEach((currentStore) => {
    const addrKey = normalizeAddress(currentStore.address);
    const nameKey = normalizeAddress(currentStore.name);

    let migratedData = migratedByAddress.get(addrKey);

    // Fallback to name match if address match fails
    if (!migratedData) {
      migratedData = migratedByName.get(nameKey);
    }

    if (migratedData) {
      // Add missing fields
      currentStore.state = "Oregon";
      currentStore.terms = mapTerms(migratedData.terms);
      currentStore.group = migratedData.group || "";
      currentStore.city = migratedData.city || currentStore.city;
      currentStore.zip = migratedData.zip || currentStore.zip;

      updatedCount++;
      usedMigratedIds.add(migratedData.oldId);
    } else {
      notFoundCount++;
      console.log(
        `  ⚠️  No match for: ${currentStore.name} (Addr: ${currentStore.address})`
      );
    }
  });

  console.log(`✅ Updated ${updatedCount} stores`);
  console.log(`⚠️  ${notFoundCount} stores not found in migrated data`);

  // Find stores that exist in migrated but NOT in current (missing stores)
  console.log(`\n🔍 Finding missing stores...`);
  const missingStores: Partial<CurrentStore>[] = [];

  migratedStores.forEach((migratedStore) => {
    if (!usedMigratedIds.has(migratedStore.oldId)) {
      console.log(
        `  📍 Found missing store: ${migratedStore.name} (oldId: ${migratedStore.oldId})`
      );

      // Create new store entry WITHOUT _id (MongoDB will auto-generate)
      const newStore: Partial<CurrentStore> = {
        name: migratedStore.name || `Store ${migratedStore.oldId}`,
        address: migratedStore.address,
        state: "Oregon",
        city: migratedStore.city,
        zip: migratedStore.zip,
        terms: mapTerms(migratedStore.terms),
        group: migratedStore.group || "",
        contacts: [],
        blocked: false,
        paymentStatus: null,
        updatedAt: { $date: new Date().toISOString() },
      };

      missingStores.push(newStore);
    }
  });

  console.log(`📦 Found ${missingStores.length} missing stores to add`);

  // Add missing stores to the current stores array
  currentStores.push(...(missingStores as CurrentStore[]));

  // Save updated data
  const outputPath = path.join(rootDir, "better-edibles.stores.updated.json");
  fs.writeFileSync(outputPath, JSON.stringify(currentStores, null, 2), "utf-8");

  console.log(`\n✅ Saved updated data to: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`  - Total stores: ${currentStores.length}`);
  console.log(`  - Updated: ${updatedCount}`);
  console.log(`  - Added: ${missingStores.length}`);
  console.log(`  - Not matched: ${notFoundCount}`);

  // Show sample of what was added
  if (missingStores.length > 0) {
    console.log(`\n📋 Missing stores that were added:`);
    missingStores.forEach((store, idx) => {
      console.log(`  ${idx + 1}. ${store.name} - ${store.address}`);
    });
  }
}

main();
