// src/models/StorePayment.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IStorePayment extends Document {
  store: Types.ObjectId;
  type: 'purchase' | 'payment';
  amount: number;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StorePaymentSchema = new Schema<IStorePayment>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    type: { type: String, enum: ['purchase', 'payment'], required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: String,
  },
  { timestamps: true }
);

export const StorePayment = model<IStorePayment>('StorePayment', StorePaymentSchema);
