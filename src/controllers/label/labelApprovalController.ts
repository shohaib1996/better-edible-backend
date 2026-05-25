import crypto from "crypto";
import { Label } from "../../models/Label";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// GET /api/labels/public/approve/:token
export const getLabelForApproval = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const label = await Label.findOne({
    approvalToken: hashedToken,
    approvalTokenExpiry: { $gt: new Date() },
  }).populate({ path: "client", populate: { path: "store", select: "name" } });

  if (!label) throw new AppError("Invalid or expired approval link", 404);

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

// POST /api/labels/public/approve/:token
export const approveLabelPublic = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const label = await Label.findOne({
    approvalToken: hashedToken,
    approvalTokenExpiry: { $gt: new Date() },
  });

  if (!label) throw new AppError("Invalid or expired approval link", 404);

  if (label.currentStage !== "awaiting_store_approval") {
    throw new AppError("Label has already been approved or is no longer awaiting approval", 400);
  }

  label.currentStage = "store_approved";
  label.stageHistory.push({
    stage: "store_approved",
    changedAt: new Date(),
    notes: "Approved by store owner via email link",
  });
  label.approvalToken = undefined;
  label.approvalTokenExpiry = undefined;
  await label.save();

  const client = await PrivateLabelClient.findById(label.client)
    .populate("store", "name")
    .populate("assignedRep", "name email");

  if (client) {
    const store = client.store as any;
    const rep = client.assignedRep as any;
    const labelImage = label.labelImages?.[0];

    if (rep?.email) {
      import("../../services/email").then(({ sendLabelApprovedByStoreEmail }) => {
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
