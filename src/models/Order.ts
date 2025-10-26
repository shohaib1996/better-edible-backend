// src/models/Order.ts
import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'manifested'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  unitLabel?: string;
  unitPrice: number;
  discountPrice?: number;
  qty: number;
  lineTotal: number;
}

export interface IPayment {
  method?: string; // e.g. cash, card
  amount?: number;
  collected?: boolean;
  collectedBy?: Types.ObjectId;
  collectedAt?: Date;
}

export interface IOrder extends Document {
  store: Types.ObjectId;
  rep: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  payment?: IPayment;
  status: OrderStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unitLabel: String,
    unitPrice: { type: Number, required: true },
    discountPrice: Number,
    qty: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    method: String,
    amount: Number,
    collected: { type: Boolean, default: false },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'Rep' },
    collectedAt: Date,
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    rep: { type: Schema.Types.ObjectId, ref: 'Rep', required: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: Number,
    total: Number,
    payment: PaymentSchema,
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'accepted',
        'manifested',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'draft',
    },
    note: String,
  },
  { timestamps: true }
);

OrderSchema.index({ store: 1, status: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', OrderSchema);
