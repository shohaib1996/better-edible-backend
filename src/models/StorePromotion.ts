import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStorePromotion extends Document {
  storeId: Types.ObjectId;
  promotionId?: Types.ObjectId;
  type: "company" | "custom";
  // Custom-only fields
  name?: string;
  productId?: Types.ObjectId;
  productName?: string;
  creditRatePerUnit?: number;
  startDate?: Date;
  endDate?: Date;
  // Shared fields
  status: "active" | "pending_sales_log" | "sales_logged" | "completed" | "cancelled";
  unitsSold: number;
  creditsEarned: number;
  salesLogEmailSentAt?: Date;
  salesLoggedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorePromotionSchema = new Schema<IStorePromotion>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion" },
    type: { type: String, enum: ["company", "custom"], required: true },
    // Custom-only
    name: { type: String },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String },
    creditRatePerUnit: { type: Number, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    // Shared
    status: {
      type: String,
      enum: ["active", "pending_sales_log", "sales_logged", "completed", "cancelled"],
      default: "active",
    },
    unitsSold: { type: Number, default: 0 },
    creditsEarned: { type: Number, default: 0 },
    salesLogEmailSentAt: { type: Date },
    salesLoggedAt: { type: Date },
  },
  { timestamps: true }
);

StorePromotionSchema.index({ storeId: 1, status: 1 });
StorePromotionSchema.index({ storeId: 1, promotionId: 1 });
StorePromotionSchema.index({ endDate: 1, status: 1 });

export default mongoose.model<IStorePromotion>("StorePromotion", StorePromotionSchema);
