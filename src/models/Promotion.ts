import { Schema, model, Document, Types } from "mongoose";

export interface IPromotion extends Document {
  name: string;
  code?: string;
  description?: string;
  type: "flat" | "percentage";
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  maxUsesPerStore?: number;
  storeIds: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  status: "active" | "inactive";
  isPublic: boolean;
  autoApply: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["flat", "percentage"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    maxUsesPerStore: { type: Number, min: 1 },
    storeIds: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isPublic: { type: Boolean, default: false },
    autoApply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<IPromotion>("Promotion", PromotionSchema);
