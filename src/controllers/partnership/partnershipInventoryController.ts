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

    const inventory = await PartnershipInventory.find({
      storeId: new Types.ObjectId(storeId),
    }).sort({ productName: 1 });

    res.json({ success: true, inventory });
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
