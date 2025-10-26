// src/models/Delivery.ts
import { Schema, model, Document, Types } from 'mongoose';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DeliveryDisposition = 'money_pickup' | 'delivery' | 'sample_drop' | 'other';
export type PaymentAction = 'collect_payment' | 'no_payment' | 'may_not_collect';

export interface IDelivery extends Document {
  order: Types.ObjectId;
  assignedTo?: Types.ObjectId; // Rep who delivers
  disposition: DeliveryDisposition;
  paymentAction: PaymentAction;
  scheduledAt?: Date;
  pickedAt?: Date;
  deliveredAt?: Date;
  status: DeliveryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Rep' },
    disposition: {
      type: String,
      enum: ['money_pickup', 'delivery', 'sample_drop', 'other'],
      default: 'delivery',
    },
    paymentAction: {
      type: String,
      enum: ['collect_payment', 'no_payment', 'may_not_collect'],
      default: 'no_payment',
    },
    scheduledAt: Date,
    pickedAt: Date,
    deliveredAt: Date,
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_transit', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    notes: String,
  },
  { timestamps: true }
);

DeliverySchema.index({ assignedTo: 1, status: 1 });

export const Delivery = model<IDelivery>('Delivery', DeliverySchema);
