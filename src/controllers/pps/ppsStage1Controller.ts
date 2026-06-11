import { CookItem } from "../../models/CookItem";
import { Mold } from "../../models/Mold";
import { OilContainer } from "../../models/OilContainer";
import { Flavor } from "../../models/Flavor";
import { ProductColor } from "../../models/ProductColor";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { extractPerformedBy } from "./ppsHelpers";

// ─────────────────────────────────────────────────────────
// bulkCreateCookItems
// POST /api/pps/cook-items/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateCookItems = asyncHandler(async (req, res) => {
  const { orderId, orderNumber, customerId, items } = req.body;

  if (!orderId || !orderNumber || !customerId || !Array.isArray(items) || items.length === 0) {
    throw new AppError(
      "orderId, orderNumber, customerId, and a non-empty items array are required",
      400
    );
  }

  const { ClientOrder } = await import("../../models/ClientOrder");
  const { Label } = await import("../../models/Label");

  const order = (await ClientOrder.findById(orderId)
    .populate({
      path: "client",
      populate: { path: "store", select: "storeId" },
    })
    .lean()) as any;

  if (!order) throw new AppError("Order not found", 404);

  const storeId: string | undefined = order.client?.store?.storeId;
  if (!storeId) throw new AppError("Store storeId missing — run backfill script", 400);

  const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");

  const cookItemDocs = await Promise.all(
    items.map(async (item: any) => {
      const label = (await Label.findById(item.labelId).select("itemId").lean()) as any;
      if (!label?.itemId) throw new AppError(`Label itemId missing for label ${item.labelId}`, 400);

      const cookItemId = `${storeId}${normalizedOrderNumber}${label.itemId}`;

      return {
        cookItemId,
        customerId,
        orderId: order.orderNumber,
        itemId: item.labelId,
        labelId: item.labelId,
        privateLabOrderId: orderId,
        storeName: item.storeName,
        flavor: item.flavor,
        quantity: item.quantity,
        flavorComponents: item.flavorComponents || [],
        colorComponents: item.colorComponents || [],
        productType: item.productType,
        specialFormulation: false,
        status: "pending",
        expectedCount: item.quantity,
      };
    })
  );

  const cookItems = await CookItem.insertMany(cookItemDocs);

  res.status(201).json({
    success: true,
    message: `${cookItems.length} cook items created`,
    cookItems,
  });
});

// ─────────────────────────────────────────────────────────
// getStage1CookItem
// GET /api/pps/stage-1/cook-items
// ─────────────────────────────────────────────────────────

export const getStage1CookItems = asyncHandler(async (req, res) => {
  const { status = "pending,in-progress", page = 1, limit = 20 } = req.query;

  const statusArray = String(status)
    .split(",")
    .map((s) => s.trim());
  const skip = (Number(page) - 1) * Number(limit);

  const [cookItems, total] = await Promise.all([
    CookItem.find({ status: { $in: statusArray } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    CookItem.countDocuments({ status: { $in: statusArray } }),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), cookItems });
});

// ─────────────────────────────────────────────────────────
// assignMold
// POST /api/pps/stage-1/assign-mold
// ─────────────────────────────────────────────────────────

export const assignMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId) {
    throw new AppError("cookItemId and moldId are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["pending", "in-progress"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be pending or in-progress`,
      400
    );
  }

  const mold = await Mold.findOneAndUpdate(
    { moldId, status: "available" },
    { status: "in-use", currentCookItemId: cookItemId },
    { new: true }
  );

  if (!mold) throw new AppError("Mold not found or already in use", 400);

  const now = new Date();
  const { unitsPerMold } = req.body;
  const units = typeof unitsPerMold === "number" ? unitsPerMold : (mold.unitsPerMold ?? 70);
  cookItem.assignedMoldIds.push(moldId);
  cookItem.moldingTimestamps.push({ moldId, unitsPerMold: units, startTimestamp: now });

  if (cookItem.status === "pending") {
    cookItem.status = "in-progress";
    cookItem.cookingMoldingStartTimestamp = now;
  }

  cookItem.history.push({
    action: "mold_assigned",
    performedBy,
    detail: `Mold ${moldId} assigned (${units} units)`,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem, mold });
});

// ─────────────────────────────────────────────────────────
// unassignMold
// DELETE /api/pps/stage-1/unassign-mold
// ─────────────────────────────────────────────────────────

