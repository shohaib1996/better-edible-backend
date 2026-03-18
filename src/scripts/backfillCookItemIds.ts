/**
 * Migration Script: Backfill cookItemId for all existing cook items
 *
 * Old format: {storeMongoId}-{PL-N}-{labelMongoId}
 * New format: {storeId}{orderNumber}{itemId}  e.g. S10001PL10154B003
 *
 * For each cook item:
 *   1. Parse orderId (was stored as the orderNumber string, e.g. "PL-10154")
 *   2. Look up the ClientOrder by orderNumber to get the client → store → storeId
 *   3. Look up the Label by itemId field (labelId on CookItem) to get label.itemId
 *   4. Build new cookItemId = storeId + orderNumber(no dash) + label.itemId
 *
 * Usage:
 *   npx ts-node src/scripts/backfillCookItemIds.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("Connected to MongoDB");

  const cookItemsCol = mongoose.connection.collection("cookitems");
  const clientOrdersCol = mongoose.connection.collection("clientorders");
  const labelsCol = mongoose.connection.collection("labels");
  const plClientsCol = mongoose.connection.collection("privatelabelclients");
  const storesCol = mongoose.connection.collection("stores");

  const cookItems = await cookItemsCol.find({}).toArray();
  console.log(`Found ${cookItems.length} total cook items`);

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of cookItems) {
    try {
      // orderId is stored as the orderNumber string e.g. "PL-10154" or "PL10154"
      const rawOrderId = item.orderId as string;

      // Find the client order by orderNumber
      const order = await clientOrdersCol.findOne({ orderNumber: rawOrderId });
      if (!order) {
        errors.push(`Cook item ${item._id}: order not found for orderId="${rawOrderId}"`);
        skipped++;
        continue;
      }

      // Get the client to find the store
      const client = await plClientsCol.findOne({ _id: order.client });
      if (!client) {
        errors.push(`Cook item ${item._id}: client not found for order ${rawOrderId}`);
        skipped++;
        continue;
      }

      const store = await storesCol.findOne({ _id: client.store });
      if (!store || !store.storeId) {
        errors.push(`Cook item ${item._id}: store or storeId missing for client ${client._id}`);
        skipped++;
        continue;
      }

      // itemId on CookItem is the label's MongoDB _id
      const labelObjectId = item.itemId
        ? (mongoose.Types.ObjectId.isValid(item.itemId)
            ? new mongoose.Types.ObjectId(item.itemId)
            : null)
        : null;

      if (!labelObjectId) {
        errors.push(`Cook item ${item._id}: invalid itemId="${item.itemId}"`);
        skipped++;
        continue;
      }

      const label = await labelsCol.findOne({ _id: labelObjectId });
      if (!label || !label.itemId) {
        errors.push(`Cook item ${item._id}: label itemId missing for label ${item.itemId}`);
        skipped++;
        continue;
      }

      // Build new cookItemId: storeId + orderNumber without dash + label.itemId
      const orderNumber = (order.orderNumber as string).replace("-", ""); // PL-10154 → PL10154
      const newCookItemId = `${store.storeId}${orderNumber}${label.itemId}`;

      if (item.cookItemId === newCookItemId) {
        skipped++;
        continue;
      }

      await cookItemsCol.updateOne(
        { _id: item._id },
        { $set: { cookItemId: newCookItemId } }
      );

      // Also update any molds/trays/units that reference the old cookItemId
      const oldCookItemId = item.cookItemId as string;

      await mongoose.connection.collection("molds").updateMany(
        { currentCookItemId: oldCookItemId },
        { $set: { currentCookItemId: newCookItemId } }
      );

      await mongoose.connection.collection("dehydratortrays").updateMany(
        { currentCookItemId: oldCookItemId },
        { $set: { currentCookItemId: newCookItemId } }
      );

      await mongoose.connection.collection("cases").updateMany(
        { cookItemId: oldCookItemId },
        { $set: { cookItemId: newCookItemId } }
      );

      console.log(`  ${oldCookItemId} → ${newCookItemId}`);
      updated++;
    } catch (err: any) {
      errors.push(`Cook item ${item._id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(" ", e));
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
