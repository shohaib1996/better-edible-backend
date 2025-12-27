import * as fs from "fs";
import * as path from "path";

// USAGE: ts-node src/scripts/migrateDateToString.ts

/**
 * This script converts dates in better-edibles-staging.notes.json
 * from ISO datetime to YYYY-MM-DD format and creates a new migrated JSON file
 */

const convertISOToDateString = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(`❌ Error converting date: ${isoDate}`, error);
    return isoDate;
  }
};

const migrateJSONFile = async () => {
  console.log("\n📄 === Migrating JSON File ===");

  const jsonPath = path.join(__dirname, "../../better-edibles-staging.notes.json");

  if (!fs.existsSync(jsonPath)) {
    console.log("❌ JSON file not found!");
    process.exit(1);
  }

  console.log(`📂 Reading JSON file: ${jsonPath}`);
  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const notes = JSON.parse(fileContent);

  console.log(`📊 Found ${notes.length} notes in JSON file`);

  let convertedCount = 0;
  notes.forEach((note: any) => {
    if (note.date) {
      const originalDate = note.date;

      // Check if it's already in YYYY-MM-DD format
      if (typeof originalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
        console.log(`✓ Date already in correct format: ${originalDate}`);
        return;
      }

      // Convert from ISO datetime to YYYY-MM-DD
      note.date = convertISOToDateString(originalDate);
      convertedCount++;

      if (convertedCount <= 5) {
        console.log(`  Converted: ${originalDate} → ${note.date}`);
      }
    }
  });

  console.log(`✅ Converted ${convertedCount} dates`);

  // Create migrated file with new name
  const migratedPath = jsonPath.replace('.json', '.migrated.json');
  fs.writeFileSync(migratedPath, JSON.stringify(notes, null, 2), "utf-8");
  console.log(`✅ Migrated JSON file created at: ${migratedPath}`);
  console.log(`📝 Original file unchanged: ${jsonPath}`);
};


const main = async () => {
  try {
    console.log("🚀 Starting date migration process for JSON file...\n");

    // Migrate JSON file only
    await migrateJSONFile();

    console.log("\n✅ Migration completed successfully!");
    console.log("ℹ️  Database migration skipped - only JSON file converted");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
};

main();
