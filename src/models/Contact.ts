import { Schema, model, Document, Types } from "mongoose";

export interface IContact extends Document {
  name: string;
  role: string;
  email: string;
  phone: string;
  importantToKnow: string;
  store: Types.ObjectId;
  // Store portal auth fields
  passwordHash?: string;
  status: "active" | "inactive";
  magicLinkToken?: string;
  magicLinkExpiry?: Date;
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
    store: { type: Schema.Types.ObjectId, ref: "Store" },
    passwordHash: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    magicLinkToken: { type: String },
    magicLinkExpiry: { type: Date },
  },
  { timestamps: true }
);

export const Contact = model<IContact>("Contact", ContactSchema);
