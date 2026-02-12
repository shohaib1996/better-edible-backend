import mongoose, { Document, Schema } from "mongoose";

export interface ISample extends Document {
  store: mongoose.Schema.Types.ObjectId;
  rep: mongoose.Schema.Types.ObjectId;
  status:
    | "submitted"
    | "accepted"
    | "manifested"
    | "shipped"
    | "delivered"
    | "cancelled";
  description?: string;
  notes?: string;
  deliveryDate?: Date;
  shippedDate?: Date;
  createdBy?: {
    user: mongoose.Schema.Types.ObjectId;
    userType: "admin" | "rep";
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const SampleSchema: Schema = new Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    rep: { type: mongoose.Schema.Types.ObjectId, ref: "Rep", required: true },
    status: {
      type: String,
      enum: ["submitted", "accepted", "manifested", "shipped", "cancelled"],
      default: "submitted",
    },
    description: { type: String },
    notes: { type: String },
    deliveryDate: { type: Date },
    shippedDate: { type: Date },
    createdBy: {
      user: { type: mongoose.Schema.Types.ObjectId },
      userType: { type: String, enum: ["admin", "rep"] },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISample>("Sample", SampleSchema);
