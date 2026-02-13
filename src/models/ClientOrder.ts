// src/models/ClientOrder.ts
import mongoose, { Schema, model, Document, Types } from "mongoose";

// -------------------
// Types
// -------------------
export type ClientOrderStatus =
  | "waiting"
  | "stage_1"
  | "stage_2"
  | "stage_3"
  | "stage_4"
  | "ready_to_ship"
  | "shipped"
  | "cancelled";

export const CLIENT_ORDER_STATUSES: ClientOrderStatus[] = [
  "waiting",
  "stage_1",
  "stage_2",
  "stage_3",
  "stage_4",
  "ready_to_ship",
  "shipped",
  "cancelled",
];

// -------------------
// Sub-Interface
// -------------------
export interface IClientOrderItem {
  label: Types.ObjectId;
  flavorName: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// -------------------
// Main Interface
// -------------------
export interface IClientOrder extends Document {
  orderNumber: string;
  client: Types.ObjectId;
  assignedRep: Types.ObjectId;
  status: ClientOrderStatus;
  deliveryDate: Date;
  productionStartDate: Date;
  actualShipDate?: Date;
  items: IClientOrderItem[];
  subtotal: number;
  discount?: number;
  discountType?: "flat" | "percentage";
  discountAmount?: number;
  total: number;
  note?: string;
  isRecurring: boolean;
  parentOrder?: Types.ObjectId;
  shipASAP: boolean;
  trackingNumber?: string;
  createdBy?: {
    user: Types.ObjectId;
    userType: "admin" | "rep";
  };
  emailsSent: {
    orderCreatedNotification: boolean;
    productionStartedNotification: boolean;
    sevenDayReminder: boolean;
    readyToShipNotification: boolean;
    shippedNotification: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  canEdit(): boolean;
  isInProduction(): boolean;
  calculateProductionStart(): void;
}

// -------------------
// Sub-Schema
// -------------------
const ClientOrderItemSchema = new Schema<IClientOrderItem>(
  {
    label: {
      type: Schema.Types.ObjectId,
      ref: "Label",
      required: true,
    },
    flavorName: {
      type: String,
      required: true,
    },
    productType: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

// -------------------
// Main Schema
// -------------------
const ClientOrderSchema = new Schema<IClientOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "PrivateLabelClient",
      required: true,
    },
    assignedRep: {
      type: Schema.Types.ObjectId,
      ref: "Rep",
      required: true,
    },
    status: {
      type: String,
      enum: CLIENT_ORDER_STATUSES,
      default: "waiting",
      required: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    productionStartDate: {
      type: Date,
      required: true,
    },
    actualShipDate: Date,
    items: {
      type: [ClientOrderItemSchema],
      required: true,
      validate: {
        validator: function (items: IClientOrderItem[]) {
          return items.length > 0;
        },
        message: "At least one item is required",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    note: String,
    isRecurring: {
      type: Boolean,
      default: false,
    },
    parentOrder: {
      type: Schema.Types.ObjectId,
      ref: "ClientOrder",
    },
    shipASAP: {
      type: Boolean,
      default: false,
    },
    trackingNumber: {
      type: String,
      default: null,
    },
    createdBy: {
      user: { type: Schema.Types.ObjectId },
      userType: { type: String, enum: ["admin", "rep"] },
    },
    emailsSent: {
      orderCreatedNotification: {
        type: Boolean,
        default: false,
      },
      productionStartedNotification: {
        type: Boolean,
        default: false,
      },
      sevenDayReminder: {
        type: Boolean,
        default: false,
      },
      readyToShipNotification: {
        type: Boolean,
        default: false,
      },
      shippedNotification: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true },
);

// -------------------
// Indexes
// -------------------
ClientOrderSchema.index({ client: 1 });
ClientOrderSchema.index({ status: 1 });
ClientOrderSchema.index({ deliveryDate: 1 });
ClientOrderSchema.index({ productionStartDate: 1 });
ClientOrderSchema.index({ assignedRep: 1 });
ClientOrderSchema.index({ isRecurring: 1 });
ClientOrderSchema.index({ orderNumber: 1 });

// -------------------
// Pre-save Hook: Auto-generate order number using counters collection
// -------------------
ClientOrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const Counter = mongoose.connection.collection("counters");

    const result = await Counter.findOneAndUpdate(
      { _id: "clientOrderNumber" } as any,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );

    const seq = result?.seq || 1;
    this.orderNumber = `PL-${seq}`;
  }
  next();
});

// -------------------
// Methods
// -------------------

// Check if order can be edited (only in waiting status)
ClientOrderSchema.methods.canEdit = function () {
  return this.status === "waiting";
};

// Check if order is currently in production
ClientOrderSchema.methods.isInProduction = function () {
  return ["stage_1", "stage_2", "stage_3", "stage_4"].includes(this.status);
};

// Calculate production start date (2 weeks before delivery)
// If the calculated date is in the past, use today instead
ClientOrderSchema.methods.calculateProductionStart = function () {
  const delivery = new Date(this.deliveryDate);
  const production = new Date(delivery);
  production.setDate(production.getDate() - 14);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  this.productionStartDate = production < today ? today : production;
};

// -------------------
// Model Export
// -------------------
export const ClientOrder = model<IClientOrder>(
  "ClientOrder",
  ClientOrderSchema,
);
