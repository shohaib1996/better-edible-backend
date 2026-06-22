import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPromotionCredit extends Document {
  storeId: Types.ObjectId;
  storePromotionId: Types.ObjectId;
  amount: number;
  description: string;
  type: "earned" | "applied";
  appliedToOrderId?: Types.ObjectId;
  appliedToPartnershipBillId?: Types.ObjectId;
  status: "available" | "applied";
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionCreditSchema = new Schema<IPromotionCredit>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storePromotionId: { type: Schema.Types.ObjectId, ref: "StorePromotion", required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["earned", "applied"], required: true },
    appliedToOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    appliedToPartnershipBillId: { type: Schema.Types.ObjectId, ref: "PartnershipBill" },
    status: { type: String, enum: ["available", "applied"], default: "available" },
    appliedAt: { type: Date },
  },
  { timestamps: true }
);

PromotionCreditSchema.index({ storeId: 1, status: 1 });
PromotionCreditSchema.index({ storeId: 1, type: 1 });
PromotionCreditSchema.index({ storePromotionId: 1 });

export default mongoose.model<IPromotionCredit>("PromotionCredit", PromotionCreditSchema);
