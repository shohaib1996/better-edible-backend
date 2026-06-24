import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { ClientOrder } from "../models/ClientOrder";
import { Label } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import Promotion from "../models/Promotion";
import PromotionUsage from "../models/PromotionUsage";
import { Types } from "mongoose";
import { getUnitPriceByProductType } from "./clientOrder/clientOrderHelpers";

async function resolvePromotion(
  code: string | undefined,
  promotionId: string | undefined,
  storeId: string,
  orderTotal: number,
  autoApplyFallback = true
) {
  const now = new Date();
  const timeFilter = {
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
  };
  const storeObjId = new Types.ObjectId(storeId);

  const buildFilter = (extra: Record<string, unknown>) => ({
    status: "active",
    ...timeFilter,
    $or: [{ storeIds: { $size: 0 } }, { storeIds: storeObjId }],
    ...extra,
  });

  let candidates;
  if (promotionId) {
    candidates = await Promotion.find(buildFilter({ _id: new Types.ObjectId(promotionId) }));
  } else if (code) {
    candidates = await Promotion.find(buildFilter({ code: code.toUpperCase().trim() }));
  } else if (autoApplyFallback) {
    candidates = await Promotion.find(buildFilter({ autoApply: true })).sort({ value: -1 });
  } else {
    return null;
  }

  for (const promo of candidates) {
    if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) continue;
    if (promo.maxUses && promo.usedCount >= promo.maxUses) continue;
    if (promo.maxUsesPerStore) {
      const used = await PromotionUsage.countDocuments({ promotionId: promo._id, storeId: storeObjId });
      if (used >= promo.maxUsesPerStore) continue;
    }
    return promo;
  }
  return null;
}

// -------------------
// GET /api/store/orders?storeId=&page=&limit=
// Store — get all their orders
// -------------------
const COMPLETED_STATUSES = ["shipped", "delivered"];

export const getMyOrders = asyncHandler(async (req, res) => {
  const { storeId, statusGroup, page, limit } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({
    store: new Types.ObjectId(storeId as string),
  });
  if (!client) {
    return res.status(200).json({ success: true, orders: [] });
  }

  const filter: Record<string, any> = { client: client._id };
  if (statusGroup === "ongoing") filter.status = { $nin: COMPLETED_STATUSES };
  else if (statusGroup === "completed") filter.status = { $in: COMPLETED_STATUSES };

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;
    const [totalItems, orders] = await Promise.all([
      ClientOrder.countDocuments(filter),
      ClientOrder.find(filter)
        .populate("items.label", "flavorName itemId currentStage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    return res.status(200).json({
      success: true,
      orders,
      pagination: { page: pageNum, limit: limitNum, totalItems, totalPages },
    });
  }

  const orders = await ClientOrder.find(filter)
    .populate("items.label", "flavorName itemId currentStage")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, orders });
});

// -------------------
// POST /api/store/orders
// Store — place a new order (approved labels only)
// -------------------
export const placeOrder = asyncHandler(async (req, res) => {
  const { storeId, items, deliveryDate, promoCode, promotionId } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("items array is required and must not be empty", 400);
  }
  if (!deliveryDate) throw new AppError("deliveryDate is required", 400);

  const client = await PrivateLabelClient.findOne({
    store: new Types.ObjectId(storeId),
  });
  if (!client) throw new AppError("No private label client found for this store", 404);
  if (client.status !== "active") {
    throw new AppError("Your account must be active before placing orders", 400);
  }

  // Validate each label — must be ready_for_production
  const labelIds = items.map((i: { labelId: string }) => new Types.ObjectId(i.labelId));
  const labels = await Label.find({ _id: { $in: labelIds } });

  const labelMap: Record<string, (typeof labels)[0]> = {};
  for (const l of labels) labelMap[String(l._id)] = l;

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const label = labelMap[item.labelId];
    if (!label) throw new AppError(`Label ${item.labelId} not found`, 404);
    if (label.currentStage !== "ready_for_production") {
      throw new AppError(`Label "${label.flavorName}" is not yet approved for ordering`, 400);
    }

    const quantity = parseInt(item.quantity, 10);
    if (!quantity || quantity < 1) {
      throw new AppError(`Invalid quantity for label "${label.flavorName}"`, 400);
    }

    const unitPrice = label.unitCost ?? (await getUnitPriceByProductType(label.productType));
    const lineTotal = parseFloat((unitPrice * quantity).toFixed(2));
    subtotal += lineTotal;

    orderItems.push({
      label: label._id,
      flavorName: label.flavorName,
      productType: label.productType,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  // ── Promotion ──────────────────────────────────────────────────────────────
  const promo = await resolvePromotion(promoCode, promotionId, storeId, subtotal);
  let discountAmount = 0;
  if (promo) {
    discountAmount =
      promo.type === "flat"
        ? Math.min(promo.value, subtotal)
        : parseFloat(((subtotal * promo.value) / 100).toFixed(2));
  }
  const total = parseFloat((subtotal - discountAmount).toFixed(2));

  const order = new ClientOrder({
    client: client._id,
    assignedRep: client.assignedRep,
    status: "waiting",
    deliveryDate: new Date(deliveryDate),
    items: orderItems,
    subtotal,
    discount: promo ? promo.value : 0,
    discountType: promo ? promo.type : "flat",
    discountAmount,
    promotionId: promo ? promo._id : undefined,
    promotionCode: promo?.code ?? undefined,
    total,
    createdBy: { userType: "store" },
  });

  order.calculateProductionStart();
  await order.save();

  if (promo) {
    await PromotionUsage.create({
      promotionId: promo._id,
      storeId: new Types.ObjectId(storeId),
      orderId: order._id,
      discountAmount,
      appliedBy: "store",
    });
    await Promotion.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
  }

  res.status(201).json({ success: true, order });
});
