import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPartnershipInventory extends Document {
  storeId: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  productName: string;
  wholesalePrice: number;
  unitsPlaced: number;
  unitsSold: number;
  unitsRemaining: number;
  lastReconciliationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnershipInventorySchema = new Schema<IPartnershipInventory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    wholesalePrice: { type: Number, required: true, min: 0 },
    unitsPlaced: { type: Number, default: 0 },
    unitsSold: { type: Number, default: 0 },
    unitsRemaining: { type: Number, default: 0 },
    lastReconciliationAt: { type: Date },
  },
  { timestamps: true }
);

PartnershipInventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });
PartnershipInventorySchema.index({ storeId: 1, sku: 1 }, { unique: true });

export default mongoose.model<IPartnershipInventory>(
  "PartnershipInventory",
  PartnershipInventorySchema
);
