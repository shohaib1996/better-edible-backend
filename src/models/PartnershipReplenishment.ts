import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReplenishmentItem {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  unitsRequested: number;
  unitsDelivered?: number;
}

export interface IDriverCount {
  productId: Types.ObjectId;
  sku: string;
  actualCount: number;
}

export interface IPartnershipReplenishment extends Document {
  storeId: Types.ObjectId;
  status: "pending" | "in_transit" | "delivered" | "reconciled";
  items: IReplenishmentItem[];
  driverCounts: IDriverCount[];
  driverNotes?: string;
  requestedAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReplenishmentItemSchema = new Schema<IReplenishmentItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    unitsRequested: { type: Number, required: true },
    unitsDelivered: { type: Number },
  },
  { _id: false }
);

const DriverCountSchema = new Schema<IDriverCount>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    actualCount: { type: Number, required: true },
  },
  { _id: false }
);

const PartnershipReplenishmentSchema = new Schema<IPartnershipReplenishment>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "reconciled"],
      default: "pending",
    },
    items: [ReplenishmentItemSchema],
    driverCounts: { type: [DriverCountSchema], default: [] },
    driverNotes: { type: String },
    requestedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

PartnershipReplenishmentSchema.index({ storeId: 1, status: 1 });
PartnershipReplenishmentSchema.index({ storeId: 1, requestedAt: -1 });

export default mongoose.model<IPartnershipReplenishment>(
  "PartnershipReplenishment",
  PartnershipReplenishmentSchema
);
