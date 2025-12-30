import { Request, Response } from "express";
import mongoose from "mongoose";
import { PrivateLabel } from "../models/PrivateLabel";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import {
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";

// ─────────────────────────────
// Create Private Label Order
// ─────────────────────────────

export const createPrivateLabelOrder = async (req: Request, res: Response) => {
  try {
    const {
      repId,
      storeId,
      note,
      deliveryDate,
      discount = 0,
      discountType = "flat", // "flat" or "percentage"
    } = req.body;

    // ✅ Parse items from JSON string (sent via FormData)
    let items: any[] = [];
    try {
      items = typeof req.body.items === 'string'
        ? JSON.parse(req.body.items)
        : (req.body.items || []);
    } catch (parseError) {
      return res.status(400).json({
        message: "Invalid items format. Items must be a valid JSON array.",
      });
    }

    // ✅ Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    // ✅ Get all active products for validation and pricing
    const activeProducts = await PrivateLabelProduct.find({ isActive: true });
    const productMap = new Map(
      activeProducts.map((p) => [p.name, { unitPrice: p.unitPrice, _id: p._id }])
    );

    // ✅ Validate each item
    for (const item of items) {
      if (!item.privateLabelType || item.privateLabelType.trim() === "") {
        return res.status(400).json({
          message: "Product type is required for all items",
        });
      }

      if (!productMap.has(item.privateLabelType)) {
        return res.status(400).json({
          message: `Invalid or inactive product type "${item.privateLabelType}"`,
        });
      }

      if (!item.flavor || item.flavor.trim() === "") {
        return res.status(400).json({
          message: "Flavor is required for all items",
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0",
        });
      }
    }

    // ✅ Validate Rep
    const rep = await Rep.findById(repId);
    if (!rep) return res.status(404).json({ message: "Rep not found" });

    // ✅ Validate Store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    if (store.blocked)
      return res.status(400).json({ message: "Store is blocked" });

    // ✅ Handle label image uploads (grouped by item index)
    const files = (req as any).files as any[];
    const filesByItemIndex: Record<number, any[]> = {};

    // Group files by their field name pattern: labelImages_0, labelImages_1, etc.
    if (files && files.length > 0) {
      files.forEach((file) => {
        const match = file.fieldname.match(/^labelImages_(\d+)$/);
        if (match) {
          const itemIndex = parseInt(match[1], 10);
          if (!filesByItemIndex[itemIndex]) {
            filesByItemIndex[itemIndex] = [];
          }
          filesByItemIndex[itemIndex].push(file);
        }
      });
    }

    // ✅ Process items with pricing and their label images
    const processedItems = await Promise.all(
      items.map(async (item: any, index: number) => {
        // Get pricing from database
        const productData = productMap.get(item.privateLabelType);
        if (!productData) {
          throw new Error(`Product "${item.privateLabelType}" not found`);
        }

        const qty = Number(item.quantity);
        const unitPrice = productData.unitPrice;
        const lineTotal = Number((qty * unitPrice).toFixed(2));

        // Upload label images for this specific item
        let labelImages: any[] = [];
        const itemFiles = filesByItemIndex[index] || [];

        if (itemFiles.length > 0) {
          try {
            const uploadResults = await uploadMultipleToCloudinary(
              itemFiles,
              "private-labels"
            );

            labelImages = uploadResults.map((result) => ({
              url: result.url,
              secureUrl: result.secureUrl,
              publicId: result.publicId,
              format: result.format,
              bytes: result.bytes,
              originalFilename: result.originalFilename,
            }));

            cleanupTempFiles(itemFiles);
          } catch (uploadError: any) {
            cleanupTempFiles(itemFiles);
            throw new Error(
              `Failed to upload label images for item ${index}: ${uploadError.message}`
            );
          }
        }

        return {
          privateLabelType: item.privateLabelType,
          flavor: item.flavor.trim(),
          quantity: qty,
          unitPrice,
          lineTotal,
          labelImages,
        };
      })
    );

    // ✅ Validate discount type
    if (discountType && !["flat", "percentage"].includes(discountType)) {
      return res.status(400).json({
        message: 'Discount type must be either "flat" or "percentage"',
      });
    }

    // ✅ Calculate totals
    const subtotal = Number(
      processedItems
        .reduce((sum, item) => sum + item.lineTotal, 0)
        .toFixed(2)
    );

    const discountValue = Number(discount || 0);
    let discountAmount = 0;

    if (discountType === "percentage") {
      // Percentage discount: 0-100
      if (discountValue < 0 || discountValue > 100) {
        return res.status(400).json({
          message: "Percentage discount must be between 0 and 100",
        });
      }
      discountAmount = Number(((subtotal * discountValue) / 100).toFixed(2));
    } else {
      // Flat discount
      if (discountValue < 0) {
        return res.status(400).json({
          message: "Discount cannot be negative",
        });
      }
      discountAmount = discountValue;
    }

    const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

    // ✅ Create the private label order
    const privateLabelOrder = await PrivateLabel.create({
      store: store._id,
      rep: rep._id,
      items: processedItems,
      subtotal,
      discount: discountValue, // The input value (10 for 10% or $10)
      discountType, // "flat" or "percentage"
      discountAmount, // The calculated dollar amount
      total,
      note,
      deliveryDate,
      status: "submitted",
    });

    // Populate store and rep details
    await privateLabelOrder.populate("store", "name address city");
    await privateLabelOrder.populate("rep", "name email");

    res.status(201).json({
      message: "Private label order created successfully",
      order: privateLabelOrder,
    });
  } catch (error: any) {
    console.error("Error creating private label order:", error);
    res.status(500).json({
      message: "Error creating private label order",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Get All Private Label Orders
// ─────────────────────────────

export const getAllPrivateLabels = async (req: Request, res: Response) => {
  try {
    const {
      status,
      storeId,
      repId,
      repName,
      page = 1,
      limit = 20,
      search,
      startDate,
      endDate,
    } = req.query;

    const matchStage: any = {};

    if (status && typeof status === "string") {
      matchStage.status = { $in: status.split(",") };
    }
    if (storeId && mongoose.Types.ObjectId.isValid(String(storeId)))
      matchStage.store = new mongoose.Types.ObjectId(String(storeId));
    if (repId && mongoose.Types.ObjectId.isValid(String(repId)))
      matchStage.rep = new mongoose.Types.ObjectId(String(repId));

    if (startDate && endDate) {
      matchStage.deliveryDate = {
        $gte: String(startDate),
        $lte: String(endDate),
      };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "stores",
          localField: "store",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "reps",
          localField: "rep",
          foreignField: "_id",
          as: "rep",
        },
      },
      { $unwind: { path: "$rep", preserveNullAndEmptyArrays: true } },
    ];

    if (search && typeof search === "string" && search.trim()) {
      pipeline.push({
        $match: {
          "store.name": { $regex: search.trim(), $options: "i" },
        },
      });
    }

    if (repName && typeof repName === "string" && repName.trim()) {
      pipeline.push({
        $match: {
          "rep.name": { $regex: repName.trim(), $options: "i" },
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $project: {
          orderNumber: 1,
          status: 1,
          total: 1,
          subtotal: 1,
          discount: 1,
          note: 1,
          deliveryDate: 1,
          shippedDate: 1,
          createdAt: 1,
          items: 1, // Array of { privateLabelType, flavor, quantity, unitPrice, lineTotal, labelImages }
          store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
          rep: { _id: 1, name: 1, repType: 1 },
          isPrivateLabel: { $literal: true },
        },
      }
    );

    const [orders, totalResult] = await Promise.all([
      PrivateLabel.aggregate(pipeline),
      PrivateLabel.aggregate(countPipeline),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({ total, page: Number(page), limit: Number(limit), orders });
  } catch (error) {
    console.error("Error fetching private label orders:", error);
    res
      .status(500)
      .json({ message: "Error fetching private label orders", error });
  }
};

// ─────────────────────────────
// Get Single Private Label Order
// ─────────────────────────────

export const getPrivateLabelById = async (req: Request, res: Response) => {
  try {
    const order = await PrivateLabel.findById(req.params.id)
      .populate("rep", "name repType email")
      .populate("store", "name address city blocked");

    if (!order)
      return res.status(404).json({ message: "Private label order not found" });

    res.json(order);
  } catch (error) {
    console.error("Error fetching private label order:", error);
    res
      .status(500)
      .json({ message: "Error fetching private label order", error });
  }
};

// ─────────────────────────────
// Update Private Label Order
// ─────────────────────────────

export const updatePrivateLabel = async (req: Request, res: Response) => {
  try {
    const order = await PrivateLabel.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Private label order not found" });

    const { items, discount, discountType, note, deliveryDate } = req.body;

    // Update items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      // Get active products for validation
      const activeProducts = await PrivateLabelProduct.find({ isActive: true });
      const productMap = new Map(
        activeProducts.map((p) => [p.name, { unitPrice: p.unitPrice }])
      );

      // Validate and process new items
      for (const item of items) {
        if (!item.privateLabelType || item.privateLabelType.trim() === "") {
          return res.status(400).json({
            message: "Product type is required for all items",
          });
        }

        if (!productMap.has(item.privateLabelType)) {
          return res.status(400).json({
            message: `Invalid or inactive product type "${item.privateLabelType}"`,
          });
        }

        if (!item.flavor || item.flavor.trim() === "") {
          return res.status(400).json({
            message: "Flavor is required for all items",
          });
        }
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            message: "Quantity must be greater than 0",
          });
        }
      }

      // Process items with pricing
      const processedItems = items.map((item: any) => {
        const productData = productMap.get(item.privateLabelType);
        if (!productData) {
          throw new Error(`Product "${item.privateLabelType}" not found`);
        }

        const qty = Number(item.quantity);
        const unitPrice = productData.unitPrice;
        const lineTotal = Number((qty * unitPrice).toFixed(2));

        return {
          privateLabelType: item.privateLabelType,
          flavor: item.flavor.trim(),
          quantity: qty,
          unitPrice,
          lineTotal,
          labelImages: item.labelImages || [],
        };
      });

      order.items = processedItems;
      order.subtotal = Number(
        processedItems
          .reduce((sum, item) => sum + item.lineTotal, 0)
          .toFixed(2)
      );
    }

    // Update discount and discount type
    if (discount !== undefined) {
      order.discount = Number(discount);
    }

    if (discountType !== undefined) {
      if (!["flat", "percentage"].includes(discountType)) {
        return res.status(400).json({
          message: 'Discount type must be either "flat" or "percentage"',
        });
      }
      order.discountType = discountType;
    }

    // Recalculate total based on discount type
    const discountValue = order.discount || 0;
    let discountAmount = 0;

    if (order.discountType === "percentage") {
      if (discountValue < 0 || discountValue > 100) {
        return res.status(400).json({
          message: "Percentage discount must be between 0 and 100",
        });
      }
      discountAmount = Number(
        ((order.subtotal * discountValue) / 100).toFixed(2)
      );
    } else {
      if (discountValue < 0) {
        return res.status(400).json({
          message: "Discount cannot be negative",
        });
      }
      discountAmount = discountValue;
    }

    // Save the calculated discount amount
    order.discountAmount = discountAmount;
    order.total = Number(
      Math.max(0, order.subtotal - discountAmount).toFixed(2)
    );

    if (note !== undefined) order.note = note;
    if (deliveryDate !== undefined) order.deliveryDate = deliveryDate;

    await order.save();

    res.json({
      message: "Private label order updated successfully",
      order,
    });
  } catch (error: any) {
    console.error("Error updating private label order:", error);
    res.status(500).json({
      message: "Error updating private label order",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Change Private Label Status
// ─────────────────────────────

export const changePrivateLabelStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const order = await PrivateLabel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order)
      return res.status(404).json({ message: "Private label order not found" });

    res.json({ message: `Private label order moved to ${status}`, order });
  } catch (error) {
    console.error("Error changing private label status:", error);
    res
      .status(500)
      .json({ message: "Error changing private label status", error });
  }
};

// ─────────────────────────────
// Delete Private Label Order
// ─────────────────────────────

export const deletePrivateLabel = async (req: Request, res: Response) => {
  try {
    const order = await PrivateLabel.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Private label order not found" });

    // Delete images from Cloudinary (now in items)
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.labelImages && item.labelImages.length > 0) {
          for (const img of item.labelImages) {
            try {
              await deleteFromCloudinary(img.publicId);
            } catch (err) {
              console.error(`Failed to delete image ${img.publicId}:`, err);
            }
          }
        }
      }
    }

    await PrivateLabel.findByIdAndDelete(req.params.id);

    res.json({ message: "Private label order deleted successfully" });
  } catch (error) {
    console.error("Error deleting private label order:", error);
    res
      .status(500)
      .json({ message: "Error deleting private label order", error });
  }
};
