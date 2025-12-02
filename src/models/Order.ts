import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type OrderStatus =
  | "submitted"
  | "accepted"
  | "manifested"
  | "shipped"
  | "cancelled";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  unitLabel?: string;
  unitPrice: number;
  discountPrice?: number;
  qty: number;
  lineTotal: number;
  appliedDiscount?: boolean; // 🆕 add this
}

export interface IPayment {
  method?: "cash" | "card" | "bank" | "stripe";
  amount: number;
  collected?: boolean;
  collectedBy?: Types.ObjectId;
  collectedAt?: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: number;
  store: Types.ObjectId;
  rep: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  payment?: IPayment;
  status: OrderStatus;
  note?: string;
  deliveryDate?: string; // ISO date format: YYYY-MM-DD
  dueDate?: string; // ISO date format: YYYY-MM-DD
  discountType?: "flat" | "percent";
  discountValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMAS
// ─────────────────────────────

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unitLabel: String,
    unitPrice: { type: Number, required: true },
    discountPrice: Number,
    qty: { type: Number, required: true },
    lineTotal: { type: Number, required: true },

    // 🆕 NEW FIELD
    appliedDiscount: { type: Boolean, default: false }, // true = discount manually applied
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    method: {
      type: String,
      enum: ["cash", "card", "bank", "stripe"],
      default: "cash",
    },
    amount: { type: Number, required: true },
    collected: { type: Boolean, default: false },
    collectedBy: { type: Schema.Types.ObjectId, ref: "Rep" },
    collectedAt: Date,
    note: String,
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: Number, unique: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    rep: { type: Schema.Types.ObjectId, ref: "Rep", required: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    payment: PaymentSchema,
    status: {
      type: String,
      enum: [
        "submitted",
        "accepted",
        "manifested",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "submitted",
    },
    note: String,
    deliveryDate: String, // ISO date format: YYYY-MM-DD
    dueDate: String, // ISO date format: YYYY-MM-DD
    discountType: { type: String, enum: ["flat", "percent"], default: "flat" },
    discountValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OrderSchema.index({ store: 1, status: 1, createdAt: -1 });

// ─────────────────────────────
// AUTO-INCREMENT LOGIC
// ─────────────────────────────

// Separate collection to track the last used order number
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model("Counter", CounterSchema);

OrderSchema.pre<IOrder>("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "orderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = counter.seq;
  }
  next();
});

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const Order = model<IOrder>("Order", OrderSchema);
