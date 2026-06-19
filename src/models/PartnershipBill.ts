import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBillLineItem {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  unitsSold: number;
  wholesalePrice: number;
  lineTotal: number;
}

export interface IBillCredit {
  amount: number;
  reason: string;
  appliedAt: Date;
}

export interface IPartnershipBill extends Document {
  storeId: Types.ObjectId;
  billingYear: number;
  billingMonth: number;
  lineItems: IBillLineItem[];
  subtotal: number;
  credits: IBillCredit[];
  creditsTotal: number;
  total: number;
  status: "draft" | "sent" | "paid";
  generatedAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillLineItemSchema = new Schema<IBillLineItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    unitsSold: { type: Number, required: true },
    wholesalePrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const BillCreditSchema = new Schema<IBillCredit>(
  {
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    appliedAt: { type: Date, required: true },
  },
  { _id: false }
);

const PartnershipBillSchema = new Schema<IPartnershipBill>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    billingYear: { type: Number, required: true },
    billingMonth: { type: Number, required: true, min: 1, max: 12 },
    lineItems: [BillLineItemSchema],
    subtotal: { type: Number, required: true },
    credits: { type: [BillCreditSchema], default: [] },
    creditsTotal: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid"],
      default: "draft",
    },
    generatedAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

PartnershipBillSchema.index({ storeId: 1, billingYear: 1, billingMonth: 1 }, { unique: true });
PartnershipBillSchema.index({ storeId: 1, status: 1 });

export default mongoose.model<IPartnershipBill>("PartnershipBill", PartnershipBillSchema);
