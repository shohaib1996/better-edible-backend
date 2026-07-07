import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { Chain } from "../models/Chain";
import { Store } from "../models/Store";
import { Order } from "../models/Order";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

function fmt(chain: any) {
  return {
    id: chain._id,
    name: chain.name,
    logo: chain.logo ?? null,
    notes: chain.notes ?? null,
    buyingMode: chain.buyingMode,
    chainRep: chain.chainRep ?? null,
    buyerName: chain.buyerName ?? null,
    buyerEmail: chain.buyerEmail ?? null,
    buyerPhone: chain.buyerPhone ?? null,
    billingContact: chain.billingContact ?? null,
    loginEmail: chain.loginEmail ?? null,
    hasLogin: !!chain.loginEmail,
    active: chain.active,
    memberCount: chain.stores?.length ?? 0,
    storeIds: (chain.stores ?? []).map((s: any) => s.toString()),
    createdAt: chain.createdAt,
    updatedAt: chain.updatedAt,
  };
}

// GET /api/chains
export const getAllChains = asyncHandler(async (_req, res) => {
  const chains = await Chain.find().sort({ createdAt: -1 });
  res.json({ success: true, chains: chains.map(fmt), total: chains.length });
});

// GET /api/chains/:id
export const getChainById = asyncHandler(async (req, res) => {
  const chain = await Chain.findById(req.params.id);
  if (!chain) throw new AppError("Chain not found", 404);
  res.json({ success: true, chain: fmt(chain) });
});

// GET /api/chains/:id/rollup  — stats + member store details
export const getChainRollup = asyncHandler(async (req, res) => {
  const chain = await Chain.findById(req.params.id);
  if (!chain) throw new AppError("Chain not found", 404);

  const storeObjectIds = (chain.stores ?? []).map((s) => new Types.ObjectId(s.toString()));

  const [stores, orderAgg] = await Promise.all([
    Store.find({ _id: { $in: storeObjectIds } })
      .select("_id storeId name city address totalPurchase dueAmount lastOrderAt")
      .lean(),
    storeObjectIds.length
      ? Order.aggregate([
          { $match: { store: { $in: storeObjectIds } } },
          {
            $group: {
              _id: "$store",
              orderCount: { $sum: 1 },
              lastOrderAt: { $max: "$createdAt" },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const orderMap = new Map(orderAgg.map((o: any) => [o._id.toString(), o]));

  const storeRows = stores.map((s: any) => {
    const agg = orderMap.get(s._id.toString());
    return {
      id: s._id,
      storeId: s.storeId ?? null,
      name: s.name,
      city: s.city ?? null,
      orderCount: agg?.orderCount ?? 0,
      lastOrderAt: agg?.lastOrderAt ?? s.lastOrderAt ?? null,
      totalPurchase: s.totalPurchase ?? 0,
      dueAmount: s.dueAmount ?? 0,
    };
  });

  const totalOrders = storeRows.reduce((sum, s) => sum + s.orderCount, 0);
  const totalPurchase = storeRows.reduce((sum, s) => sum + s.totalPurchase, 0);
  const totalDue = storeRows.reduce((sum, s) => sum + s.dueAmount, 0);

  res.json({
    success: true,
    chainId: chain._id,
    chainName: chain.name,
    storeCount: storeRows.length,
    totalOrders,
    totalPurchase,
    totalDue,
    stores: storeRows,
  });
});

// PUT /api/chains/:id/stores  — replace member store list
export const updateChainStores = asyncHandler(async (req, res) => {
  const { storeIds } = req.body as { storeIds: string[] };
  const chain = await Chain.findById(req.params.id);
  if (!chain) throw new AppError("Chain not found", 404);

  chain.stores = (storeIds ?? []).map((id) => new Types.ObjectId(id)) as any;
  await chain.save();

  res.json({ success: true, chain: fmt(chain) });
});

// PUT /api/chains/:id/credentials  — set or clear VIP login
export const updateChainCredentials = asyncHandler(async (req, res) => {
  const chain = await Chain.findById(req.params.id);
  if (!chain) throw new AppError("Chain not found", 404);

  const { clear, loginEmail, password } = req.body;

  if (clear) {
    chain.loginEmail = undefined;
    chain.loginPasswordHash = undefined;
    await chain.save();
    return res.json({ success: true, message: "Chain login cleared", hasLogin: false });
  }

  if (!loginEmail) throw new AppError("loginEmail is required", 400);

  chain.loginEmail = loginEmail.trim().toLowerCase();

  // Only update hash when a new password is provided
  if (password) {
    chain.loginPasswordHash = await bcrypt.hash(password, 10);
  } else if (!chain.loginPasswordHash) {
    throw new AppError("password is required for a new login", 400);
  }

  await chain.save();
  res.json({
    success: true,
    message: "Chain credentials updated",
    loginEmail: chain.loginEmail,
    hasLogin: true,
  });
});

// POST /api/chains
export const createChain = asyncHandler(async (req, res) => {
  const { name, buyingMode, notes, buyerName, buyerEmail, buyerPhone, billingContact } = req.body;
  const chain = await Chain.create({
    name,
    buyingMode,
    notes,
    buyerName,
    buyerEmail,
    buyerPhone,
    billingContact,
  });
  res.status(201).json({ success: true, chain: fmt(chain) });
});

// PUT /api/chains/:id
export const updateChain = asyncHandler(async (req, res) => {
  const chain = await Chain.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!chain) throw new AppError("Chain not found", 404);
  res.json({ success: true, chain: fmt(chain) });
});

// PUT /api/chains/assign-store  — move a store in/out of a chain
export const assignStoreToChain = asyncHandler(async (req, res) => {
  const { storeId, chainId } = req.body as { storeId: string; chainId?: string };
  if (!storeId) throw new AppError("storeId is required", 400);

  const storeObjectId = new Types.ObjectId(storeId);

  // Remove from any chain that currently holds this store
  await Chain.updateMany({ stores: storeObjectId }, { $pull: { stores: storeObjectId } });

  if (chainId) {
    const chain = await Chain.findById(chainId);
    if (!chain) throw new AppError("Chain not found", 404);
    chain.stores.push(storeObjectId as any);
    await chain.save();
  }

  res.json({ success: true, message: chainId ? "Store assigned to chain" : "Store removed from chain" });
});

// DELETE /api/chains/:id
export const deleteChain = asyncHandler(async (req, res) => {
  const chain = await Chain.findByIdAndDelete(req.params.id);
  if (!chain) throw new AppError("Chain not found", 404);
  res.json({ success: true, message: "Chain deleted" });
});
