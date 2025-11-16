import { Schema, model, Document, Types } from 'mongoose';

export interface IFollowup extends Document {
  followupDate: string;  // <-- CHANGED
  interestLevel: string;
  comments: string;
  store: Types.ObjectId;
  rep: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FollowupSchema = new Schema<IFollowup>(
  {
    followupDate: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: (prop: any) => `${prop.value} is not a valid YYYY-MM-DD date`
      }
    },
    interestLevel: { type: String },
    comments: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    rep: { type: Schema.Types.ObjectId, ref: 'Rep', required: true },
  },
  { timestamps: true }
);

export const Followup = model<IFollowup>('Followup', FollowupSchema);
