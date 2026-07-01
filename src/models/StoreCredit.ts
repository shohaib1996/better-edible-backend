import { Schema, model, Document, Types } from "mongoose";

interface ICreditTransaction {
  type: "earned" | "applied" | "manual";
  amount: number;
  ref?: string;
  note?: string;
  createdAt: Date;
}

export interface IStoreCredit extends Document {
  store: Types.ObjectId;
  balance: number;
  transactions: ICreditTransaction[];
  updatedAt: Date;
}

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    type: { type: String, enum: ["earned", "applied", "manual"], required: true },
    amount: { type: Number, required: true },
    ref: String,
    note: String,
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const StoreCreditSchema = new Schema<IStoreCredit>(
  {
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true, unique: true },
    balance: { type: Number, default: 0 },
    transactions: { type: [CreditTransactionSchema], default: [] },
  },
  { timestamps: true }
);

export const StoreCredit = model<IStoreCredit>("StoreCredit", StoreCreditSchema);
