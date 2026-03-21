/**
 * Migration Script: Backfill storeId for all existing stores
 *
 * Assigns S10001, S10002, ... to all stores sorted by createdAt ASC.
 * Sets the counters.storeNumber.seq to the last assigned number.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillStoreIds.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("Connected to MongoDB");

  const storesCol = mongoose.connection.collection("stores");
  const countersCol = mongoose.connection.collection("counters");

  // Fetch all stores without a storeId, sorted oldest first
  const stores = await storesCol
    .find({ storeId: { $exists: false } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${stores.length} stores without storeId`);

  if (stores.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Determine starting seq (in case some stores already have storeIds)
  const existing = await storesCol
    .find({ storeId: { $exists: true } })
    .sort({ storeId: -1 })
    .limit(1)
    .toArray();

  let seq = 10000;
  if (existing.length > 0 && existing[0].storeId) {
    const match = (existing[0].storeId as string).match(/^S(\d+)$/);
    if (match) seq = parseInt(match[1], 10);
  }

  const ops = stores.map((store) => {
    seq++;
    return {
      updateOne: {
        filter: { _id: store._id },
        update: { $set: { storeId: `S${seq}` } },
      },
    };
  });

  await storesCol.bulkWrite(ops);
  console.log(`Assigned storeIds S${seq - stores.length + 1} → S${seq}`);

  // Update the counter so new stores continue from here
  await countersCol.findOneAndUpdate(
    { _id: "storeNumber" } as any,
    { $set: { seq } },
    { upsert: true }
  );
  console.log(`Counter storeNumber set to ${seq}`);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
