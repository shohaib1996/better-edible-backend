
import { Schema, model, Document, Types } from 'mongoose';

export interface IContact extends Document {
  name: string;
  role: string;
  email: string;
  phone: string;
  importantToKnow: string;
  store: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    role: { type: String },
    email: { type: String },
    phone: { type: String },
    importantToKnow: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store' },
  },
  { timestamps: true }
);

export const Contact = model<IContact>('Contact', ContactSchema);
