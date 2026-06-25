import { Schema, model, Document, Types } from "mongoose";

export interface IPromotionUsage extends Document {
  promotionId: Types.ObjectId;
  storeId: Types.ObjectId;
  orderId?: Types.ObjectId;
  discountAmount: number;
  appliedAt: Date;
  appliedBy: "store" | "admin";
}

const PromotionUsageSchema = new Schema<IPromotionUsage>(
  {
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "ClientOrder" },
    discountAmount: { type: Number, required: true, min: 0 },
    appliedAt: { type: Date, default: Date.now },
    appliedBy: { type: String, enum: ["store", "admin"], required: true },
  },
  { timestamps: false }
);

PromotionUsageSchema.index({ promotionId: 1, storeId: 1 });
PromotionUsageSchema.index({ storeId: 1, appliedAt: -1 });

export default model<IPromotionUsage>("PromotionUsage", PromotionUsageSchema);
