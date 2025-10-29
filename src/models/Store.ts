// src/models/Store.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IContact {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface IStore extends Document {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  territory?: string;
  rep?: Types.ObjectId;
  contacts?: IContact[];
  blocked: boolean;
  terms?: string;
  group?: string;
  notesCount: number;
  lastOrderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Contact sub-schema
const ContactSchema = new Schema<IContact>(
  {
    name: String,
    role: String,
    email: String,
    phone: String,
  },
  { _id: false }
);

// Store schema
const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    zip: String,
    territory: String,
    rep: { type: Schema.Types.ObjectId, ref: 'Rep', required: false },
    contacts: [ContactSchema],
    blocked: { type: Boolean, default: false },
    terms: String,
    group: String,
    notesCount: { type: Number, default: 0 },
    lastOrderAt: Date,
  },
  { timestamps: true }
);

// helpful indexes
StoreSchema.index({ name: 'text', 'contacts.name': 'text', 'contacts.email': 'text' });
StoreSchema.index({ territory: 1 });

// ✅ Correct: use IStore as the type parameter
export const Store = model<IStore>('Store', StoreSchema);
