import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILabelOrder extends Document {
  orderNumber: string;
  storeId: Types.ObjectId;
  storeName: string;
  labelId: Types.ObjectId;
  labelName: string;
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  status: "on_order" | "received";
  notes?: string;
  orderedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LabelOrderSchema = new Schema<ILabelOrder>(
  {
    orderNumber: { type: String, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String, required: true },
    labelId: { type: Schema.Types.ObjectId, ref: "Label", required: true },
    labelName: { type: String, required: true },
    itemId: { type: String, required: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["on_order", "received"],
      default: "on_order",
    },
    notes: { type: String },
    orderedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LabelOrderSchema.index({ storeId: 1 });
LabelOrderSchema.index({ labelId: 1 });
LabelOrderSchema.index({ status: 1 });
LabelOrderSchema.index({ createdAt: -1 });

// Auto-generate orderNumber: LO-001, LO-002, ...
LabelOrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const Counter = mongoose.connection.collection("counters");

    const result = await Counter.findOneAndUpdate(
      { _id: "labelOrderNumber" } as any,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    const seq = result?.seq || 1;
    this.orderNumber = `LO-${String(seq).padStart(3, "0")}`;
  }
  next();
});

export default mongoose.model<ILabelOrder>("LabelOrder", LabelOrderSchema);
