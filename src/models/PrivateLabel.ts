import { Schema, model, models, Document, Types } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type PrivateLabelStatus =
  | "submitted"
  | "accepted"
  | "manifested"
  | "shipped"
  | "cancelled";

export type DiscountType = "flat" | "percentage";

export interface ILabelImage {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  originalFilename: string;
}

export interface IPrivateLabelItem {
  privateLabelType: string; // Product name (e.g., "BIOMAX", "Rosin", "Delta-8")
  flavor: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  labelImages: ILabelImage[]; // Each item has its own label images
}

export interface IPrivateLabel extends Document {
  orderNumber: number;
  store: Types.ObjectId;
  rep: Types.ObjectId;
  items: IPrivateLabelItem[]; // Array of items with different flavors/types
  subtotal: number;
  discount?: number; // The input value (e.g., 10 for 10% or $10)
  discountType?: DiscountType; // "flat" or "percentage"
  discountAmount?: number; // The actual calculated discount amount in dollars
  total: number;
  status: PrivateLabelStatus;
  note?: string;
  deliveryDate?: string; // ISO date format: YYYY-MM-DD
  shippedDate?: string; // ISO date format: YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMAS
// ─────────────────────────────

const LabelImageSchema = new Schema<ILabelImage>(
  {
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    format: { type: String, required: true },
    bytes: { type: Number, required: true },
    originalFilename: { type: String, required: true },
  },
  { _id: false }
);

const PrivateLabelItemSchema = new Schema<IPrivateLabelItem>(
  {
    privateLabelType: {
      type: String,
      required: true,
      trim: true,
    },
    flavor: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    labelImages: { type: [LabelImageSchema], default: [] },
  },
  { _id: false }
);

const PrivateLabelSchema = new Schema<IPrivateLabel>(
  {
    orderNumber: { type: Number, unique: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    rep: { type: Schema.Types.ObjectId, ref: "Rep", required: true },
    items: { type: [PrivateLabelItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["submitted", "accepted", "manifested", "shipped", "cancelled"],
      default: "submitted",
    },
    note: String,
    deliveryDate: String, // ISO date format: YYYY-MM-DD
    shippedDate: String, // ISO date format: YYYY-MM-DD
  },
  { timestamps: true }
);

PrivateLabelSchema.index({ store: 1, status: 1, createdAt: -1 });

// ─────────────────────────────
// AUTO-INCREMENT LOGIC
// ─────────────────────────────

interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model("Counter", CounterSchema);

PrivateLabelSchema.pre<IPrivateLabel>("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "privateLabelOrderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = counter!.seq;
  }
  next();
});

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const PrivateLabel = model<IPrivateLabel>(
  "PrivateLabel",
  PrivateLabelSchema
);
