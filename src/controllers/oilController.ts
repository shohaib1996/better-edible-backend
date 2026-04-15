import { OilContainer } from "../models/OilContainer";
import { WasteLog } from "../models/WasteLog";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const CLING_GRAMS = 2; // fixed cling loss per batch (grams added on top of net pull)

function calcPull(
  cannabisType: "BioMax" | "Rosin",
  potency: number,
  moldCount: number
): { netPerMold: number; totalPull: number } {
  const potencyDecimal = potency / 100;
  const netPerMold =
    cannabisType === "BioMax"
      ? 14.84 / potencyDecimal
      : 7 / potencyDecimal;
  const totalPull = netPerMold * moldCount + CLING_GRAMS;
  return { netPerMold, totalPull };
}

function extractPerformedBy(body: any): { userId: string; userName: string } {
  const p = body?.performedBy;
  return {
    userId: p?.userId || "unknown",
    userName: p?.userName || "Unknown",
  };
}

// ─────────────────────────────────────────────────────────
// getContainers
// GET /api/oil/containers
// ─────────────────────────────────────────────────────────

export const getContainers = asyncHandler(async (req, res) => {
  const { status, cannabisType, page = 1, limit = 50 } = req.query;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (cannabisType) filter.cannabisType = cannabisType;

  const skip = (Number(page) - 1) * Number(limit);

  const [containers, total] = await Promise.all([
    OilContainer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("-history")   // omit history in list view for performance
      .lean(),
    OilContainer.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), containers });
});

// ─────────────────────────────────────────────────────────
// getContainerById
// GET /api/oil/containers/:containerId
// ─────────────────────────────────────────────────────────

export const getContainerById = asyncHandler(async (req, res) => {
  const { containerId } = req.params;
  const container = await OilContainer.findOne({ containerId }).lean();
  if (!container) throw new AppError("Container not found", 404);
  res.json({ success: true, container });
});

// ─────────────────────────────────────────────────────────
// createContainer
// POST /api/oil/containers
// ─────────────────────────────────────────────────────────

export const createContainer = asyncHandler(async (req, res) => {
  const { containerId, name, cannabisType, potency, totalAmount } = req.body;
  const performedBy = extractPerformedBy(req.body);

  const existing = await OilContainer.findOne({ containerId });
  if (existing) throw new AppError(`Container ID "${containerId}" already exists`, 409);

  const container = await OilContainer.create({
    containerId,
    name,
    cannabisType,
    potency,
    totalAmount,
    remainingAmount: totalAmount,
    status: "active",
    createdBy: performedBy.userId,
    history: [
      {
        action: "created",
        amount: totalAmount,
        balanceBefore: 0,
        balanceAfter: totalAmount,
        performedBy,
        timestamp: new Date(),
      },
    ],
  });

  res.status(201).json({ success: true, container });
});

// ─────────────────────────────────────────────────────────
// refillContainer
// PATCH /api/oil/containers/:containerId/refill
// ─────────────────────────────────────────────────────────

export const refillContainer = asyncHandler(async (req, res) => {
  const { containerId } = req.params;
  const { amount } = req.body;
  const performedBy = extractPerformedBy(req.body);

  const container = await OilContainer.findOne({ containerId });
  if (!container) throw new AppError("Container not found", 404);
  if (container.status === "cleaning") {
    throw new AppError("Container is being cleaned — cannot refill", 400);
  }

  const balanceBefore = container.remainingAmount;
  container.remainingAmount += amount;
  container.totalAmount += amount;
  if (container.status === "empty") container.status = "active";

  container.history.push({
    action: "refilled",
    amount,
    balanceBefore,
    balanceAfter: container.remainingAmount,
    performedBy,
    timestamp: new Date(),
  });

  await container.save();
  res.json({ success: true, container });
});

// ─────────────────────────────────────────────────────────
// cleanContainer
// PATCH /api/oil/containers/:containerId/clean
// Zeroes out remaining amount, auto-creates a WasteLog entry
// ─────────────────────────────────────────────────────────

export const cleanContainer = asyncHandler(async (req, res) => {
  const { containerId } = req.params;
  const { notes } = req.body;
  const performedBy = extractPerformedBy(req.body);

  const container = await OilContainer.findOne({ containerId });
  if (!container) throw new AppError("Container not found", 404);

  const wastedAmount = container.remainingAmount;
  const balanceBefore = wastedAmount;

  container.remainingAmount = 0;
  container.status = "cleaning";

  container.history.push({
    action: "cleaned",
    amount: wastedAmount,
    balanceBefore,
    balanceAfter: 0,
    performedBy,
    note: notes,
    timestamp: new Date(),
  });

  // Auto-create waste log entry
  const wasteLog = await WasteLog.create({
    date: new Date(),
    material: container.cannabisType,
    amount: wastedAmount,
    reason: "cleaning",
    sourceContainerId: containerId,
    loggedBy: performedBy,
    notes,
    isAutomatic: true,
  });

  await container.save();
  res.json({ success: true, container, wasteLog });
});

