import { Schema, model, Document, Types } from "mongoose";

export interface IStorePromotion extends Document {
  title: string;
  description?: string;
  discountPercent: number;
  startDate: Date;
  endDate: Date;
  allProducts: boolean;
  isOpen: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StorePromotionSchema = new Schema<IStorePromotion>(
  {
    title: { type: String, required: true },
    description: { type: String },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allProducts: { type: Boolean, default: true },
    isOpen: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export const StorePromotion = model<IStorePromotion>("StorePromotion", StorePromotionSchema);
