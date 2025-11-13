
import { Schema, model, Document, Types } from 'mongoose';

export interface IFollowup extends Document {
  followupDate: Date;
  interestLevel: string;
  comments: string;
  store: Types.ObjectId;
  rep: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FollowupSchema = new Schema<IFollowup>(
  {
    followupDate: { type: Date, required: true },
    interestLevel: { type: String},
    comments: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    rep: { type: Schema.Types.ObjectId, ref: 'Rep', required: true },
  },
  { timestamps: true }
);

export const Followup = model<IFollowup>('Followup', FollowupSchema);
