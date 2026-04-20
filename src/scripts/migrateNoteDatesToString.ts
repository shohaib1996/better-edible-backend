import * as fs from "fs";
import * as path from "path";

// USAGE:
// npx ts-node-dev src/scripts/migrateNoteDatesToString.ts
// OR specify a custom filename:
// npx ts-node-dev src/scripts/migrateNoteDatesToString.ts better-edibles-database.notes.json

/**
 * This script converts dates in notes JSON files
 * from ISO datetime to YYYY-MM-DD format and creates a migrated JSON file
 * NO DATABASE CONNECTION - just JSON file processing
 */

const convertISOToDateString = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);

    // Convert to PST/PDT (America/Los_Angeles timezone)
    // PST is UTC-8, PDT is UTC-7
    const pstDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

    const year = pstDate.getFullYear();
    const month = String(pstDate.getMonth() + 1).padStart(2, "0");
    const day = String(pstDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(`❌ Error converting date: ${isoDate}`, error);
    return isoDate;
  }
};

const migrateJSONFile = () => {
  console.log("🚀 Starting Note date migration to YYYY-MM-DD string format...\n");
  console.log("📄 Processing JSON file (NO DATABASE CONNECTION)\n");

  // Get filename from command line argument or use default
  const filename = process.argv[2] || "better-edibles-staging.notes.json";
  const jsonPath = path.join(__dirname, "../../", filename);

  console.log(`📂 Target file: ${filename}`);

  if (!fs.existsSync(jsonPath)) {
    console.log("❌ JSON file not found at:", jsonPath);
    process.exit(1);
  }

  console.log(`📂 Reading: ${jsonPath}`);
  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const notes = JSON.parse(fileContent);

  console.log(`📊 Found ${notes.length} notes in JSON file\n`);

  let convertedCount = 0;
  let alreadyCorrectCount = 0;

  console.log("🔍 Converting dates...\n");

  notes.forEach((note: any, index: number) => {
    if (note.date) {
      let originalDate = note.date;

      // Handle MongoDB extended JSON format: { "$date": "..." }
      if (typeof originalDate === "object" && originalDate.$date) {
        originalDate = originalDate.$date;
      }

      // Check if it's already in YYYY-MM-DD format
      if (typeof originalDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
        alreadyCorrectCount++;
        return;
      }

      // Convert from ISO datetime to YYYY-MM-DD
      note.date = convertISOToDateString(originalDate);
      convertedCount++;

      // Show first 5 and last 2 conversions as examples
      if (convertedCount <= 5 || convertedCount > notes.length - 2) {
        console.log(`  [${index + 1}] ${originalDate} → ${note.date}`);
      } else if (convertedCount === 6) {
        console.log(`  ... (converting remaining dates) ...`);
      }
    }
  });

  console.log(`\n📈 Conversion Summary:`);
  console.log(`   ✓ Already in correct format: ${alreadyCorrectCount}`);
  console.log(`   🔄 Converted: ${convertedCount}`);
  console.log(`   📝 Total notes: ${notes.length}`);

  // Create migrated file
  const migratedPath = jsonPath.replace(".json", ".migrated.json");
  fs.writeFileSync(migratedPath, JSON.stringify(notes, null, 2), "utf-8");

  console.log(`\n✅ Migration completed successfully!`);
  console.log(`   📁 Original file: ${jsonPath}`);
  console.log(`   📁 Migrated file: ${migratedPath}`);
  console.log(`\n💡 You can now manually import the migrated JSON to your database`);
};

const main = () => {
  try {
    migrateJSONFile();
    console.log("\n🎉 Process completed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
};

main();