export const unassignMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId) {
    throw new AppError("cookItemId and moldId are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["pending", "in-progress"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be pending or in-progress to unassign a mold`,
      400
    );
  }

  const mold = await Mold.findOneAndUpdate(
    { moldId },
    { status: "available", currentCookItemId: null },
    { new: true }
  );
  if (!mold) throw new AppError("Mold not found", 404);

  cookItem.assignedMoldIds = cookItem.assignedMoldIds.filter((id) => id !== moldId);
  cookItem.moldingTimestamps = cookItem.moldingTimestamps.filter((t) => t.moldId !== moldId);

  if (cookItem.assignedMoldIds.length === 0) {
    cookItem.status = "pending";
    cookItem.cookingMoldingStartTimestamp = undefined;
  }

  cookItem.history.push({
    action: "mold_unassigned",
    performedBy,
    detail: `Mold ${moldId} removed`,
    timestamp: new Date(),
  });

  await cookItem.save();

  res.json({ success: true, cookItem, mold });
});

// ─────────────────────────────────────────────────────────
// completeStage1
// PATCH /api/pps/stage-1/complete
// ─────────────────────────────────────────────────────────

export const completeStage1 = asyncHandler(async (req, res) => {
  const { cookItemId, oilContainerId, oilCalculatedAmount, oilActualAmount } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "in-progress") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be in-progress`, 400);
  }
  if (!cookItem.assignedMoldIds || cookItem.assignedMoldIds.length === 0) {
    throw new AppError("No molds assigned to this cook item", 400);
  }

  // ── Oil drawdown (optional — only if container was selected) ──
  if (oilContainerId && oilActualAmount) {
    const container = await OilContainer.findOne({ containerId: oilContainerId });
    if (!container) throw new AppError(`Oil container "${oilContainerId}" not found`, 404);
    if (container.status !== "active") {
      throw new AppError(`Oil container is "${container.status}" — not available`, 400);
    }
    if (container.remainingAmount < oilActualAmount) {
      throw new AppError(
        `Insufficient oil — container has ${container.remainingAmount}g, need ${oilActualAmount}g`,
        400
      );
    }

    const balanceBefore = container.remainingAmount;
    container.remainingAmount =
      Math.round((container.remainingAmount - oilActualAmount) * 100) / 100;
    if (container.remainingAmount <= 0) {
      container.remainingAmount = 0;
      container.status = "empty";
    }
    container.history.push({
      action: "drawdown",
      amount: oilActualAmount,
      balanceBefore,
      balanceAfter: container.remainingAmount,
      performedBy: { userId: performedBy.userId, userName: performedBy.userName },
      note: `CookItem: ${cookItemId}`,
      timestamp: new Date(),
    });
    await container.save();

    cookItem.oilContainerId = oilContainerId;
    cookItem.oilCalculatedAmount = oilCalculatedAmount;
    cookItem.oilActualAmount = oilActualAmount;
  }

  const now = new Date();
  cookItem.cookingMoldingCompletionTimestamp = now;

  cookItem.moldingTimestamps = cookItem.moldingTimestamps.map((entry) => ({
    ...entry,
    completionTimestamp: entry.completionTimestamp ?? now,
  }));

  cookItem.status = "cooking_molding_complete";

  cookItem.history.push({
    action: "stage_1_complete",
    performedBy,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// setFlavorColor
// PATCH /api/pps/stage-1/set-flavor-color
// First-time flavor & color entry for a cook item
// ─────────────────────────────────────────────────────────

export const setFlavorColor = asyncHandler(async (req, res) => {
  const { cookItemId, flavorAmounts, colorAmounts } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);
  if (!Array.isArray(flavorAmounts) || flavorAmounts.length === 0) {
    throw new AppError("flavorAmounts must be a non-empty array", 400);
  }
  if (!Array.isArray(colorAmounts)) {
    throw new AppError("colorAmounts must be an array", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);

  // Validate all flavorIds exist and are active
  const flavorIds = flavorAmounts.map((f: any) => f.flavorId);
  const flavors = await Flavor.find({ flavorId: { $in: flavorIds }, isActive: true }).lean();
  if (flavors.length !== flavorIds.length) {
    throw new AppError("One or more flavors not found or inactive", 400);
  }

  // Validate all colorIds exist and are active (if any provided)
  const colorIds = colorAmounts.map((c: any) => c.colorId);
  if (colorIds.length > 0) {
    const colors = await ProductColor.find({ colorId: { $in: colorIds }, isActive: true }).lean();
    if (colors.length !== colorIds.length) {
      throw new AppError("One or more colors not found or inactive", 400);
    }
  }

  const now = new Date();
  cookItem.flavorIds = flavorIds;
  cookItem.flavorAmounts = flavorAmounts;
  cookItem.colorIds = colorIds;
  cookItem.colorAmounts = colorAmounts;
  cookItem.flavorColorSetAt = now;
  cookItem.flavorColorSetBy = {
    userId: performedBy.userId,
    userName: performedBy.userName,
  };

  cookItem.history.push({
    action: "flavor_color_set",
    performedBy,
    detail: `Flavors: ${flavorIds.join(", ")}${colorIds.length ? ` | Colors: ${colorIds.join(", ")}` : ""}`,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// editFlavorColor
// PATCH /api/pps/stage-1/edit-flavor-color
// Edit existing flavor & color — records edit history and notifies admin
// ─────────────────────────────────────────────────────────

export const editFlavorColor = asyncHandler(async (req, res) => {
  const { cookItemId, flavorAmounts, colorAmounts, note } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);
  if (!Array.isArray(flavorAmounts) || flavorAmounts.length === 0) {
    throw new AppError("flavorAmounts must be a non-empty array", 400);
  }
  if (!Array.isArray(colorAmounts)) {
    throw new AppError("colorAmounts must be an array", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!cookItem.flavorColorSetAt) {
    throw new AppError("Flavor/color has not been set yet — use set-flavor-color first", 400);
  }

  // Validate flavors
  const flavorIds = flavorAmounts.map((f: any) => f.flavorId);
  const flavors = await Flavor.find({ flavorId: { $in: flavorIds }, isActive: true }).lean();
  if (flavors.length !== flavorIds.length) {
    throw new AppError("One or more flavors not found or inactive", 400);
  }

  // Validate colors
  const colorIds = colorAmounts.map((c: any) => c.colorId);
  if (colorIds.length > 0) {
    const colors = await ProductColor.find({ colorId: { $in: colorIds }, isActive: true }).lean();
    if (colors.length !== colorIds.length) {
      throw new AppError("One or more colors not found or inactive", 400);
    }
  }

  const now = new Date();

  // Push to edit history before overwriting
  cookItem.flavorColorEditHistory.push({
    editedBy: { userId: performedBy.userId, userName: performedBy.userName },
    editedAt: now,
    note: note ?? undefined,
  });

  cookItem.flavorIds = flavorIds;
  cookItem.flavorAmounts = flavorAmounts;
  cookItem.colorIds = colorIds;
  cookItem.colorAmounts = colorAmounts;

  cookItem.history.push({
    action: "flavor_color_edited",
    performedBy,
    detail: `Updated flavors: ${flavorIds.join(", ")}${colorIds.length ? ` | Colors: ${colorIds.join(", ")}` : ""}${note ? ` | Note: ${note}` : ""}`,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// generateRecipe
// POST /api/pps/stage-1/generate-recipe
// Calls tRPC batch: color.recipe + color.flavor
// ─────────────────────────────────────────────────────────

const COLOR_API = "https://gummycolor-kceb6nqy.manus.space";

export const generateRecipe = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);

  const { Label } = await import("../../models/Label");
  const label = await Label.findById(cookItem.labelId)
    .select("gummyColorHex gummyColorName flavorOilType selectedFlavors")
    .lean() as any;

  // Use actual gummy builder flavor selection, not the label display name
  const selectedFlavors: string[] = label?.selectedFlavors ?? [];
  const flavorName = selectedFlavors.length > 0
    ? selectedFlavors.join(", ")
    : cookItem.flavor;
  const totalMolds = Math.ceil(cookItem.quantity / 70);

  // Step 1: auto-generate hex if missing, save to label
  let hex: string | undefined = label?.gummyColorHex;
  if (!hex) {
    try {
      const genRes = await fetch(
        `${COLOR_API}/api/trpc/color.generate?batch=1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "0": { json: { flavor: flavorName } } }),
        }
      );
      if (genRes.ok) {
        const genData = (await genRes.json()) as any[];
        const generated = genData?.[0]?.result?.data?.json;
        if (generated?.hex) {
          hex = generated.hex;
          await Label.findByIdAndUpdate(cookItem.labelId, {
            gummyColorHex: hex,
            ...(generated.name && { gummyColorName: generated.name }),
          });
        }
      }
    } catch (_) { /* proceed without hex */ }
  }

  // Step 2: tRPC batch — color.recipe (needs hex) + color.flavor
  // If no hex, only call color.flavor
  const hasHex = !!hex;
  const endpoints = hasHex ? "color.recipe,color.flavor" : "color.flavor";
  const batchPayload: Record<string, any> = hasHex
    ? {
        "0": { json: { hex, flavor: flavorName } },
        "1": { json: { flavor: flavorName } },
      }
    : { "0": { json: { flavor: flavorName } } };

  const batchRes = await fetch(
    `${COLOR_API}/api/trpc/${endpoints}?batch=1`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchPayload),
    }
  );
  if (!batchRes.ok) throw new AppError("Recipe API unavailable", 502);
  const batchData = (await batchRes.json()) as any[];

  const colorJson  = hasHex ? batchData?.[0]?.result?.data?.json : null;
  const flavorJson = hasHex ? batchData?.[1]?.result?.data?.json : batchData?.[0]?.result?.data?.json;

  if (!flavorJson) throw new AppError("Invalid response from recipe API", 502);

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const aiRecipe: any = {
    totalMolds,
    generatedAt: new Date(),
    colorMissing: !hasHex,
    lockedFlavorOilType: label?.flavorOilType ?? "lorann",
  };

  // Flavor — scale grams_per_700g by totalMolds (new API returns per-700g, not pre-scaled)
  aiRecipe.flavorLorann = (flavorJson.lorann?.components ?? []).map((c: any) => ({
    name: c.name,
    product: c.product,
    gramsPerMold: c.grams_per_700g,
    totalGrams: round1(c.grams_per_700g * totalMolds),
    ratioPct: c.ratio_pct,
    note: c.note,
  }));

  aiRecipe.flavorExtract = (flavorJson.extract?.components ?? []).map((c: any) => ({
    name: c.name,
    product: c.product,
    source: c.source,
    gramsPerMold: c.grams_per_700g,
    totalGrams: round1(c.grams_per_700g * totalMolds),
    ratioPct: c.ratio_pct,
    note: c.note,
  }));

  aiRecipe.lorannMixingNote  = flavorJson.lorann?.mixing_note;
  aiRecipe.extractMixingNote = flavorJson.extract?.mixing_note;
  aiRecipe.flavorNote        = flavorJson.flavor_note;

  // Color — recipe[] has { color, drops, hex }; pct computed from total drops
  if (hasHex && colorJson?.recipe?.length) {
    const totalDrops: number = colorJson.recipe.reduce(
      (sum: number, c: any) => sum + (c.drops ?? 0), 0
    );
    aiRecipe.colorRecipe = colorJson.recipe.map((c: any) => ({
      color: c.color,
      hex: c.hex,
      dropsApprox: c.drops,
      pct: totalDrops > 0 ? Math.round((c.drops / totalDrops) * 100) : 0,
    }));
    aiRecipe.batchColoringDrops = totalDrops;
    aiRecipe.colorMixingNote    = colorJson.mixing_note;
    aiRecipe.colorHexUsed       = hex;
    aiRecipe.colorName          = label?.gummyColorName;
  } else {
    aiRecipe.colorRecipe        = [];
    aiRecipe.batchColoringDrops = 0;
  }

  // SOP — build step-by-step instructions from the generated recipe
  aiRecipe.sopSteps = buildSopSteps(aiRecipe);

  cookItem.aiRecipe = aiRecipe;
  await cookItem.save();

  res.json({ success: true, aiRecipe: cookItem.aiRecipe });
});

