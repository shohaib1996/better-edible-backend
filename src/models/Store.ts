// src/models/Store.ts
import { Schema, model, Document, Types } from 'mongoose';

// -------------------
// Contact Sub-Interface
// -------------------
interface IContact {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
}

// -------------------
// Main Store Interface
// -------------------
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

  // 💰 Balance fields
  totalPurchase: number;
  totalPaid: number;
  dueAmount: number;
  lastPaidAt?: Date;
  paymentStatus: 'green' | 'yellow' | 'red';

  createdAt: Date;
  updatedAt: Date;
}

// -------------------
// Contact Sub-Schema
// -------------------
const ContactSchema = new Schema<IContact>(
  {
    name: String,
    role: String,
    email: String,
    phone: String,
  },
  { _id: false }
);

// -------------------
// Store Schema
// -------------------
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

    // 💰 Balance Info
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    lastPaidAt: Date,

    // ✅ Payment Status stored in DB (not virtual)
    paymentStatus: {
      type: String,
      enum: ['green', 'yellow', 'red'],
      default: 'green',
    },
  },
  { timestamps: true }
);

// -------------------
// Hooks & Logic
// -------------------
StoreSchema.pre('save', function (next) {
  // 1️⃣ Calculate due amount
  this.dueAmount = this.totalPurchase - this.totalPaid;

  // 2️⃣ Auto-update paymentStatus based on lastPaidAt
  const now = new Date();
  if (!this.lastPaidAt) {
    this.paymentStatus = 'red';
  } else {
    const diffDays = (now.getTime() - this.lastPaidAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) this.paymentStatus = 'green';
    else if (diffDays <= 30) this.paymentStatus = 'yellow';
    else this.paymentStatus = 'red';
  }

  next();
});

// -------------------
// Indexes
// -------------------
StoreSchema.index({ name: 'text', 'contacts.name': 'text', 'contacts.email': 'text' });
StoreSchema.index({ territory: 1 });

// -------------------
// Model Export
// -------------------
export const Store = model<IStore>('Store', StoreSchema);
