// src/models/Label.ts
import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

// -------------------
// Types
// -------------------
export type LabelStage =
  | "design_in_progress"
  | "awaiting_store_approval"
  | "store_approved"
  | "submitted_to_olcc"
  | "olcc_approved"
  | "print_order_submitted"
  | "ready_for_production";

export const LABEL_STAGES: LabelStage[] = [
  "design_in_progress",
  "awaiting_store_approval",
  "store_approved",
  "submitted_to_olcc",
  "olcc_approved",
  "print_order_submitted",
  "ready_for_production",
];

// -------------------
// Sub-Interfaces
// -------------------
export interface ILabelImage {
  url: string;
  secureUrl: string;
  publicId: string;
  format?: string;
  bytes?: number;
  originalFilename?: string;
  uploadedAt: Date;
}

export interface IStageHistoryEntry {
  stage: LabelStage;
  changedBy?: Types.ObjectId;
  changedByType?: "Admin" | "Rep";
  changedAt: Date;
  notes?: string;
}

// -------------------
// Main Interface
// -------------------
export interface ILabel extends Document {
  client: Types.ObjectId;
  flavorName: string;
  productType: string; // Dynamic - fetched from PrivateLabelProduct collection
  specialInstructions?: string;
  currentStage: LabelStage;
  stageHistory: IStageHistoryEntry[];
  labelImages: ILabelImage[];
  approvalToken?: string;
  approvalTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  updateStage(
    newStage: LabelStage,
    userId?: Types.ObjectId,
    userType?: "Admin" | "Rep",
    notes?: string
  ): Promise<void>;
  isReadyForProduction(): boolean;
  generateApprovalToken(): string;
}

// -------------------
// Sub-Schemas
// -------------------
const LabelImageSchema = new Schema<ILabelImage>(
  {
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    format: String,
    bytes: Number,
    originalFilename: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StageHistorySchema = new Schema<IStageHistoryEntry>(
  {
    stage: {
      type: String,
      enum: LABEL_STAGES,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      refPath: "stageHistory.changedByType",
      required: false,
    },
    changedByType: {
      type: String,
      enum: ["Admin", "Rep"],
      required: false,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  },
  { _id: false }
);

// -------------------
// Main Schema
// -------------------
const LabelSchema = new Schema<ILabel>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "PrivateLabelClient",
      required: true,
    },
    flavorName: {
      type: String,
      required: true,
      trim: true,
    },
    productType: {
      type: String,
      required: true,
      trim: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    currentStage: {
      type: String,
      enum: LABEL_STAGES,
      default: "design_in_progress",
      required: true,
    },
    stageHistory: {
      type: [StageHistorySchema],
      default: [],
    },
    labelImages: {
      type: [LabelImageSchema],
      default: [],
    },
    approvalToken: {
      type: String,
      default: null,
    },
    approvalTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// -------------------
// Indexes
// -------------------
LabelSchema.index({ client: 1 });
LabelSchema.index({ currentStage: 1 });
LabelSchema.index({ productType: 1 });
LabelSchema.index({ client: 1, currentStage: 1 });

// -------------------
// Methods
// -------------------

// Update stage with history tracking
LabelSchema.methods.updateStage = async function (
  newStage: LabelStage,
  userId?: Types.ObjectId,
  userType?: "Admin" | "Rep",
  notes?: string
) {
  this.currentStage = newStage;
  this.stageHistory.push({
    stage: newStage,
    changedBy: userId || undefined,
    changedByType: userType || undefined,
    changedAt: new Date(),
    notes,
  });
  await this.save();

  // Auto-activate client when first label reaches ready_for_production
  if (newStage === "ready_for_production") {
    const PrivateLabelClient = model("PrivateLabelClient");
    const client = await PrivateLabelClient.findById(this.client);
    if (client && client.status === "onboarding") {
      client.status = "active";
      await client.save();
    }
  }
};

// Check if ready for production
LabelSchema.methods.isReadyForProduction = function () {
  return this.currentStage === "ready_for_production";
};

// Generate approval token (valid for 7 days)
LabelSchema.methods.generateApprovalToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.approvalToken = crypto.createHash("sha256").update(token).digest("hex");
  this.approvalTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return token; // Return unhashed token for the URL
};

// -------------------
// Pre-save Hook: Auto-add initial stage history on creation
// -------------------
LabelSchema.pre("save", function (next) {
  if (this.isNew && this.stageHistory.length === 0) {
    this.stageHistory.push({
      stage: this.currentStage,
      changedBy: this.client,
      changedAt: new Date(),
      notes: "Label created",
    });
  }
  next();
});

// -------------------
// Model Export
// -------------------
export const Label = model<ILabel>("Label", LabelSchema);