// ─────────────────────────────────────────────────────────
// calculatePull
// GET /api/oil/containers/:containerId/calculate?moldCount=N
// Returns only the amount to use — no potency or formula exposed
// ─────────────────────────────────────────────────────────

export const calculatePull = asyncHandler(async (req, res) => {
  const { containerId } = req.params;
  const moldCount = Number(req.query.moldCount);

  if (!moldCount || moldCount < 1) {
    throw new AppError("moldCount must be at least 1", 400);
  }

  const container = await OilContainer.findOne({ containerId }).lean();
  if (!container) throw new AppError("Container not found", 404);
  if (container.status !== "active") {
    throw new AppError(`Container is "${container.status}" — not available for use`, 400);
  }

  const { totalPull } = calcPull(container.cannabisType, container.potency, moldCount);
  const roundedPull = Math.round(totalPull * 10) / 10; // round to 1 decimal

  if (container.remainingAmount < roundedPull) {
    throw new AppError(
      `Insufficient oil — container has ${container.remainingAmount}g, need ${roundedPull}g. Select another container.`,
      400
    );
  }

  // Return only what the cook needs to see — no potency, no formula
  res.json({
    success: true,
    containerId: container.containerId,
    containerName: container.name,
    amountToUse: roundedPull,
    remainingAfter: Math.round((container.remainingAmount - roundedPull) * 10) / 10,
    instruction: `Weigh out ${roundedPull}g from ${container.name}`,
  });
});

// ─────────────────────────────────────────────────────────
// recordDrawdown
// POST /api/oil/containers/:containerId/drawdown
// Called after molding complete to deduct actual pulled amount
// ─────────────────────────────────────────────────────────

export const recordDrawdown = asyncHandler(async (req, res) => {
  const { containerId } = req.params;
  const { cookItemId, actualAmount } = req.body;
  const performedBy = extractPerformedBy(req.body);

  const container = await OilContainer.findOne({ containerId });
  if (!container) throw new AppError("Container not found", 404);
  if (container.status !== "active") {
    throw new AppError(`Container is "${container.status}" — cannot draw down`, 400);
  }
  if (container.remainingAmount < actualAmount) {
    throw new AppError(
      `Insufficient oil — container has ${container.remainingAmount}g, tried to draw ${actualAmount}g`,
      400
    );
  }

  const balanceBefore = container.remainingAmount;
  container.remainingAmount = Math.round((container.remainingAmount - actualAmount) * 100) / 100;

  if (container.remainingAmount <= 0) {
    container.remainingAmount = 0;
    container.status = "empty";
  }

  container.history.push({
    action: "drawdown",
    amount: actualAmount,
    balanceBefore,
    balanceAfter: container.remainingAmount,
    performedBy,
    note: cookItemId ? `CookItem: ${cookItemId}` : undefined,
    timestamp: new Date(),
  });

  await container.save();
  res.json({ success: true, container });
});

// ─────────────────────────────────────────────────────────
// getWasteLogs
// GET /api/oil/waste-logs
// ─────────────────────────────────────────────────────────

export const getWasteLogs = asyncHandler(async (req, res) => {
  const { material, reason, sourceContainerId, page = 1, limit = 50 } = req.query;

  const filter: Record<string, any> = {};
  if (material) filter.material = material;
  if (reason) filter.reason = reason;
  if (sourceContainerId) filter.sourceContainerId = sourceContainerId;

  const skip = (Number(page) - 1) * Number(limit);

  const [wasteLogs, total] = await Promise.all([
    WasteLog.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    WasteLog.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), wasteLogs });
});

// ─────────────────────────────────────────────────────────
// createWasteLog  (manual entry)
// POST /api/oil/waste-logs
// ─────────────────────────────────────────────────────────

export const createWasteLog = asyncHandler(async (req, res) => {
  const { date, material, amount, reason, sourceContainerId, notes } = req.body;
  const performedBy = extractPerformedBy(req.body);

  // Verify the source container exists
  const container = await OilContainer.findOne({ containerId: sourceContainerId }).lean();
  if (!container) throw new AppError("Source container not found", 404);

  const wasteLog = await WasteLog.create({
    date: new Date(date),
    material,
    amount,
    reason,
    sourceContainerId,
    loggedBy: performedBy,
    notes,
    isAutomatic: false,
  });

  res.status(201).json({ success: true, wasteLog });
});
