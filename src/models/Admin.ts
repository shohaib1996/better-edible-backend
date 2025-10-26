// src/models/Admin.ts
import { Schema, model, Document } from 'mongoose';

export interface IAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'manager';
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['superadmin', 'manager'],
      default: 'superadmin',
    },
  },
  { timestamps: true }
);

export const Admin = model<IAdmin>('Admin', AdminSchema);
