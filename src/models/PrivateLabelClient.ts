// src/models/PrivateLabelClient.ts
import { Schema, model, Document, Types } from "mongoose";

// -------------------
// Interface
// -------------------
export interface IPrivateLabelClient extends Document {
  store: Types.ObjectId;
  status: "onboarding" | "active";
  contactEmail: string;
  assignedRep: Types.ObjectId;
  recurringSchedule: {
    enabled: boolean;
    interval?: "monthly" | "bimonthly" | "quarterly";
  };
  createdAt: Date;
  updatedAt: Date;
  isActive(): boolean;
  hasRecurringSchedule(): boolean;
}

// -------------------
// Schema
// -------------------
const PrivateLabelClientSchema = new Schema<IPrivateLabelClient>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["onboarding", "active"],
      default: "onboarding",
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    assignedRep: {
      type: Schema.Types.ObjectId,
      ref: "Rep",
      required: true,
    },
    recurringSchedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      interval: {
        type: String,
        enum: ["monthly", "bimonthly", "quarterly"],
      },
    },
  },
  { timestamps: true }
);

// -------------------
// Indexes
// -------------------
PrivateLabelClientSchema.index({ store: 1 });
PrivateLabelClientSchema.index({ status: 1 });
PrivateLabelClientSchema.index({ assignedRep: 1 });

// -------------------
// Methods
// -------------------
PrivateLabelClientSchema.methods.isActive = function () {
  return this.status === "active";
};

PrivateLabelClientSchema.methods.hasRecurringSchedule = function () {
  return this.recurringSchedule.enabled;
};

// -------------------
// Validation: interval required if enabled
// -------------------
PrivateLabelClientSchema.pre("save", function (next) {
  if (this.recurringSchedule.enabled && !this.recurringSchedule.interval) {
    return next(
      new Error("Interval is required when recurring schedule is enabled")
    );
  }
  next();
});

// -------------------
// Model Export
// -------------------
export const PrivateLabelClient = model<IPrivateLabelClient>(
  "PrivateLabelClient",
  PrivateLabelClientSchema
);