function buildSopSteps(recipe: any): string[] {
  const steps: string[] = [];
  const n = recipe.totalMolds as number;
  const molds = `${n} mold${n !== 1 ? "s" : ""}`;
  const lockedType: string = recipe.lockedFlavorOilType ?? "lorann";
  const flavorLines: any[] = lockedType === "lorann" ? (recipe.flavorLorann ?? []) : (recipe.flavorExtract ?? []);
  const mixingNote: string | undefined = lockedType === "lorann" ? recipe.lorannMixingNote : recipe.extractMixingNote;

  steps.push(`Prepare ${molds} — inspect each cavity and lay flat on trays`);
  steps.push("Weigh out cannabis oil (refer to the cannabis oil container for your exact calculated amount)");
  steps.push("Heat kettle to 165°F (74°C)");
  steps.push("Add gelatin base to hot water; stir continuously until fully dissolved (~3 min)");
  steps.push("Remove from heat. Add cannabis oil and stir until fully combined");

  if (flavorLines.length > 0) {
    const parts = flavorLines
      .map((l: any) => `${l.product} — ${l.totalGrams}g total (${l.gramsPerMold}g per mold)`)
      .join("; ");
    steps.push(`Add flavor: ${parts}`);
    if (mixingNote) steps.push(`Mixing tip: ${mixingNote}`);
  }

  if (recipe.colorRecipe?.length > 0) {
    const colorParts = (recipe.colorRecipe as any[])
      .map((c: any) => `${c.color}: ~${c.dropsApprox} drops`)
      .join(", ");
    steps.push(`Mix color concentrate: ${colorParts}`);
    steps.push(`Add ${recipe.batchColoringDrops} drops of color concentrate to the full batch; stir to combine`);
    if (recipe.colorMixingNote) {
      const colorLabel = recipe.colorName ? `${recipe.colorName}` : "target color";
      steps.push(`Color tip (${colorLabel}): ${recipe.colorMixingNote}`);
    }
  }

  steps.push(`Pour mixture into all ${molds} (70 units per mold) while still warm`);
  steps.push("Allow to cool at room temperature for 10 minutes before moving");
  steps.push("Load filled molds onto dehydrator trays and proceed to Stage 2");

  return steps;
}
