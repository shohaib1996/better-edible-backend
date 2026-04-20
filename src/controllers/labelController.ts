// src/controllers/labelController.ts
import mongoose from "mongoose";
import crypto from "crypto";
import { Label } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";
import { uploadMultipleToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

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
            changedBy: user
              ? { _id: user._id, name: user.name, email: user.email }
              : entry.changedBy,
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
export const getAllLabels = asyncHandler(async (req, res) => {
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
});

// GET LABEL BY ID
export const getLabelById = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id).populate({
    path: "client",
    populate: {
      path: "store",
      select: "name address city state zip",
    },
  });

  if (!label) throw new AppError("Label not found", 404);

  // Populate stageHistory.changedBy from Admin or Rep collections
  const [populatedLabel] = await populateStageHistory([label]);

  res.json(populatedLabel);
});

// GET APPROVED LABELS BY CLIENT (for order creation)
export const getApprovedLabelsByClient = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new AppError("Invalid client ID", 400);
  }

  const labels = await Label.find({
    client: new mongoose.Types.ObjectId(clientId),
    currentStage: "ready_for_production",
  }).select(
    "_id flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages"
  );

  // Add unit price based on product type (from database)
  const labelsWithPricing = await Promise.all(
    labels.map(async (label) => ({
      ...label.toObject(),
      unitPrice: await getUnitPriceByProductType(label.productType),
    }))
  );

  res.json(labelsWithPricing);
});

