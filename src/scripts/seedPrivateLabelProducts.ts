/**
 * Seed Script for Private Label Products
 *
 * This script seeds the database with initial private label products.
 * Run with: npx ts-node src/scripts/seedPrivateLabelProducts.ts
 *
 * Or add to package.json:
 * "seed:products": "ts-node src/scripts/seedPrivateLabelProducts.ts"
 */

import mongoose from "mongoose";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";

// Load environment variables for local development
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const INITIAL_PRODUCTS = [
  {
    name: "BIOMAX",
    unitPrice: 1.75,
    description: "BIOMAX Gummy - Premium bioavailability formula",
    isActive: true,
  },
  {
    name: "Rosin",
    unitPrice: 2.25,
    description: "Rosin Gummy - Solventless extract",
    isActive: true,
  },
];

const seedProducts = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      console.error("❌ MONGO_URI is not defined in environment variables");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🌱 Seeding Private Label Products...\n");

    for (const productData of INITIAL_PRODUCTS) {
      // Check if product already exists
      const existing = await PrivateLabelProduct.findOne({
        name: productData.name,
      });

      if (existing) {
        console.log(`⚠️  Product "${productData.name}" already exists - updating...`);
        existing.unitPrice = productData.unitPrice;
        existing.description = productData.description;
        existing.isActive = productData.isActive;
        await existing.save();
        console.log(`   ✅ Updated: ${productData.name} - $${productData.unitPrice}/each\n`);
      } else {
        await PrivateLabelProduct.create(productData);
        console.log(`   ✅ Created: ${productData.name} - $${productData.unitPrice}/each\n`);
      }
    }

    console.log("🎉 Seeding completed successfully!\n");

    // Display all products
    const allProducts = await PrivateLabelProduct.find().sort({ name: 1 });
    console.log("📋 Current Products in Database:");
    console.log("─────────────────────────────────────────");
    allProducts.forEach((p) => {
      console.log(`   ${p.isActive ? "✓" : "✗"} ${p.name.padEnd(15)} - $${p.unitPrice}/each`);
    });
    console.log("─────────────────────────────────────────\n");

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error seeding products:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedProducts();
