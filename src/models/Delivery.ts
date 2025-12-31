// src/models/Delivery.ts
import { Schema, model, Document, Types } from "mongoose";

export type DeliveryDisposition =
  | "money_pickup"
  | "delivery"
  | "sample_drop"
  | "other";

export type PaymentAction =
  | "collect_payment"
  | "no_payment"
  | "may_not_collect";

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "completed"
  | "cancelled"
  | "in_transit";

export interface IDelivery extends Document {
  storeId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  sampleId?: Types.ObjectId;
  disposition: DeliveryDisposition;
  orderId?: Types.ObjectId;
  privateLabelOrderId?: Types.ObjectId;
  paymentAction: PaymentAction;
  amount: number;
  scheduledAt: Date;
  notes?: string;
  status: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Rep" },
    sampleId: { type: Schema.Types.ObjectId, ref: "Sample" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    privateLabelOrderId: { type: Schema.Types.ObjectId, ref: "PrivateLabel" },
    disposition: {
      type: String,
      enum: ["money_pickup", "delivery", "sample_drop", "other"],
      default: "delivery",
    },
    paymentAction: {
      type: String,
      enum: ["collect_payment", "no_payment", "may_not_collect"],
      default: "no_payment",
    },
    amount: { type: Number, required: true, default: 0 },
    scheduledAt: { type: Date, required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "completed", "cancelled", "in_transit"],
      default: "in_transit",
    },
  },
  { timestamps: true }
);

DeliverySchema.index({ assignedTo: 1, status: 1 });
DeliverySchema.index({ storeId: 1, status: 1 });

export const Delivery = model<IDelivery>("Delivery", DeliverySchema);
