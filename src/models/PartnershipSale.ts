import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPartnershipSale extends Document {
  storeId: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  date: Date;
  unitsSold: number;
  source: "pos_api";
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnershipSaleSchema = new Schema<IPartnershipSale>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    date: { type: Date, required: true },
    unitsSold: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ["pos_api"], default: "pos_api" },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PartnershipSaleSchema.index({ storeId: 1, productId: 1, date: 1 }, { unique: true });
PartnershipSaleSchema.index({ storeId: 1, date: -1 });

export default mongoose.model<IPartnershipSale>("PartnershipSale", PartnershipSaleSchema);
