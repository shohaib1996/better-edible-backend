// src/models/DeliveryOrder.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IDeliveryOrder extends Document {
  repId: Types.ObjectId;
  date: string;
  order: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryOrderSchema = new Schema<IDeliveryOrder>(
  {
    repId: { type: Schema.Types.ObjectId, ref: "Rep", required: true },
    date: { type: String, required: true },
    order: [{ type: String }],
  },
  { timestamps: true }
);

DeliveryOrderSchema.index({ repId: 1, date: 1 }, { unique: true });

export const DeliveryOrder = model<IDeliveryOrder>(
  "DeliveryOrder",
  DeliveryOrderSchema
);
