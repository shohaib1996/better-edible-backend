// src/models/Label.ts
import { Schema, model, Document, Types } from "mongoose";

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

export type ProductType = "BIOMAX Gummies" | "Rosin Gummies";

// Fixed pricing per product type
export const PRODUCT_PRICES: Record<ProductType, number> = {
  "BIOMAX Gummies": 1.75,
  "Rosin Gummies": 2.5,
};

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
  changedBy: Types.ObjectId;
  changedAt: Date;
  notes?: string;
}

// -------------------
// Main Interface
// -------------------
export interface ILabel extends Document {
  client: Types.ObjectId;
  flavorName: string;
  productType: ProductType;
  currentStage: LabelStage;
  stageHistory: IStageHistoryEntry[];
  labelImages: ILabelImage[];
  createdAt: Date;
  updatedAt: Date;
  updateStage(
    newStage: LabelStage,
    userId: Types.ObjectId,
    notes?: string
  ): Promise<void>;
  isReadyForProduction(): boolean;
  getUnitPrice(): number;
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
      ref: "User",
      required: true,
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
      enum: ["BIOMAX Gummies", "Rosin Gummies"],
      required: true,
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
  userId: Types.ObjectId,
  notes?: string
) {
  this.currentStage = newStage;
  this.stageHistory.push({
    stage: newStage,
    changedBy: userId,
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

// Get unit price based on product type
LabelSchema.methods.getUnitPrice = function () {
  return PRODUCT_PRICES[this.productType as ProductType];
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

// -------------------
// Helper function for use in controllers
// -------------------
export const getUnitPriceByProductType = (productType: string): number => {
  return PRODUCT_PRICES[productType as ProductType] || 0;
};
