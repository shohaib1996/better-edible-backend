import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { StoreCredit } from "../models/StoreCredit";

// GET /api/store/promotions/credits/:storeId/ledger  (admin — balance + full tx history)
export const getStoreCreditLedger = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const doc = await StoreCredit.findOne({ store: new Types.ObjectId(storeId) });
  res.json({ success: true, balance: doc?.balance ?? 0, transactions: doc?.transactions ?? [] });
});

// GET /api/store/promotions/credits?storeId=
export const getCreditBalance = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const doc = await StoreCredit.findOne({ store: new Types.ObjectId(storeId as string) });
  res.json({ success: true, balance: doc?.balance ?? 0 });
});

// POST /api/store/promotions/credits/:storeId/apply
// Body: { orderTotal: number, orderRef?: string }
export const applyCredit = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { orderTotal, orderRef } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (typeof orderTotal !== "number" || orderTotal < 0) {
    throw new AppError("orderTotal must be a non-negative number", 400);
  }

  const doc = await StoreCredit.findOne({ store: new Types.ObjectId(storeId) });
  if (!doc) {
    return res.json({ success: true, newBalance: 0, applied: 0 });
  }

  const applied = Math.min(doc.balance, orderTotal);
  if (applied <= 0) {
    return res.json({ success: true, newBalance: doc.balance, applied: 0 });
  }

  doc.balance = parseFloat((doc.balance - applied).toFixed(2));
  doc.transactions.push({
    type: "applied",
    amount: -applied,
    ref: orderRef || undefined,
    note: `Applied to order (total: $${orderTotal})`,
    createdAt: new Date(),
  });

  await doc.save();
  res.json({ success: true, newBalance: doc.balance, applied });
});

// POST /api/store/promotions/credits/:storeId/add  (admin use)
// Body: { amount: number, note?: string }
export const addCredit = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const { amount, note, addedBy } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (typeof amount !== "number" || amount === 0) {
    throw new AppError("amount must be a non-zero number", 400);
  }

  let doc = await StoreCredit.findOne({ store: new Types.ObjectId(storeId) });
  if (!doc) {
    doc = new StoreCredit({ store: new Types.ObjectId(storeId), balance: 0, transactions: [] });
  }

  doc.balance = parseFloat((doc.balance + amount).toFixed(2));
  doc.transactions.push({
    type: "manual",
    amount,
    note: note || "Manual credit added",
    addedBy: addedBy || undefined,
    createdAt: new Date(),
  });

  await doc.save();
  res.json({ success: true, newBalance: doc.balance });
});
