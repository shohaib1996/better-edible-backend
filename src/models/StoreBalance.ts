// src/models/StoreBalance.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IStoreBalance extends Document {
  store: Types.ObjectId;
  totalPurchase: number;
  totalPaid: number;
  lastPaidAt?: Date;
  dueAmount: number; // derived = totalPurchase - totalPaid
  statusColor: 'green' | 'yellow' | 'red'; // UI indicator
  updatedAt: Date;
}

const StoreBalanceSchema = new Schema<IStoreBalance>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    lastPaidAt: Date,
    dueAmount: { type: Number, default: 0 },
    statusColor: { type: String, enum: ['green', 'yellow', 'red'], default: 'green' },
  },
  { timestamps: true }
);

// Auto-calculate due and color before saving
StoreBalanceSchema.pre('save', function (next) {
  this.dueAmount = this.totalPurchase - this.totalPaid;

  const now = new Date();
  if (!this.lastPaidAt) this.statusColor = 'red';
  else {
    const diffDays = (now.getTime() - this.lastPaidAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) this.statusColor = 'green';
    else if (diffDays <= 30) this.statusColor = 'yellow';
    else this.statusColor = 'red';
  }

  next();
});

export const StoreBalance = model<IStoreBalance>('StoreBalance', StoreBalanceSchema);
