// src/models/Rep.ts
import { Schema, model, Document, Types } from 'mongoose';

export type RepType = 'rep' | 'delivery' | 'both';
export type RepStatus = 'active' | 'inactive' | 'suspended';

export interface IRep extends Document {
  name: string;
  loginName: string;
  passwordHash: string;
  email?: string;
  phone?: string;
  // repClass?: string;
  repType: RepType;
  territory?: string;
  assignedStores: Types.ObjectId[];
  checkin: boolean;
  status: RepStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RepSchema = new Schema<IRep>(
  {
    name: { type: String, required: true },
    loginName: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    email: { type: String, sparse: true },
    phone: String,
    // repClass: String,
    repType: {
      type: String,
      enum: ['rep', 'delivery', 'both'],
      default: 'rep',
    },
    territory: { type: String, trim: true }, // 👈 changed
    assignedStores: [{ type: Schema.Types.ObjectId, ref: 'Store' }],
    checkin: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Rep = model<IRep>('Rep', RepSchema);
