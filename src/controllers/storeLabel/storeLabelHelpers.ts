import { Types } from "mongoose";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { GummyPool } from "../../models/GummyPool";
import { buildCannabinoidKey } from "../../utils/gummyPricing";

export async function getOrCreateClient(storeId: string): Promise<string> {
  let client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId) });
  if (!client) {
    client = await PrivateLabelClient.create({
      store: new Types.ObjectId(storeId),
      status: "onboarding",
      contactEmail: "",
      assignedRep: new Types.ObjectId("000000000000000000000000"),
      recurringSchedule: { enabled: false },
    });
  }
  return client;
}

export async function joinPool(
  labelId: Types.ObjectId,
  clientId: Types.ObjectId,
  storeId: Types.ObjectId,
  storeName: string,
  units: string,
  cannabinoids: { name: any; mg: number }[]
) {
  const key = buildCannabinoidKey(cannabinoids, true);
  let pool = await GummyPool.findOne({ cannabinoidKey: key, status: "open" });

  if (!pool) {
    pool = new GummyPool({ cannabinoidKey: key });
  }

  pool.entries = pool.entries.filter((e) => String(e.labelId) !== String(labelId));
  pool.entries.push({ clientId, storeId, storeName, labelId, units, joinedAt: new Date() });
  await pool.save();
  return pool;
}
