import { Schema, model, Document, Types } from "mongoose";

export interface IChain extends Document {
  name: string;
  buyingMode: "central" | "hybrid" | "independent";
  logo?: string;
  notes?: string;
  chainRep?: Types.ObjectId;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  billingContact?: string;
  loginEmail?: string;
  loginPasswordHash?: string;
  active: boolean;
  stores: Types.ObjectId[];
}

const ChainSchema = new Schema<IChain>(
  {
    name: { type: String, required: true, trim: true },
    buyingMode: {
      type: String,
      enum: ["central", "hybrid", "independent"],
      default: "independent",
    },
    logo: String,
    notes: String,
    chainRep: { type: Schema.Types.ObjectId, ref: "Rep" },
    buyerName: String,
    buyerEmail: String,
    buyerPhone: String,
    billingContact: String,
    loginEmail: String,
    loginPasswordHash: String,
    active: { type: Boolean, default: true },
    stores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
  },
  { timestamps: true }
);

export const Chain = model<IChain>("Chain", ChainSchema);
