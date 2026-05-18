import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { GummyPool } from "../models/GummyPool";
import { ClientOrder } from "../models/ClientOrder";
import { Label } from "../models/Label";
import { Types } from "mongoose";

// -------------------
// GET /api/pools
// Admin — all pools
// -------------------
export const getAllPools = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pools = await GummyPool.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, pools });
});

// -------------------
// GET /api/pools/:cannabinoidKey
// Store — get pool status by cannabinoid key (to show pool progress before joining)
// -------------------
export const getPool = asyncHandler(async (req, res) => {
  const pool = await GummyPool.findOne({
    cannabinoidKey: req.params.cannabinoidKey,
    status: "open",
  });

  if (!pool) {
    return res.status(200).json({
      success: true,
      pool: null,
      totalUnits: 0,
      requiredUnits: 3000,
    });
  }

  res.status(200).json({
    success: true,
    pool,
    totalUnits: pool.totalUnits,
    requiredUnits: pool.requiredUnits,
  });
});

// -------------------
// POST /api/pools/:id/trigger
// Admin — trigger production for a pool that has reached 3000 units
// -------------------
export const triggerPool = asyncHandler(async (req, res) => {
  const pool = await GummyPool.findById(req.params.id);
  if (!pool) throw new AppError("Pool not found", 404);
  if (pool.status === "triggered") throw new AppError("Pool has already been triggered", 400);

  if (pool.totalUnits < pool.requiredUnits) {
    throw new AppError(
      `Pool has only ${pool.totalUnits} units. Needs ${pool.requiredUnits} to trigger.`,
      400
    );
  }

  // Mark pool as triggered
  pool.status = "triggered";
  pool.triggeredAt = new Date();
  await pool.save();

  // Update all participating labels to mark them as going to production
  const labelIds = pool.entries.map((e) => e.labelId);
  await Label.updateMany(
    { _id: { $in: labelIds } },
    { productionMode: "pool" }
  );

  res.status(200).json({
    success: true,
    message: `Pool triggered. ${pool.entries.length} store(s) entering production.`,
    pool,
  });
});
