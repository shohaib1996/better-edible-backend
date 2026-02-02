// src/controllers/labelController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Label } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";
import {
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";

// Helper to get unit price by product type from database
async function getUnitPriceByProductType(productType: string): Promise<number> {
  const product = await PrivateLabelProduct.findOne({
    name: productType,
    isActive: true,
  });
  return product?.unitPrice || 0;
}

// Helper to validate product type exists in database
async function isValidProductType(productType: string): Promise<boolean> {
  const product = await PrivateLabelProduct.findOne({
    name: productType,
    isActive: true,
  });
  return !!product;
}

// Helper function to populate stageHistory.changedBy from Admin or Rep collections
async function populateStageHistory(labels: any[]) {
  const { Admin } = await import("../models/Admin");
  const { Rep } = await import("../models/Rep");

  return Promise.all(
    labels.map(async (label) => {
      const labelObj = label.toObject ? label.toObject() : label;

      const populatedHistory = await Promise.all(
        labelObj.stageHistory.map(async (entry: any) => {
          if (!entry.changedBy) {
            return entry;
          }

          let user = null;
          if (entry.changedByType === "Admin") {
            user = await Admin.findById(entry.changedBy).select("name email");
          } else if (entry.changedByType === "Rep") {
            user = await Rep.findById(entry.changedBy).select("name email");
          }

          return {
            ...entry,
            changedBy: user ? { _id: user._id, name: user.name, email: user.email } : entry.changedBy,
          };
        })
      );

      return {
        ...labelObj,
        stageHistory: populatedHistory,
      };
    })
  );
}

// GET ALL LABELS
export const getAllLabels = async (req: Request, res: Response) => {
  try {
    const { clientId, stage, productType, page = 1, limit = 50 } = req.query;

    const filter: any = {};

    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
      filter.client = new mongoose.Types.ObjectId(String(clientId));
    }

    if (stage && typeof stage === "string") {
      filter.currentStage = stage;
    }

    if (productType && typeof productType === "string") {
      filter.productType = productType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [labels, total] = await Promise.all([
      Label.find(filter)
        .populate({
          path: "client",
          populate: {
            path: "store",
            select: "name city state",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Label.countDocuments(filter),
    ]);

    // Populate stageHistory.changedBy from Admin or Rep collections
    const populatedLabels = await populateStageHistory(labels);

    res.json({
      total,
      labels: populatedLabels,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    console.error("Error fetching labels:", error);
    res.status(500).json({
      message: "Error fetching labels",
      error: error.message,
    });
  }
};

// GET LABEL BY ID
export const getLabelById = async (req: Request, res: Response) => {
  try {
    const label = await Label.findById(req.params.id)
      .populate({
        path: "client",
        populate: {
          path: "store",
          select: "name address city state zip",
        },
      });

    if (!label) {
      return res.status(404).json({ message: "Label not found" });
    }

    // Populate stageHistory.changedBy from Admin or Rep collections
    const [populatedLabel] = await populateStageHistory([label]);

    res.json(populatedLabel);
  } catch (error: any) {
    console.error("Error fetching label:", error);
    res.status(500).json({
      message: "Error fetching label",
      error: error.message,
    });
  }
};

// GET APPROVED LABELS BY CLIENT (for order creation)
export const getApprovedLabelsByClient = async (
  req: Request,
  res: Response
) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    const labels = await Label.find({
      client: new mongoose.Types.ObjectId(clientId),
      currentStage: "ready_for_production",
    }).select("_id flavorName productType labelImages");

    // Add unit price based on product type (from database)
    const labelsWithPricing = await Promise.all(
      labels.map(async (label) => ({
        ...label.toObject(),
        unitPrice: await getUnitPriceByProductType(label.productType),
      }))
    );

    res.json(labelsWithPricing);
  } catch (error: any) {
    console.error("Error fetching approved labels:", error);
    res.status(500).json({
      message: "Error fetching approved labels",
      error: error.message,
    });
  }
};

// CREATE LABEL
export const createLabel = async (req: Request, res: Response) => {
  try {
    const { clientId, flavorName, productType, userId, userType } = req.body;

    // Validate client exists
    const client = await PrivateLabelClient.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Validate flavor name
    if (!flavorName || flavorName.trim() === "") {
      return res.status(400).json({ message: "Flavor name is required" });
    }

    // Validate product type exists in database
    if (!productType || !(await isValidProductType(productType))) {
      return res.status(400).json({ message: "Invalid or inactive product type" });
    }

    // Normalize userType if provided
    const normalizedUserType = userType
      ? (userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep"
      : undefined;

    // Handle image uploads
    const files = (req as any).files as Express.Multer.File[];
    let labelImages: any[] = [];

    if (files && files.length > 0) {
      try {
        const uploadResults = await uploadMultipleToCloudinary(
          files,
          "private-labels"
        );

        labelImages = uploadResults.map((result) => ({
          url: result.url,
          secureUrl: result.secureUrl,
          publicId: result.publicId,
          format: result.format,
          bytes: result.bytes,
          originalFilename: result.originalFilename,
          uploadedAt: new Date(),
        }));

        cleanupTempFiles(files);
      } catch (uploadError: any) {
        cleanupTempFiles(files);
        throw new Error(`Failed to upload images: ${uploadError.message}`);
      }
    }

    // Create initial stage history with user info
    const initialStageHistory = {
      stage: "design_in_progress",
      changedBy: userId || undefined,
      changedByType: normalizedUserType || undefined,
      changedAt: new Date(),
      notes: "Label created",
    };

    // Create label (starts at design_in_progress)
    const label = await Label.create({
      client: clientId,
      flavorName: flavorName.trim(),
      productType,
      currentStage: "design_in_progress",
      labelImages,
      stageHistory: [initialStageHistory], // Set initial history to skip pre-save hook
    });

    await label.populate({
      path: "client",
      populate: {
        path: "store",
        select: "name",
      },
    });

    res.status(201).json({
      message: "Label created successfully",
      label,
    });
  } catch (error: any) {
    console.error("Error creating label:", error);
    res.status(500).json({
      message: "Error creating label",
      error: error.message,
    });
  }
};

// UPDATE LABEL (details and images)
export const updateLabel = async (req: Request, res: Response) => {
  try {
    const label = await Label.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: "Label not found" });
    }

    const { flavorName, productType, keepExistingImages } = req.body;

    // Update flavor name
    if (flavorName !== undefined) {
      if (!flavorName.trim()) {
        return res.status(400).json({ message: "Flavor name cannot be empty" });
      }
      label.flavorName = flavorName.trim();
    }

    // Update product type
    if (productType !== undefined) {
      if (!(await isValidProductType(productType))) {
        return res.status(400).json({ message: "Invalid or inactive product type" });
      }
      label.productType = productType;
    }

    // Handle image updates
    const files = (req as any).files as Express.Multer.File[];
    let updatedImages = [...label.labelImages];

    // Parse keepExistingImages (array of publicIds to keep)
    const imagesToKeep =
      typeof keepExistingImages === "string"
        ? JSON.parse(keepExistingImages)
        : keepExistingImages || [];

    // Remove images not in keepExistingImages from Cloudinary
    const imagesToDelete = updatedImages.filter(
      (img: any) => !imagesToKeep.includes(img.publicId)
    );

    for (const img of imagesToDelete) {
      try {
        await deleteFromCloudinary(img.publicId);
      } catch (err) {
        console.error(`Failed to delete image ${img.publicId}:`, err);
      }
    }

    updatedImages = updatedImages.filter((img: any) =>
      imagesToKeep.includes(img.publicId)
    );

    // Upload new images
    if (files && files.length > 0) {
      try {
        const uploadResults = await uploadMultipleToCloudinary(
          files,
          "private-labels"
        );

        const newImages = uploadResults.map((result) => ({
          url: result.url,
          secureUrl: result.secureUrl,
          publicId: result.publicId,
          format: result.format,
          bytes: result.bytes,
          originalFilename: result.originalFilename,
          uploadedAt: new Date(),
        }));

        updatedImages = [...updatedImages, ...newImages];
        cleanupTempFiles(files);
      } catch (uploadError: any) {
        cleanupTempFiles(files);
        throw new Error(`Failed to upload images: ${uploadError.message}`);
      }
    }

    label.labelImages = updatedImages;
    await label.save();

    res.json({
      message: "Label updated successfully",
      label,
    });
  } catch (error: any) {
    console.error("Error updating label:", error);
    res.status(500).json({
      message: "Error updating label",
      error: error.message,
    });
  }
};

// UPDATE LABEL STAGE (single label)
export const updateLabelStage = async (req: Request, res: Response) => {
  try {
    const label = await Label.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: "Label not found" });
    }

    const { stage, notes, userId, userType } = req.body;

    // Validate stage
    const validStages = [
      "design_in_progress",
      "awaiting_store_approval",
      "store_approved",
      "submitted_to_olcc",
      "olcc_approved",
      "print_order_submitted",
      "ready_for_production",
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    // Validate userType if provided
    const validUserTypes = ["admin", "rep"];
    const normalizedUserType = userType
      ? (userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep"
      : undefined;

    if (userType && !validUserTypes.includes(userType.toLowerCase())) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    await label.updateStage(stage, userId || undefined, normalizedUserType, notes);

    await label.populate({
      path: "client",
      populate: {
        path: "store",
        select: "name",
      },
    });

    res.json({
      message: `Label stage updated to ${stage}`,
      label,
    });
  } catch (error: any) {
    console.error("Error updating label stage:", error);
    res.status(500).json({
      message: "Error updating label stage",
      error: error.message,
    });
  }
};

// BULK UPDATE LABEL STAGES (all labels for a client)
// Labels are treated as a GROUP - update all at once
export const bulkUpdateLabelStages = async (req: Request, res: Response) => {
  try {
    const { clientId, stage, notes, userId, userType } = req.body;

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Valid client ID is required" });
    }

    // Validate stage
    const validStages = [
      "design_in_progress",
      "awaiting_store_approval",
      "store_approved",
      "submitted_to_olcc",
      "olcc_approved",
      "print_order_submitted",
      "ready_for_production",
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    // Validate userType if provided
    const validUserTypes = ["admin", "rep"];
    const normalizedUserType = userType
      ? (userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep"
      : undefined;

    if (userType && !validUserTypes.includes(userType.toLowerCase())) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    // Get all labels for this client that are not already at this stage
    const labels = await Label.find({
      client: new mongoose.Types.ObjectId(clientId),
      currentStage: { $ne: stage },
    });

    // Update each label
    for (const label of labels) {
      await label.updateStage(stage, userId || undefined, normalizedUserType, notes);
    }

    res.json({
      message: `${labels.length} labels updated to stage: ${stage}`,
      updatedCount: labels.length,
    });
  } catch (error: any) {
    console.error("Error bulk updating label stages:", error);
    res.status(500).json({
      message: "Error bulk updating label stages",
      error: error.message,
    });
  }
};

// DELETE LABEL
export const deleteLabel = async (req: Request, res: Response) => {
  try {
    const label = await Label.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: "Label not found" });
    }

    // Check if label is used in any orders
    const { ClientOrder } = await import("../models/ClientOrder");
    const ordersWithLabel = await ClientOrder.find({
      "items.label": label._id,
    });

    if (ordersWithLabel.length > 0) {
      return res.status(400).json({
        message: "Cannot delete label that is used in orders",
      });
    }

    // Delete images from Cloudinary
    for (const img of label.labelImages) {
      try {
        await deleteFromCloudinary(img.publicId);
      } catch (err) {
        console.error(`Failed to delete image ${img.publicId}:`, err);
      }
    }

    await Label.findByIdAndDelete(req.params.id);

    res.json({ message: "Label deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting label:", error);
    res.status(500).json({
      message: "Error deleting label",
      error: error.message,
    });
  }
};
