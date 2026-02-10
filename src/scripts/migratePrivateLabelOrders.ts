/**
 * Migration Script: Convert Old PrivateLabel Orders to New ClientOrders System
 *
 * This script will:
 * 1. Read old privatelabels data from JSON file
 * 2. Create PrivateLabelClients for each unique store
 * 3. Create Labels for each unique flavor/productType per client
 * 4. Create ClientOrders with the new structure
 *
 * Usage:
 *   npx ts-node src/scripts/migratePrivateLabelOrders.ts
 *
 * Make sure to:
 * - Backup your database before running
 * - Update the JSON file path if needed
 * - Run in development first to test
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
import { Store } from "../models/Store";

// -------------------
// Types for old data
// -------------------
interface OldLabelImage {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  originalFilename: string;
}

interface OldOrderItem {
  privateLabelType: string;
  flavor: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  labelImages?: OldLabelImage[];
}

interface OldPrivateLabelOrder {
  _id: { $oid: string };
  store: { $oid: string };
  rep: { $oid: string };
  items: OldOrderItem[];
  subtotal: number;
  discount: number;
  discountType: "flat" | "percentage";
  discountAmount?: number;
  total: number;
  status: string;
  note?: string;
  deliveryDate?: string;
  createdAt: { $date: string };
  updatedAt: { $date: string };
  orderNumber: number;
}

// -------------------
// Status mapping
// -------------------
const STATUS_MAP: Record<string, string> = {
  submitted: "waiting",
  accepted: "stage_1",
  manifested: "stage_2",
  shipped: "shipped",
  cancelled: "shipped", // Treat cancelled as shipped for migration (or skip them)
};

// -------------------
// Main Migration Function
// -------------------
async function migratePrivateLabelOrders() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Read old data from JSON file
    const jsonPath = path.join(
      __dirname,
      "../../better-edibles-database.privatelabels.json"
    );
    console.log(`📂 Reading old orders from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at: ${jsonPath}`);
    }

    const oldOrders: OldPrivateLabelOrder[] = JSON.parse(
      fs.readFileSync(jsonPath, "utf-8")
    );
    console.log(`📦 Found ${oldOrders.length} old orders to migrate`);

    // Track created entities
    const clientMap = new Map<string, mongoose.Types.ObjectId>(); // storeId -> clientId
    const labelMap = new Map<string, mongoose.Types.ObjectId>(); // clientId-productType-flavor -> labelId
    let ordersCreated = 0;
    let clientsCreated = 0;
    let labelsCreated = 0;

    // Check existing order count
    const existingOrderCount = await ClientOrder.countDocuments();
    console.log(`📝 Existing orders in database: ${existingOrderCount}`);

    // Process each old order
    for (const oldOrder of oldOrders) {
      const storeId = oldOrder.store.$oid;
      const repId = oldOrder.rep.$oid;

      console.log(`\n--- Processing Order #${oldOrder.orderNumber} ---`);

      // 1. Create or get PrivateLabelClient
      let clientId = clientMap.get(storeId);
      if (!clientId) {
        // Check if client already exists for this store
        let existingClient = await PrivateLabelClient.findOne({
          store: new mongoose.Types.ObjectId(storeId),
        });

        if (!existingClient) {
          // Get store to fetch name (email will be placeholder - update manually later)
          const store = await Store.findById(storeId);
          // Use placeholder email - should be updated manually after migration
          const contactEmail = `${store?.name?.toLowerCase().replace(/\s+/g, "-") || storeId}@update-email.com`;

          // Create new client
          existingClient = await PrivateLabelClient.create({
            store: new mongoose.Types.ObjectId(storeId),
            status: "active", // Set as active since they have orders
            contactEmail,
            assignedRep: new mongoose.Types.ObjectId(repId),
            recurringSchedule: {
              enabled: false,
            },
          });
          clientsCreated++;
          console.log(`  ✅ Created new client for store: ${store?.name || storeId}`);
        } else {
          console.log(`  ℹ️ Client already exists for store`);
        }

        clientId = existingClient._id as mongoose.Types.ObjectId;
        clientMap.set(storeId, clientId);
      }

      // 2. Create Labels for each unique flavor/productType and build items array
      const newItems: Array<{
        label: mongoose.Types.ObjectId;
        flavorName: string;
        productType: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const item of oldOrder.items) {
        const labelKey = `${clientId}-${item.privateLabelType}-${item.flavor}`;
        let labelId = labelMap.get(labelKey);

        if (!labelId) {
          // Check if label already exists
          let existingLabel = await Label.findOne({
            client: clientId,
            productType: item.privateLabelType,
            flavorName: item.flavor,
          });

          if (!existingLabel) {
            // Create new label with images from the order
            const labelImages = (item.labelImages || []).map((img) => ({
              url: img.url,
              secureUrl: img.secureUrl,
              publicId: img.publicId,
              format: img.format,
              bytes: img.bytes,
              originalFilename: img.originalFilename,
              uploadedAt: new Date(),
            }));

            existingLabel = await Label.create({
              client: clientId,
              flavorName: item.flavor,
              productType: item.privateLabelType,
              currentStage: "ready_for_production", // Assume ready since orders exist
              stageHistory: [
                {
                  stage: "ready_for_production",
                  changedAt: new Date(oldOrder.createdAt.$date),
                  notes: "Migrated from old system",
                },
              ],
              labelImages,
            });
            labelsCreated++;
            console.log(`  ✅ Created label: ${item.privateLabelType} - ${item.flavor}`);
          } else {
            console.log(`  ℹ️ Label exists: ${item.privateLabelType} - ${item.flavor}`);
          }

          labelId = existingLabel._id as mongoose.Types.ObjectId;
          labelMap.set(labelKey, labelId);
        }

        newItems.push({
          label: labelId,
          flavorName: item.flavor,
          productType: item.privateLabelType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      // 3. Create ClientOrder
      const newStatus = STATUS_MAP[oldOrder.status] || "waiting";

      // Calculate delivery date and production start date
      // If no delivery date, use 30 days from order creation (or use updatedAt for shipped orders)
      let deliveryDate: Date;
      if (oldOrder.deliveryDate) {
        deliveryDate = new Date(oldOrder.deliveryDate);
      } else if (newStatus === "shipped") {
        // For shipped orders without delivery date, use updatedAt
        deliveryDate = new Date(oldOrder.updatedAt.$date);
      } else {
        // For non-shipped orders, set delivery 30 days from creation
        deliveryDate = new Date(oldOrder.createdAt.$date);
        deliveryDate.setDate(deliveryDate.getDate() + 30);
      }

      // Production start is 14 days before delivery
      const productionStartDate = new Date(deliveryDate);
      productionStartDate.setDate(productionStartDate.getDate() - 14);

      // Create order without specifying orderNumber - let the pre-save hook generate it
      const createdOrder = await ClientOrder.create({
        client: clientId,
        assignedRep: new mongoose.Types.ObjectId(repId),
        status: newStatus,
        deliveryDate,
        productionStartDate,
        items: newItems,
        subtotal: oldOrder.subtotal,
        discount: oldOrder.discount,
        discountType: oldOrder.discountType,
        discountAmount: oldOrder.discountAmount || 0,
        total: oldOrder.total,
        note: oldOrder.note || `Migrated from old order #${oldOrder.orderNumber}`,
        isRecurring: false,
        shipASAP: false,
        trackingNumber: null,
        emailsSent: {
          orderCreatedNotification: false,
          productionStartedNotification: false,
          sevenDayReminder: false,
          readyToShipNotification: false,
          shippedNotification: false,
        },
        ...(newStatus === "shipped" && {
          actualShipDate: oldOrder.deliveryDate
            ? new Date(oldOrder.deliveryDate)
            : new Date(oldOrder.updatedAt.$date),
        }),
      });

      ordersCreated++;
      console.log(`  ✅ Created order: ${createdOrder.orderNumber} (status: ${newStatus})`);
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Migration Complete!");
    console.log("=".repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   - Clients created: ${clientsCreated}`);
    console.log(`   - Labels created: ${labelsCreated}`);
    console.log(`   - Orders created: ${ordersCreated}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
migratePrivateLabelOrders()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
