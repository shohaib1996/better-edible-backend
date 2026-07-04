import { Schema, model, Document, Types } from "mongoose";

interface IClaimItem {
  productName: string;
  unitsSold: number;
  unitPrice: number;
}

export interface IPartnerPromoClaim extends Document {
  promoId: Types.ObjectId;
  storeId: Types.ObjectId;
  items: IClaimItem[];
  totalSales: number;
  creditEarned: number;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
}

const ClaimItemSchema = new Schema<IClaimItem>(
  {
    productName: { type: String, required: true },
    unitsSold: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PartnerPromoClaimSchema = new Schema<IPartnerPromoClaim>(
  {
    promoId: { type: Schema.Types.ObjectId, ref: "PartnerPromotion", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    items: { type: [ClaimItemSchema], default: [] },
    totalSales: { type: Number, required: true, min: 0 },
    creditEarned: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote: String,
  },
  { timestamps: true }
);

// one claim per promo per store
PartnerPromoClaimSchema.index({ promoId: 1, storeId: 1 }, { unique: true });

export const PartnerPromoClaim = model<IPartnerPromoClaim>(
  "PartnerPromoClaim",
  PartnerPromoClaimSchema
);
