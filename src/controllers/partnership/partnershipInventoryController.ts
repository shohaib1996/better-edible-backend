import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PartnershipInventory from "../../models/PartnershipInventory";
import { Product } from "../../models/Product";
import { AppError } from "../../utils/AppError";

// GET /api/partnership/inventory?storeId=
// GET /api/admin/partnership/:storeId/inventory
export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = (req.params.storeId || req.query.storeId) as string;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId) };
    const [inventory, totalCount] = await Promise.all([
      PartnershipInventory.find(filter).sort({ productName: 1 }).skip(skip).limit(limit),
      PartnershipInventory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, inventory, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/:storeId/inventory
export const placeInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { productId, sku, wholesalePrice, unitsToAdd } = req.body;

    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const productName = (product as any).itemName || (product as any).name || productId;
    const normalizedSku = (sku as string).trim().toUpperCase();

    const inventory = await PartnershipInventory.findOneAndUpdate(
      {
        storeId: new Types.ObjectId(storeId),
        productId: new Types.ObjectId(productId),
      },
      {
        $inc: { unitsPlaced: unitsToAdd, unitsRemaining: unitsToAdd },
        $setOnInsert: {
          storeId: new Types.ObjectId(storeId),
          productId: new Types.ObjectId(productId),
          productName,
          sku: normalizedSku,
          wholesalePrice,
          unitsSold: 0,
        },
        $set: { wholesalePrice },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, inventory });
  } catch (err) {
    next(err);
  }
};
