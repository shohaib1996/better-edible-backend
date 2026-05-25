import mongoose from "mongoose";
import { Label } from "../../models/Label";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

const VALID_STAGES = [
  "design_in_progress",
  "awaiting_store_approval",
  "store_approved",
  "submitted_to_olcc",
  "olcc_approved",
  "print_order_submitted",
  "ready_for_production",
];

function normalizeUserType(userType: string | undefined): "Admin" | "Rep" | undefined {
  if (!userType) return undefined;
  return (userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep";
}

async function sendApprovalEmails(
  labels: InstanceType<typeof Label>[],
  clientId: unknown,
  frontendUrl: string
) {
  const client = await PrivateLabelClient.findById(clientId)
    .populate("store", "name")
    .populate("assignedRep", "name email");

  if (!client?.contactEmail) return;

  const store = client.store as any;
  const rep = client.assignedRep as any;
  if (!rep) return;

  for (const label of labels) {
    const labelImage = label.labelImages?.[0];
    if (!labelImage) continue;

    const approvalToken = label.generateApprovalToken();
    await label.save();

    const approvalLink = `${frontendUrl}/label-approval/${approvalToken}`;

    import("../../services/email").then(({ sendLabelApprovalRequestEmail }) => {
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

// PATCH /api/labels/:id/stage
export const updateLabelStage = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const { stage, notes, userId, userType } = req.body;
  const previousStage = label.currentStage;

  if (!VALID_STAGES.includes(stage)) throw new AppError("Invalid stage", 400);

  if (userType && !["admin", "rep"].includes(userType.toLowerCase())) {
    throw new AppError("Invalid user type", 400);
  }

  const normalized = normalizeUserType(userType);
  await label.updateStage(stage, userId || undefined, normalized, notes);

  await label.populate({ path: "client", populate: { path: "store", select: "name" } });

  if (stage === "awaiting_store_approval" && previousStage !== "awaiting_store_approval") {
    const frontendUrl = process.env.FRONTEND_URL || "https://www.better-edibles.com";
    await sendApprovalEmails([label], label.client, frontendUrl);
  }

  res.json({ message: `Label stage updated to ${stage}`, label });
});

// PATCH /api/labels/bulk/stage
export const bulkUpdateLabelStages = asyncHandler(async (req, res) => {
  const { clientId, stage, notes, userId, userType } = req.body;

  if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
    throw new AppError("Valid client ID is required", 400);
  }

  if (!VALID_STAGES.includes(stage)) throw new AppError("Invalid stage", 400);

  if (userType && !["admin", "rep"].includes(userType.toLowerCase())) {
    throw new AppError("Invalid user type", 400);
  }

  const normalized = normalizeUserType(userType);

  const labels = await Label.find({
    client: new mongoose.Types.ObjectId(clientId),
    currentStage: { $ne: stage },
  });

  for (const label of labels) {
    await label.updateStage(stage, userId || undefined, normalized, notes);
  }

  if (stage === "awaiting_store_approval" && labels.length > 0) {
    const frontendUrl = process.env.FRONTEND_URL || "https://www.better-edibles.com";
    await sendApprovalEmails(labels, clientId, frontendUrl);
  }

  res.json({ message: `${labels.length} labels updated to stage: ${stage}`, updatedCount: labels.length });
});
