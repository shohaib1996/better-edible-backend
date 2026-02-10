/**
 * Export Script: Export migrated data to JSON files for production import
 *
 * This script will export:
 * 1. PrivateLabelClients
 * 2. Labels
 * 3. ClientOrders
 *
 * Usage:
 *   npx ts-node src/scripts/exportMigratedData.ts
 *
 * Output files will be created in the project root:
 * - export-privatelabelclients.json
 * - export-labels.json
 * - export-clientorders.json
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Import models
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Label } from "../models/Label";
import { ClientOrder } from "../models/ClientOrder";

// Helper function to convert ObjectIds to MongoDB Extended JSON format
function convertToMongoExport(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check if it's an ObjectId
  if (obj instanceof mongoose.Types.ObjectId || (obj._bsontype === "ObjectId")) {
    return { $oid: obj.toString() };
  }

  // Check if it's a Date
  if (obj instanceof Date) {
    return { $date: obj.toISOString() };
  }

  // Check if it's an array
  if (Array.isArray(obj)) {
    return obj.map(item => convertToMongoExport(item));
  }

  // Check if it's a plain object
  if (typeof obj === "object") {
    const converted: any = {};
    for (const key of Object.keys(obj)) {
      converted[key] = convertToMongoExport(obj[key]);
    }
    return converted;
  }

  return obj;
}

async function exportMigratedData() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const outputDir = path.join(__dirname, "../../");

    // Export only migrated ClientOrders (CO-0022 to CO-0030)
    console.log("\n📦 Exporting migrated ClientOrders (CO-0022 to CO-0030)...");
    const migratedOrderNumbers = [
      "CO-0022", "CO-0023", "CO-0024", "CO-0025", "CO-0026",
      "CO-0027", "CO-0028", "CO-0029", "CO-0030"
    ];
    const orders = await ClientOrder.find({
      orderNumber: { $in: migratedOrderNumbers }
    }).lean();
    const ordersPath = path.join(outputDir, "export-clientorders.json");
    fs.writeFileSync(ordersPath, JSON.stringify(orders.map(convertToMongoExport), null, 2));
    console.log(`   ✅ Exported ${orders.length} orders to ${ordersPath}`);

    // Get client IDs from migrated orders
    const migratedClientIds = [...new Set(orders.map(o => o.client.toString()))];

    // Export only PrivateLabelClients that have migrated orders
    console.log("\n📦 Exporting migrated PrivateLabelClients...");
    const clients = await PrivateLabelClient.find({
      _id: { $in: migratedClientIds }
    }).lean();
    const clientsPath = path.join(outputDir, "export-privatelabelclients.json");
    fs.writeFileSync(clientsPath, JSON.stringify(clients.map(convertToMongoExport), null, 2));
    console.log(`   ✅ Exported ${clients.length} clients to ${clientsPath}`);

    // Export only Labels belonging to migrated clients
    console.log("\n📦 Exporting migrated Labels...");
    const labels = await Label.find({
      client: { $in: migratedClientIds }
    }).lean();
    const labelsPath = path.join(outputDir, "export-labels.json");
    fs.writeFileSync(labelsPath, JSON.stringify(labels.map(convertToMongoExport), null, 2));
    console.log(`   ✅ Exported ${labels.length} labels to ${labelsPath}`);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Export Complete!");
    console.log("=".repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   - PrivateLabelClients: ${clients.length}`);
    console.log(`   - Labels: ${labels.length}`);
    console.log(`   - ClientOrders: ${orders.length}`);
    console.log("\n📁 Output files:");
    console.log(`   - ${clientsPath}`);
    console.log(`   - ${labelsPath}`);
    console.log(`   - ${ordersPath}`);
    console.log("\n💡 To import into production MongoDB:");
    console.log("   mongoimport --uri <PROD_URI> --collection privatelabelclients --file export-privatelabelclients.json --jsonArray");
    console.log("   mongoimport --uri <PROD_URI> --collection labels --file export-labels.json --jsonArray");
    console.log("   mongoimport --uri <PROD_URI> --collection clientorders --file export-clientorders.json --jsonArray");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run export
exportMigratedData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
