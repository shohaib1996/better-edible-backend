import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPromotion extends Document {
  name: string;
  description: string;
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  creditRatePerUnit: number;
  startDate: Date;
  endDate: Date;
  status: "draft" | "active" | "expired";
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    creditRatePerUnit: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "expired"],
      default: "draft",
    },
    isPublic: { type: Boolean, default: false },
    createdBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

PromotionSchema.index({ status: 1, isPublic: 1 });
PromotionSchema.index({ endDate: 1 });

export default mongoose.model<IPromotion>("Promotion", PromotionSchema);
