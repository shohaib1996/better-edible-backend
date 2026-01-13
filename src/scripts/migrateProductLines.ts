// src/scripts/migrateProductLines.ts
import { connectDB } from "../config/db";
import { ProductLine } from "../models/ProductLine";

// 👉 dotenv for local development
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

async function migrateProductLines() {
  try {
    console.log("🚀 Starting ProductLine migration...");

    await connectDB();
    console.log("✅ Database connected");

    // Check if product lines already exist
    const existingCount = await ProductLine.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  ${existingCount} product lines already exist.`);
      console.log("🗑️  Deleting existing product lines...");
      await ProductLine.deleteMany({});
      console.log("✅ Existing product lines deleted");
    }

    // Define the 3 product lines based on existing products
    const productLines = [
      {
        name: "Cannacrispy",
        displayOrder: 1,
        active: true,
        description: "Cannabis-infused crispy rice treats with strain-specific options",
        pricingStructure: {
          type: "multi-type",
          typeLabels: ["hybrid", "indica", "sativa"],
        },
        fields: [
          {
            name: "subProductLine",
            label: "Sub Product Line",
            type: "text",
            placeholder: "e.g., Original, Fruity, Chocolate",
            required: true,
          },
        ],
      },
      {
        name: "Fifty-One Fifty",
        displayOrder: 2,
        active: true,
        description: "Premium cannabis gummies with various cannabinoid blends",
        pricingStructure: {
          type: "simple",
        },
        fields: [
          {
            name: "itemName",
            label: "Item Name",
            type: "text",
            placeholder: "e.g., 100mg THC + 50mg CBN",
            required: true,
          },
          {
            name: "priceDescription",
            label: "Price Description",
            type: "text",
            placeholder: "$3.25/unit. 50 units/case. $162.50/case.",
            required: false,
          },
          {
            name: "discountDescription",
            label: "Discount Description",
            type: "text",
            placeholder: "$2.90/unit. 50 units/case. $145/case.",
            required: false,
          },
        ],
      },
      {
        name: "BLISS Cannabis Syrup",
        displayOrder: 3,
        active: true,
        description: "Cannabis syrup available in multiple dosage variants",
        pricingStructure: {
          type: "variants",
          variantLabels: ["100Mg", "300Mg", "1000Mg"],
        },
        fields: [
          {
            name: "subProductLine",
            label: "Flavor",
            type: "text",
            placeholder: "e.g., Mango, Pineapple, Strawberry",
            required: true,
          },
        ],
      },
    ];

    // Insert product lines
    console.log("📝 Creating product lines...");
    const createdProductLines = await ProductLine.insertMany(productLines);

    console.log(`✅ Successfully created ${createdProductLines.length} product lines:`);
    createdProductLines.forEach((pl) => {
      console.log(`   - ${pl.name} (${pl.pricingStructure.type})`);
    });

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("   1. Start your server to test the API endpoints");
    console.log("   2. Products will continue to work with the hardcoded productLine field");
    console.log("   3. Frontend can now fetch and manage product lines dynamically");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateProductLines();