// CREATE LABEL
export const createLabel = asyncHandler(async (req, res) => {
  const {
    clientId,
    flavorName,
    productType,
    specialInstructions,
    cannabinoidMix,
    color,
    flavorComponents,
    colorComponents,
    userId,
    userType,
  } = req.body;

  // Validate client exists
  const client = await PrivateLabelClient.findById(clientId);
  if (!client) throw new AppError("Client not found", 404);

  // Validate flavor name
  if (!flavorName || flavorName.trim() === "") {
    throw new AppError("Flavor name is required", 400);
  }

  // Validate product type exists in database
  if (!productType || !(await isValidProductType(productType))) {
    throw new AppError("Invalid or inactive product type", 400);
  }

  // Normalize userType if provided
  const normalizedUserType = userType
    ? ((userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep")
    : undefined;

  // Parse formulation components (sent as JSON strings via FormData)
  let parsedFlavorComponents: any[] = [];
  let parsedColorComponents: any[] = [];
  try {
    if (flavorComponents) parsedFlavorComponents = JSON.parse(flavorComponents);
    if (colorComponents) parsedColorComponents = JSON.parse(colorComponents);
  } catch {
    throw new AppError("Invalid formulation data format", 400);
  }

  // Validate flavor components
  for (const comp of parsedFlavorComponents) {
    if (!comp.name || comp.name.trim() === "") {
      throw new AppError("Each flavor component must have a name", 400);
    }
    if (comp.percentage === undefined || comp.percentage === null) {
      throw new AppError("Each flavor component must have a percentage", 400);
    }
  }

  // Validate color components
  for (const comp of parsedColorComponents) {
    if (!comp.name || comp.name.trim() === "") {
      throw new AppError("Each color component must have a name", 400);
    }
    if (comp.percentage === undefined || comp.percentage === null) {
      throw new AppError("Each color component must have a percentage", 400);
    }
  }

  // Handle image uploads
  const files = (req as any).files as Express.Multer.File[];
  let labelImages: any[] = [];

  if (files && files.length > 0) {
    try {
      const uploadResults = await uploadMultipleToCloudinary(files, "private-labels");

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
      throw new AppError(`Failed to upload images: ${uploadError.message}`, 500);
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
    specialInstructions: specialInstructions?.trim() || "",
    cannabinoidMix: cannabinoidMix?.trim() || "",
    color: color?.trim() || "",
    flavorComponents: parsedFlavorComponents,
    colorComponents: parsedColorComponents,
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
});

// UPDATE LABEL (details and images)
export const updateLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const {
    flavorName,
    productType,
    specialInstructions,
    cannabinoidMix,
    color,
    flavorComponents,
    colorComponents,
    keepExistingImages,
  } = req.body;

  // Update flavor name
  if (flavorName !== undefined) {
    if (!flavorName.trim()) throw new AppError("Flavor name cannot be empty", 400);
    label.flavorName = flavorName.trim();
  }

  // Update product type
  if (productType !== undefined) {
    if (!(await isValidProductType(productType))) {
      throw new AppError("Invalid or inactive product type", 400);
    }
    label.productType = productType;
  }

  // Update special instructions
  if (specialInstructions !== undefined) {
    label.specialInstructions = specialInstructions.trim();
  }

  // Update cannabinoid mix
  if (cannabinoidMix !== undefined) {
    label.cannabinoidMix = cannabinoidMix.trim();
  }

  // Update color
  if (color !== undefined) {
    label.color = color.trim();
  }

  // Update flavor components
  if (flavorComponents !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(flavorComponents);
    } catch {
      throw new AppError("Invalid flavor components format", 400);
    }
    label.flavorComponents = parsed;
  }

  // Update color components
  if (colorComponents !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(colorComponents);
    } catch {
      throw new AppError("Invalid color components format", 400);
    }
    label.colorComponents = parsed;
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
  const imagesToDelete = updatedImages.filter((img: any) => !imagesToKeep.includes(img.publicId));

  for (const img of imagesToDelete) {
    try {
      await deleteFromCloudinary(img.publicId);
    } catch (err) {
      console.error(`Failed to delete image ${img.publicId}:`, err);
    }
  }

  updatedImages = updatedImages.filter((img: any) => imagesToKeep.includes(img.publicId));

  // Upload new images
  if (files && files.length > 0) {
    try {
      const uploadResults = await uploadMultipleToCloudinary(files, "private-labels");

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
      throw new AppError(`Failed to upload images: ${uploadError.message}`, 500);
    }
  }

  label.labelImages = updatedImages;
  await label.save();

  res.json({
    message: "Label updated successfully",
    label,
  });
});

// UPDATE LABEL STAGE (single label)
export const updateLabelStage = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const { stage, notes, userId, userType } = req.body;
  const previousStage = label.currentStage;

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

  if (!validStages.includes(stage)) throw new AppError("Invalid stage", 400);

  // Validate userType if provided
  const validUserTypes = ["admin", "rep"];
  const normalizedUserType = userType
    ? ((userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep")
    : undefined;

  if (userType && !validUserTypes.includes(userType.toLowerCase())) {
    throw new AppError("Invalid user type", 400);
  }

  await label.updateStage(stage, userId || undefined, normalizedUserType, notes);

  await label.populate({
    path: "client",
    populate: {
      path: "store",
      select: "name",
    },
  });

  // Send email if stage changed to awaiting_store_approval
  if (stage === "awaiting_store_approval" && previousStage !== "awaiting_store_approval") {
    // Get client with store and rep info for email
    const client = await PrivateLabelClient.findById(label.client)
      .populate("store", "name")
      .populate("assignedRep", "name email");

    if (client && client.contactEmail) {
      const store = client.store as any;
      const rep = client.assignedRep as any;
      const labelImage = label.labelImages?.[0];

      if (labelImage && rep) {
        // Generate approval token
        const approvalToken = label.generateApprovalToken();
        await label.save();

        // Build approval URL
        const frontendUrl = process.env.FRONTEND_URL || "https://www.better-edibles.com";
        const approvalLink = `${frontendUrl}/label-approval/${approvalToken}`;

        // Send email asynchronously (don't block response)
        import("../services/email").then(({ sendLabelApprovalRequestEmail }) => {
          sendLabelApprovalRequestEmail({
            storeEmail: client.contactEmail,
            storeName: store?.name || "Store Owner",
            flavorName: label.flavorName,
            productType: label.productType,
            labelImageUrl: labelImage.secureUrl || labelImage.url,
            repName: rep.name,
            repEmail: rep.email,
            approvalLink,
          });
        });
      }
    }
  }

  res.json({
    message: `Label stage updated to ${stage}`,
    label,
  });
});

// BULK UPDATE LABEL STAGES (all labels for a client)
// Labels are treated as a GROUP - update all at once
export const bulkUpdateLabelStages = asyncHandler(async (req, res) => {
  const { clientId, stage, notes, userId, userType } = req.body;

  if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
    throw new AppError("Valid client ID is required", 400);
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

  if (!validStages.includes(stage)) throw new AppError("Invalid stage", 400);

  // Validate userType if provided
  const validUserTypes = ["admin", "rep"];
  const normalizedUserType = userType
    ? ((userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep")
    : undefined;

  if (userType && !validUserTypes.includes(userType.toLowerCase())) {
    throw new AppError("Invalid user type", 400);
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

  // Send emails if stage changed to awaiting_store_approval
  if (stage === "awaiting_store_approval" && labels.length > 0) {
    const client = await PrivateLabelClient.findById(clientId)
      .populate("store", "name")
      .populate("assignedRep", "name email");

    if (client && client.contactEmail) {
      const store = client.store as any;
      const rep = client.assignedRep as any;

      if (rep) {
        const frontendUrl = process.env.FRONTEND_URL || "https://www.better-edibles.com";

        // Generate tokens and send emails for each label
        for (const label of labels) {
          const labelImage = label.labelImages?.[0];
          if (labelImage) {
            // Generate approval token
            const approvalToken = label.generateApprovalToken();
            await label.save();

            const approvalLink = `${frontendUrl}/label-approval/${approvalToken}`;

            // Send email asynchronously
            import("../services/email").then(({ sendLabelApprovalRequestEmail }) => {
              sendLabelApprovalRequestEmail({
                storeEmail: client.contactEmail,
                storeName: store?.name || "Store Owner",
                flavorName: label.flavorName,
                productType: label.productType,
                labelImageUrl: labelImage.secureUrl || labelImage.url,
                repName: rep.name,
                repEmail: rep.email,
                approvalLink,
              });
            });
          }
        }
      }
    }
  }

  res.json({
    message: `${labels.length} labels updated to stage: ${stage}`,
    updatedCount: labels.length,
  });
});

// DELETE LABEL
export const deleteLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  // Check if label is used in any orders
  const { ClientOrder } = await import("../models/ClientOrder");
  const ordersWithLabel = await ClientOrder.find({
    "items.label": label._id,
  });

  if (ordersWithLabel.length > 0) {
    throw new AppError("Cannot delete label that is used in orders", 400);
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
});

// PUBLIC: GET LABEL FOR APPROVAL (no auth required)
export const getLabelForApproval = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const label = await Label.findOne({
    approvalToken: hashedToken,
    approvalTokenExpiry: { $gt: new Date() },
  }).populate({
    path: "client",
    populate: {
      path: "store",
      select: "name",
    },
  });

  if (!label) throw new AppError("Invalid or expired approval link", 404);

  // Return label info for the approval page
  res.json({
    _id: label._id,
    flavorName: label.flavorName,
    productType: label.productType,
    currentStage: label.currentStage,
    labelImages: label.labelImages,
    storeName: (label.client as any)?.store?.name || "Unknown Store",
    isAlreadyApproved: label.currentStage !== "awaiting_store_approval",
  });
});

// PUBLIC: APPROVE LABEL (no auth required)
export const approveLabelPublic = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const label = await Label.findOne({
    approvalToken: hashedToken,
    approvalTokenExpiry: { $gt: new Date() },
  });

  if (!label) throw new AppError("Invalid or expired approval link", 404);

  // Check if already approved
  if (label.currentStage !== "awaiting_store_approval") {
    throw new AppError("Label has already been approved or is no longer awaiting approval", 400);
  }

  // Update stage to store_approved
  label.currentStage = "store_approved";
  label.stageHistory.push({
    stage: "store_approved",
    changedAt: new Date(),
    notes: "Approved by store owner via email link",
  });

  // Clear the approval token after use
  label.approvalToken = undefined;
  label.approvalTokenExpiry = undefined;

  await label.save();

  // Send email notification to rep (async, don't block response)
  const client = await PrivateLabelClient.findById(label.client)
    .populate("store", "name")
    .populate("assignedRep", "name email");

  if (client) {
    const store = client.store as any;
    const rep = client.assignedRep as any;
    const labelImage = label.labelImages?.[0];

    if (rep && rep.email) {
      import("../services/email").then(({ sendLabelApprovedByStoreEmail }) => {
        sendLabelApprovedByStoreEmail({
          repEmail: rep.email,
          repName: rep.name,
          storeName: store?.name || "Store",
          flavorName: label.flavorName,
          productType: label.productType,
          labelImageUrl: labelImage?.secureUrl || labelImage?.url,
        });
      });
    }
  }

  res.json({
    message: "Label approved successfully!",
    flavorName: label.flavorName,
    productType: label.productType,
  });
});
