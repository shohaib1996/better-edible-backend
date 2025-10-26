// src/models/TimeLog.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ITimeLog extends Document {
  rep: Types.ObjectId;
  checkinTime: Date;
  checkoutTime: Date | null;
}

const TimeLogSchema = new Schema<ITimeLog>(
  {
    rep: { type: Schema.Types.ObjectId, ref: 'Rep', required: true },
    checkinTime: { type: Date, required: true },
    checkoutTime: { type: Date, default: null },
  },
  { timestamps: true }
);

export const TimeLog = model<ITimeLog>('TimeLog', TimeLogSchema);
