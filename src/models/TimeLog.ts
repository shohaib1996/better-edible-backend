// src/models/TimeLog.ts
import { Schema, model, Document, Types } from "mongoose";

export type TimeLogSource = "door" | "web" | "mobile";

export interface ITimeLog extends Document {
  rep: Types.ObjectId;
  checkinTime: Date;
  checkoutTime: Date | null;
  source: TimeLogSource; // where the clock event originated
}

const TimeLogSchema = new Schema<ITimeLog>(
  {
    rep: { type: Schema.Types.ObjectId, ref: "Rep", required: true },
    checkinTime: { type: Date, required: true },
    checkoutTime: { type: Date, default: null },
    source: {
      type: String,
      enum: ["door", "web", "mobile"],
      default: "web",
    },
  },
  { timestamps: true }
);

export const TimeLog = model<ITimeLog>("TimeLog", TimeLogSchema);
