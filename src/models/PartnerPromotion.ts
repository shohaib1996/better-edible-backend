import { Schema, model, Document } from "mongoose";

export interface IPartnerPromotion extends Document {
  title: string;
  description?: string;
  discountPercent: number;
  startDate: Date;
  endDate: Date;
  allProducts: boolean;
  isOpen: boolean;
}

const PartnerPromotionSchema = new Schema<IPartnerPromotion>(
  {
    title: { type: String, required: true },
    description: String,
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allProducts: { type: Boolean, default: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PartnerPromotion = model<IPartnerPromotion>(
  "PartnerPromotion",
  PartnerPromotionSchema
);
