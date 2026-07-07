import { Schema, model, Document, Types } from "mongoose";

export type ClaimStatus = "pending" | "approved" | "rejected";

interface IClaimItem {
  product?: Types.ObjectId;
  productName: string;
  unitsSold: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IStorePromoSalesClaim extends Document {
  promotion: Types.ObjectId;
  store: Types.ObjectId;
  items: IClaimItem[];
  totalSalesValue: number;
  creditEarned: number;
  status: ClaimStatus;
  reviewedAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimItemSchema = new Schema<IClaimItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    unitsSold: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const StorePromoSalesClaimSchema = new Schema<IStorePromoSalesClaim>(
  {
    promotion: { type: Schema.Types.ObjectId, ref: "StorePromotion", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    items: { type: [ClaimItemSchema], default: [] },
    totalSalesValue: { type: Number, required: true },
    creditEarned: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true }
);

export const StorePromoSalesClaim = model<IStorePromoSalesClaim>(
  "StorePromoSalesClaim",
  StorePromoSalesClaimSchema
);
