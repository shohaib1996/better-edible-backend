/**
 * Migration Script: Backfill itemId for all existing labels
 *
 * Assigns B001, B002... / R001, R002... per prefix, sorted by createdAt ASC.
 * Sets the counters.itemId_B / itemId_R (etc.) seq to the last assigned number.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillLabelItemIds.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

function getItemPrefix(productType: string): string {
  const p = productType.toLowerCase();
  if (p.includes("biomax")) return "B";
  if (p.includes("rosin")) return "R";
  if (p.includes("chocolate")) return "C";
  if (p.includes("crispy") || p.includes("cracker")) return "K";
  return "X";
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("Connected to MongoDB");

  const labelsCol = mongoose.connection.collection("labels");
  const countersCol = mongoose.connection.collection("counters");

  // Fetch all labels without itemId, sorted oldest first
  const labels = await labelsCol
    .find({ itemId: { $exists: false } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${labels.length} labels without itemId`);

  if (labels.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Find the highest existing itemId per prefix so we don't collide
  const existingLabels = await labelsCol
    .find({ itemId: { $exists: true } })
    .project({ itemId: 1 })
    .toArray();

  const seqMap: Record<string, number> = {};
  for (const l of existingLabels) {
    const match = String(l.itemId).match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const [, prefix, numStr] = match;
    const num = parseInt(numStr, 10);
    if (!seqMap[prefix] || num > seqMap[prefix]) seqMap[prefix] = num;
  }

  const ops = labels.map((label) => {
    const prefix = getItemPrefix(label.productType ?? "");
    if (!seqMap[prefix]) seqMap[prefix] = 0;
    seqMap[prefix]++;
    const itemId = `${prefix}${String(seqMap[prefix]).padStart(3, "0")}`;
    return {
      updateOne: {
        filter: { _id: label._id },
        update: { $set: { itemId } },
      },
    };
  });

  await labelsCol.bulkWrite(ops);
  console.log(`Assigned itemIds. Summary:`);
  for (const [prefix, count] of Object.entries(seqMap)) {
    console.log(`  ${prefix}: ${prefix}001 → ${prefix}${String(count).padStart(3, "0")}`);
  }

  // Update counters so new labels continue from the right seq
  for (const [prefix, seq] of Object.entries(seqMap)) {
    await countersCol.findOneAndUpdate(
      { _id: `itemId_${prefix}` } as any,
      { $set: { seq } },
      { upsert: true }
    );
    console.log(`Counter itemId_${prefix} set to ${seq}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
