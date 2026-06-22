import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPromotionSale extends Document {
  storeId: Types.ObjectId;
  storePromotionId: Types.ObjectId;
  promotionId?: Types.ObjectId;
  productId: Types.ObjectId;
  date: Date;
  unitsSold: number;
  source: "manual" | "pos_api";
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSaleSchema = new Schema<IPromotionSale>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storePromotionId: { type: Schema.Types.ObjectId, ref: "StorePromotion", required: true },
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    date: { type: Date, required: true },
    unitsSold: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ["manual", "pos_api"], required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PromotionSaleSchema.index({ storeId: 1, storePromotionId: 1, date: 1 }, { unique: true });
PromotionSaleSchema.index({ storeId: 1, date: -1 });

export default mongoose.model<IPromotionSale>("PromotionSale", PromotionSaleSchema);
