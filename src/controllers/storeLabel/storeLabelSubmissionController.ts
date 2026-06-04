import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Label, LABEL_STAGES } from "../../models/Label";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { joinPool } from "./storeLabelHelpers";

// GET /api/store/submissions
export const getStoreSubmissions = asyncHandler(async (req, res) => {
  const { clientId } = req.query;

  const filter: any = {
    labelStatus: "submitted",
    $or: [{ source: "store" }, { source: { $exists: false } }, { source: null }],
  };

  if (clientId && Types.ObjectId.isValid(clientId as string)) {
    filter.client = new Types.ObjectId(clientId as string);
  }

  const labels = await Label.find(filter)
    .populate({
      path: "client",
      populate: [
        { path: "store", select: "name city state" },
        { path: "assignedRep", select: "name email" },
      ],
    })
    .sort({ submittedAt: -1 });

  const map: Record<string, any> = {};

  for (const label of labels) {
    const client = label.client as any;
    const store = client?.store;
    const rep = client?.assignedRep;
    const storeId = String(store?._id ?? client?._id ?? "unknown");
    const storeName = store?.name ?? "Unknown Store";

    if (!map[storeId]) {
      map[storeId] = {
        storeId,
        storeName,
        clientId: String(client?._id),
        city: store?.city ?? "",
        state: store?.state ?? "",
        logo: client?.logo ?? null,
        rep: rep ? { name: rep.name ?? "", email: rep.email ?? "" } : null,
        labels: [],
        totalValue: 0,
        earliestSubmission: label.submittedAt,
      };
    }

    map[storeId].labels.push(label);
    map[storeId].totalValue = parseFloat(
      (map[storeId].totalValue + (label.totalCost ?? 0)).toFixed(2)
    );

    if (label.submittedAt && label.submittedAt < map[storeId].earliestSubmission) {
      map[storeId].earliestSubmission = label.submittedAt;
    }
  }

  res.status(200).json({ success: true, submissions: Object.values(map) });
});

// POST /api/store/labels/submit
export const submitLine = asyncHandler(async (req, res) => {
  const { storeId, storeName, logoUrl, logoStatus, productionChoices } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (!productionChoices || !Array.isArray(productionChoices)) {
    throw new AppError("productionChoices array is required", 400);
  }

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId) });
  if (!client) throw new AppError("No private label client found for this store", 404);

  if (logoStatus === "uploaded" && logoUrl) {
    client.logo = { url: logoUrl, status: "uploaded" };
    await client.save();
  } else if (logoStatus === "pending_email") {
    client.logo = { url: (client.logo as any)?.url || undefined, status: "pending_email" };
    await client.save();
  }

  const draftLabels = await Label.find({ client: client._id, labelStatus: "draft" });
  if (draftLabels.length === 0) throw new AppError("No draft labels found to submit", 400);

  const choicesMap: Record<string, string> = {};
  for (const c of productionChoices) {
    choicesMap[c.labelId] = c.productionMode;
  }

  const updatedLabels = [];

  for (const label of draftLabels) {
    const mode = choicesMap[String(label._id)] || "standard";

    label.labelStatus = "submitted";
    label.submittedAt = new Date();
    label.productionMode = mode as "standard" | "pool" | "custom_run";
    label.currentStage = "design_in_progress";

    await label.save();

    if (mode === "pool" && label.isRatio && label.cannabinoids?.length) {
      await joinPool(
        label._id as Types.ObjectId,
        client._id as Types.ObjectId,
        client.store as Types.ObjectId,
        storeName || "",
        label.unitsOrdered || 630,
        label.cannabinoids.map((c) => ({ name: c.name, mg: c.mg }))
      );
    }

    updatedLabels.push(label);
  }

  res.status(200).json({ success: true, submittedLabels: updatedLabels });
});

// PATCH /api/store/submissions/:labelId/stage
export const advanceLabelStage = asyncHandler(async (req, res) => {
  const { labelId } = req.params;
  const { stage } = req.body;

  if (!stage || !LABEL_STAGES.includes(stage)) {
    throw new AppError(`Invalid stage. Valid values: ${LABEL_STAGES.join(", ")}`, 400);
  }

  const label = await Label.findById(labelId);
  if (!label) throw new AppError("Label not found", 404);
  if (label.labelStatus !== "submitted") throw new AppError("Only submitted labels can be staged", 400);

  await label.updateStage(stage);

  res.status(200).json({ success: true, label });
});
